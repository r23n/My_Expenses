import { clearLocalData, emptyPending, loadBudgets, loadExpenses, loadLegacyBudget, loadPending, loadRecurring, saveBudgets, saveExpenses, savePending, saveRecurring } from './storage.js';
import { formatMonth, formatToday, formatWeekRange, getWeekRange, todayKey, updateCalendar, updateCategories, updateChart, updateComparison, updateRecurringList, updateReports, updateSummary, updateTransactions, updateUpcoming } from './ui.js';
import { applyTranslations, checkTranslations, getEnglishDisplayName, getLanguage, saveEnglishDisplayName, saveLanguage, t } from './i18n.js';

// القيم هذي تنحفظ بالعربي في قاعدة البيانات، فلا نغيرها حتى لو الواجهة إنجليزي
const STANDARD_CATEGORIES = ['طعام', 'مشروبات', 'مواصلات', 'تسوق', 'فواتير', 'ترفيه', 'أخرى'];
const CUSTOM_CATEGORY = 'مخصص';
const UNDO_SECONDS = 5;
const PULL_WAIT_MS = 15000;

let expenses = loadExpenses();
let budgets = loadBudgets();
let recurring = loadRecurring();
let pending = loadPending();
let selectedMonth = todayKey(new Date()).slice(0, 7);
let selectedWeekOffset = 0;
let editingId = null;
let cloudApi = { cloudEnabled: false };
let currentSession = null;
let authMode = 'signin';
let cloudStatusKey = 'localOnly';
let cloudStatusExtra = '';
let pendingUndo = null;
let lastPullTime = 0;
let pulling = false;

// ---------- أدوات صغيرة ----------

function setKey(selector, key) {
  // نغير مفتاح الترجمة على العنصر نفسه، فلو تغيرت اللغة بعدين تترجمه applyTranslations صح
  const element = document.querySelector(selector);
  element.dataset.i18n = key;
  element.textContent = t(key);
}

function setCloudStatus(key, extra = '') {
  // نحفظ المفتاح بدل النص عشان نقدر نعيد ترجمته لو تغيرت اللغة
  cloudStatusKey = key;
  cloudStatusExtra = extra;
  document.querySelector('#cloudStatus').textContent = extra ? `${t(key)} ${extra}` : t(key);
}

function setAppLocked(locked) {
  document.body.classList.toggle('app-locked', locked);
  document.querySelector('#authGate').hidden = !locked;
}

function closeMobileMenu() {
  document.querySelector('.sidebar').classList.remove('menu-open');
  document.querySelector('#mobileMenuBackdrop').hidden = true;
}

function openMobileMenu() {
  document.querySelector('.sidebar').classList.add('menu-open');
  document.querySelector('#mobileMenuBackdrop').hidden = false;
}

function addMonths(month, count) {
  const parts = month.split('-');
  const date = new Date(Number(parts[0]), Number(parts[1]) - 1 + count, 1);
  return todayKey(date).slice(0, 7);
}

// ---------- الميزانية لكل شهر ----------

function budgetFor(month) {
  if (budgets[month] !== undefined) return budgets[month];
  const months = Object.keys(budgets).sort();
  if (!months.length) return 0;
  // الشهر اللي ما له ميزانية ياخذ ميزانية آخر شهر قبله، عشان ما تحتاج تعيد كتابتها كل شهر
  const earlier = months.filter(item => item < month);
  if (earlier.length) return budgets[earlier[earlier.length - 1]];
  return budgets[months[0]];
}

function moveLegacyBudget(legacyBudget) {
  // الميزانية القديمة كانت رقم واحد لكل الشهور، فنعتبرها ميزانية الشهر الحالي وما قبله
  if (Object.keys(budgets).length || !(legacyBudget > 0)) return false;
  budgets[todayKey(new Date()).slice(0, 7)] = legacyBudget;
  saveBudgets(budgets);
  return true;
}

// ---------- المصاريف المتكررة ----------

function recurringExpenseId(ruleId, month) {
  // نبني رقم المصروف من رقم التكرار + الشهر، فلو الجوال والكمبيوتر أضافوه بنفس الوقت يطلع نفس الرقم وما يتكرر
  const parts = month.split('-');
  const monthNumber = Number(parts[0]) * 12 + Number(parts[1]);
  return ruleId.slice(0, 24) + monthNumber.toString(16).padStart(12, '0');
}

function dateInMonth(month, day) {
  const parts = month.split('-');
  // لو اليوم 31 والشهر ما فيه 31 يوم، ناخذ آخر يوم في الشهر
  const lastDay = new Date(Number(parts[0]), Number(parts[1]), 0).getDate();
  return `${month}-${String(Math.min(day, lastDay)).padStart(2, '0')}`;
}

function addDueRecurring() {
  const today = todayKey(new Date());
  const thisMonth = today.slice(0, 7);
  let changed = false;
  recurring.forEach(rule => {
    let month = addMonths(rule.lastMonth, 1);
    while (month <= thisMonth) {
      const date = dateInMonth(month, rule.day);
      if (date > today) break;
      const id = recurringExpenseId(rule.id, month);
      if (!expenses.some(item => item.id === id)) {
        expenses.push({ id: id, amount: rule.amount, category: rule.category, description: rule.description, date: date, createdAt: Date.now() });
        markExpenseChanged(id);
      }
      rule.lastMonth = month;
      changed = true;
      month = addMonths(month, 1);
    }
  });
  if (changed) {
    saveExpenses(expenses);
    saveRecurring(recurring);
    markProfileChanged();
    pushChanges();
  }
  return changed;
}

function stopRecurring(ruleId) {
  // نوقف التكرار بس، والمصاريف اللي انضافت قبل تبقى زي ما هي
  recurring = recurring.filter(rule => rule.id !== ruleId);
  saveRecurring(recurring);
  markProfileChanged();
  pushChanges();
  updateRecurringList(recurring);
}

// ---------- قائمة التعديلات اللي تنتظر الرفع ----------

function markExpenseChanged(id) {
  if (!pending.upserts.includes(id)) pending.upserts.push(id);
  pending.deletes = pending.deletes.filter(item => item !== id);
  savePending(pending);
}

function markExpenseDeleted(id) {
  pending.upserts = pending.upserts.filter(item => item !== id);
  if (!pending.deletes.includes(id)) pending.deletes.push(id);
  savePending(pending);
}

function markProfileChanged() {
  pending.profile = true;
  savePending(pending);
}

function hasPendingChanges() {
  return pending.upserts.length > 0 || pending.deletes.length > 0 || pending.profile;
}

async function pushChanges() {
  if (!currentSession || !cloudApi.cloudEnabled) return false;
  if (!hasPendingChanges()) return true;
  if (!navigator.onLine) {
    setCloudStatus('offlineSaved');
    return false;
  }
  // ناخذ نسخة من القائمة قبل الرفع، فلو انضاف تعديل جديد أثناء الرفع ما ينمسح بالغلط
  const upsertIds = [...pending.upserts];
  const deleteIds = [...pending.deletes];
  const profileChanged = pending.profile;
  const userId = currentSession.user.id;
  try {
    const changedExpenses = expenses.filter(item => upsertIds.includes(item.id));
    await cloudApi.upsertCloudExpenses(userId, changedExpenses);
    await cloudApi.deleteCloudExpenses(userId, deleteIds);
    if (profileChanged) await cloudApi.saveCloudProfile(userId, budgets, recurring, getEnglishDisplayName());
    pending.upserts = pending.upserts.filter(id => !upsertIds.includes(id));
    pending.deletes = pending.deletes.filter(id => !deleteIds.includes(id));
    if (profileChanged) pending.profile = false;
    savePending(pending);
    setCloudStatus('syncedAs', currentSession.user.email);
    return true;
  } catch (error) {
    console.error(error);
    setCloudStatus(navigator.onLine ? 'cloudFailed' : 'offlineSaved');
    return false;
  }
}

async function pullFromCloud(firstTime = false) {
  if (!currentSession || !cloudApi.cloudEnabled || !navigator.onLine || pulling) return;
  pulling = true;
  try {
    // نرفع تعديلاتنا أول، وإلا السحب من السحابة يمسح أي شي ما وصلها
    const pushed = await pushChanges();
    if (!pushed) return;
    const cloudData = await cloudApi.loadCloudData(currentSession.user.id);
    const cloudIsEmpty = !cloudData.expenses.length && !Object.keys(cloudData.budgets).length && !cloudData.recurring.length && !(cloudData.legacyBudget > 0);
    const deviceHasData = expenses.length > 0 || Object.keys(budgets).length > 0;
    if (cloudIsEmpty && firstTime && deviceHasData) {
      // حساب جديد على السحابة وعندك بيانات قديمة على الجهاز، فنرفعها بدل ما نمسحها
      expenses.forEach(item => markExpenseChanged(item.id));
      markProfileChanged();
    } else {
      expenses = cloudData.expenses;
      budgets = cloudData.budgets;
      recurring = cloudData.recurring;
      saveExpenses(expenses);
      saveBudgets(budgets);
      saveRecurring(recurring);
      if (moveLegacyBudget(cloudData.legacyBudget)) markProfileChanged();
      saveEnglishDisplayName(cloudData.displayName);
      updateGreeting();
    }
    addDueRecurring();
    await pushChanges();
    lastPullTime = Date.now();
    setCloudStatus('syncedAs', currentSession.user.email);
    render();
  } catch (error) {
    console.error(error);
    setCloudStatus('cloudFailed');
  } finally {
    pulling = false;
  }
}

// ---------- البيانات المعروضة ----------

function monthExpenses(month) {
  return expenses.filter(item => item.date.startsWith(month));
}

function getVisibleExpenses() {
  // في الأسبوع الحالي نعرض الشهر كامل، ولما يرجع لأسبوع سابق نعرض أيام ذاك الأسبوع بس
  if (selectedWeekOffset === 0) return monthExpenses(selectedMonth);
  const weekRange = getWeekRange(new Date(), selectedWeekOffset);
  const startKey = todayKey(weekRange.start);
  const endKey = todayKey(weekRange.end);
  return expenses.filter(item => item.date >= startKey && item.date <= endKey);
}

function upcomingBills() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const list = [];
  recurring.forEach(rule => {
    const nextDate = dateInMonth(addMonths(rule.lastMonth, 1), rule.day);
    const parts = nextDate.split('-');
    const due = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    const days = Math.round((due - today) / 86400000);
    if (days >= 1 && days <= 3) list.push({ rule: rule, days: days });
  });
  list.sort((a, b) => a.days - b.days);
  return list;
}

function daysLeftInMonth() {
  const now = new Date();
  // نحسب الأيام الباقية للشهر الحالي بس، لأن الشهور الماضية ما فيها أيام باقية
  if (selectedMonth !== todayKey(now).slice(0, 7)) return 0;
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  return lastDay - now.getDate() + 1;
}

function renderComparison() {
  const today = todayKey(new Date());
  const lastMonth = addMonths(selectedMonth, -1);
  let thisPeriod = monthExpenses(selectedMonth);
  let lastPeriod = monthExpenses(lastMonth);
  const isCurrentMonth = selectedMonth === today.slice(0, 7);
  if (isCurrentMonth) {
    // في الشهر الحالي نقارن بنفس الأيام من الشهر الماضي، لأن مقارنة نص شهر بشهر كامل تطلع غلط
    const dayNumber = today.slice(8);
    lastPeriod = lastPeriod.filter(item => item.date.slice(8) <= dayNumber);
    thisPeriod = thisPeriod.filter(item => item.date <= today);
  }
  updateComparison(thisPeriod, lastPeriod, isCurrentMonth);
}

function render() {
  const currentExpenses = monthExpenses(selectedMonth);
  const visibleExpenses = getVisibleExpenses();
  const weekRange = getWeekRange(new Date(), selectedWeekOffset);
  document.querySelector('#monthName').textContent = formatMonth(new Date(`${selectedMonth}-01T12:00:00`));
  updateSummary(currentExpenses, budgetFor(selectedMonth), daysLeftInMonth());
  updateChart(expenses, new Date(), selectedWeekOffset);
  if (selectedWeekOffset === 0) {
    document.querySelector('#weekLabel').textContent = t('thisWeek');
  } else {
    document.querySelector('#weekLabel').textContent = formatWeekRange(weekRange.start, weekRange.end);
  }
  document.querySelector('#nextWeek').disabled = selectedWeekOffset >= 0;
  updateCategories(visibleExpenses);
  updateReports(currentExpenses);
  renderComparison();
  updateUpcoming(upcomingBills());
  updateCalendar(selectedMonth, expenses);
  updateTransactions(visibleExpenses);
}

function updateGreeting() {
  const name = getEnglishDisplayName();
  const comma = getLanguage() === 'en' ? ', ' : '، ';
  document.querySelector('#greetingIntro').textContent = name ? `${t('hello')}${comma}${name}` : t('hello');
}

function refreshDateTime() {
  document.querySelector('#todayLabel').textContent = formatToday(new Date());
  if (!document.querySelector('#monthFilter').value) document.querySelector('#monthFilter').value = selectedMonth;
}

function applyLanguage() {
  const language = getLanguage();
  document.documentElement.lang = language;
  document.documentElement.dir = language === 'en' ? 'ltr' : 'rtl';
  document.title = t('pageTitle');
  saveLanguageForWorker(language);
  applyTranslations();
  updateGreeting();
  updateAuthTexts();
  setCloudStatus(cloudStatusKey, cloudStatusExtra);
  refreshDateTime();
}

// ---------- نافذة المصروف ----------

function showCustomField(show) {
  const customInput = document.querySelector('#customCategoryInput');
  document.querySelector('#customCategoryField').hidden = !show;
  customInput.required = show;
  if (!show) customInput.value = '';
}

function openModal(expense = null) {
  editingId = expense ? expense.id : null;
  const form = document.querySelector('#expenseForm');
  // نفرغ النموذج كل مرة عشان ما تبقى بيانات تعديل سابق لما يضغط إضافة مصروف
  form.reset();
  document.querySelector('#customCategoryInput').value = '';
  if (expense) {
    form.elements.amount.value = expense.amount;
    form.elements.description.value = expense.description;
    form.elements.date.value = expense.date;
    if (STANDARD_CATEGORIES.includes(expense.category)) {
      form.elements.category.value = expense.category;
    } else {
      form.elements.category.value = CUSTOM_CATEGORY;
      document.querySelector('#customCategoryInput').value = expense.category;
    }
  } else {
    form.elements.date.value = todayKey(new Date());
  }
  showCustomField(form.elements.category.value === CUSTOM_CATEGORY);
  // خيار التكرار للمصروف الجديد بس، لأن التعديل يغير مصروف واحد مو القاعدة كلها
  document.querySelector('#repeatField').hidden = Boolean(editingId);
  setKey('#expenseModalKicker', editingId ? 'editExpense' : 'newExpense');
  setKey('#modalTitle', editingId ? 'editExpenseDetails' : 'recordExpense');
  setKey('#expenseSubmitLabel', editingId ? 'saveEdit' : 'saveExpense');
  document.querySelector('#modalBackdrop').hidden = false;
  form.elements.amount.focus();
}

function closeModal() {
  document.querySelector('#modalBackdrop').hidden = true;
  editingId = null;
}

function saveExpenseFromForm(form) {
  let category = form.elements.category.value;
  if (category === CUSTOM_CATEGORY) category = document.querySelector('#customCategoryInput').value.trim();
  const description = form.elements.description.value.trim();
  // وصف من مسافات فاضية ينحذف لاحقًا عند التحميل، فنرفضه من البداية
  if (!category || !description) return false;

  const amount = Number(form.elements.amount.value);
  const date = form.elements.date.value;
  let id = editingId || crypto.randomUUID();
  let createdAt = Date.now();
  if (editingId) {
    const oldExpense = expenses.find(item => item.id === editingId);
    if (oldExpense) createdAt = oldExpense.createdAt;
  }

  if (!editingId && form.elements.repeat.checked) {
    const rule = { id: crypto.randomUUID(), amount: amount, category: category, description: description, day: Number(date.slice(8)), lastMonth: date.slice(0, 7) };
    id = recurringExpenseId(rule.id, rule.lastMonth);
    recurring.push(rule);
    saveRecurring(recurring);
    markProfileChanged();
  }

  const expense = { id: id, amount: amount, category: category, description: description, date: date, createdAt: createdAt };
  if (editingId) {
    expenses = expenses.map(item => item.id === editingId ? expense : item);
  } else {
    expenses.push(expense);
  }
  saveExpenses(expenses);
  markExpenseChanged(id);
  // لو المصروف المتكرر تاريخه بشهر سابق، نضيف الشهور اللي بعده مباشرة بدل ما ننتظر
  if (!addDueRecurring()) pushChanges();
  return true;
}

// ---------- الحذف مع التراجع ----------

function deleteExpense(id) {
  // لو في حذف سابق ينتظر، نثبته أول قبل ما نبدأ حذف جديد
  commitPendingDelete();
  const expense = expenses.find(item => item.id === id);
  if (!expense) return;
  expenses = expenses.filter(item => item.id !== id);
  saveExpenses(expenses);
  render();
  pendingUndo = { expense: expense, timer: setTimeout(commitPendingDelete, UNDO_SECONDS * 1000) };
  document.querySelector('#undoToast').hidden = false;
}

function commitPendingDelete() {
  if (!pendingUndo) return;
  clearTimeout(pendingUndo.timer);
  markExpenseDeleted(pendingUndo.expense.id);
  pendingUndo = null;
  document.querySelector('#undoToast').hidden = true;
  pushChanges();
}

function undoDelete() {
  if (!pendingUndo) return;
  clearTimeout(pendingUndo.timer);
  expenses.push(pendingUndo.expense);
  saveExpenses(expenses);
  pendingUndo = null;
  document.querySelector('#undoToast').hidden = true;
  render();
}

// ---------- الميزانية والإعدادات ----------

function openBudgetModal() {
  document.querySelector('#budgetInput').value = budgetFor(selectedMonth) || '';
  document.querySelector('#budgetModalBackdrop').hidden = false;
  document.querySelector('#budgetInput').focus();
}

function closeBudgetModal() {
  document.querySelector('#budgetModalBackdrop').hidden = true;
}

function openSettings() {
  document.querySelector('#displayNameInput').value = getEnglishDisplayName();
  document.querySelector('#languageInput').value = getLanguage();
  updateRecurringList(recurring);
  updateReminderButton();
  document.querySelector('#settingsModalBackdrop').hidden = false;
}

function closeSettings() {
  document.querySelector('#settingsModalBackdrop').hidden = true;
}

// ---------- تسجيل الدخول ----------

async function finishCloudSignIn(session) {
  currentSession = session;
  setKey('#authButton', 'signOut');
  // نفتح التطبيق فورًا ببيانات الجهاز، والسحب من السحابة يكمل بالخلفية عشان يشتغل حتى بدون نت
  setAppLocked(false);
  render();
  showInstallGuideOnce(session.user.id);
  maybeShowReminderBanner();
  if (navigator.onLine) {
    // المتكرر ينضاف بعد السحب، عشان نشتغل على آخر نسخة من قائمة التكرار مو نسخة الجهاز القديمة
    await pullFromCloud(true);
  } else {
    if (addDueRecurring()) render();
    setCloudStatus('offlineSaved');
  }
}

async function signOutUser() {
  commitPendingDelete();
  // نتأكد إن كل التعديلات وصلت السحابة قبل ما نمسح نسخة الجهاز، عشان ما يضيع شي
  const saved = await pushChanges();
  if (!saved) {
    alert(t('signOutFailed'));
    return;
  }
  await removeReminderForDevice();
  await cloudApi.signOut();
  currentSession = null;
  // نمسح نسخة الجهاز عشان لو دخل حساب ثاني ما تنرفع له مصاريف الحساب السابق
  clearLocalData();
  expenses = [];
  budgets = {};
  recurring = [];
  pending = emptyPending();
  saveEnglishDisplayName('');
  localStorage.removeItem('sarfati-display-name');
  updateGreeting();
  setKey('#authButton', 'signInSync');
  setCloudStatus('syncReady');
  closeMobileMenu();
  setAppLocked(true);
  render();
}

function openAuthModal() {
  if (!cloudApi.cloudEnabled) {
    setCloudStatus('addSupabaseFirst');
    return;
  }
  authMode = 'signin';
  updateAuthTexts();
  document.querySelector('#authMessage').textContent = '';
  document.querySelector('#authModalBackdrop').hidden = false;
  document.querySelector('#authForm input[name="email"]').focus();
}

function closeAuthModal() {
  document.querySelector('#authModalBackdrop').hidden = true;
}

function updateAuthTexts() {
  const isSignup = authMode === 'signup';
  setKey('#authModalTitle', isSignup ? 'signupTitle' : 'loginTitle');
  setKey('#authModalNote', isSignup ? 'signupNote' : 'loginNote');
  setKey('#authSubmit', isSignup ? 'createAccount' : 'signIn');
  setKey('#signUpButton', isSignup ? 'haveAccount' : 'createNewAccount');
}

function authErrorKey(error) {
  const message = String(error?.message || '').toLowerCase();
  if (message === 'cloud_not_configured') return 'addSupabaseFirst';
  if (message.includes('already registered') || message.includes('already been registered')) return 'errAlreadyRegistered';
  if (message.includes('invalid login credentials')) return 'errInvalidLogin';
  if (message.includes('password')) return 'errPassword';
  if (message.includes('signup is disabled')) return 'errSignupDisabled';
  if (message.includes('email')) return 'errEmail';
  return 'errGeneric';
}

// ---------- إضافة التطبيق للشاشة الرئيسية ----------

let deferredInstallPrompt = null;

const SHARE_ICON = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 15V3"/><path d="M7 8l5-5 5 5"/><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7"/></svg>';
const PLUS_ICON = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M12 8v8"/><path d="M8 12h8"/></svg>';
const DESKTOP_ICON = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="13" rx="2"/><path d="M8 21h8"/><path d="M12 7v6"/><path d="M9 10l3 3 3-3"/></svg>';
const MENU_ICON = '<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg>';

function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
}

function isIos() {
  // الآيباد الجديد يعرّف نفسه كماك، فنفرقه بشاشة اللمس
  return /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

function isAndroid() {
  return /android/i.test(navigator.userAgent);
}

function openInstallGuide() {
  let steps;
  let introKey;
  if (isIos()) {
    steps = [[SHARE_ICON, 'iosStep1'], [PLUS_ICON, 'iosStep2'], ['Add', 'iosStep3']];
    introKey = 'installIntroIos';
  } else if (isAndroid()) {
    steps = [[MENU_ICON, 'androidStep1'], [PLUS_ICON, 'androidStep2'], ['Install', 'androidStep3']];
    introKey = 'installIntroAndroid';
  } else {
    steps = [[DESKTOP_ICON, 'desktopStep1'], ['Install', 'desktopStep2']];
    introKey = 'installIntroDesktop';
  }
  document.querySelector('#installSteps').innerHTML = steps.map((step, index) => `<div class="install-step"><span class="install-number">${index + 1}</span><span class="install-icon">${step[0]}</span><span>${t(step[1])}</span></div>`).join('');
  setKey('#installIntro', introKey);
  // أندرويد كروم يقدر يثبت بضغطة وحدة، فنظهر الزر بس لما المتصفح يسمح
  document.querySelector('#installNowButton').hidden = !deferredInstallPrompt;
  document.querySelector('#installModalBackdrop').hidden = false;
}

function closeInstallGuide() {
  document.querySelector('#installModalBackdrop').hidden = true;
}

function showInstallGuideOnce(userId) {
  // نعرضها مرة وحدة لكل حساب على كل جهاز، وبس لو فاتح من متصفح جوال مو من التطبيق المثبت
  const key = `sarfati-install-guide-${userId}`;
  if (isStandalone() || localStorage.getItem(key)) return;
  localStorage.setItem(key, 'shown');
  openInstallGuide();
}

window.addEventListener('beforeinstallprompt', event => {
  event.preventDefault();
  deferredInstallPrompt = event;
   if (!document.querySelector('#installModalBackdrop').hidden) document.querySelector('#installNowButton').hidden = false;
});

document.querySelector('#installNowButton').addEventListener('click', async () => {
  if (!deferredInstallPrompt) return;
  deferredInstallPrompt.prompt();
  await deferredInstallPrompt.userChoice;
  deferredInstallPrompt = null;
  closeInstallGuide();
});
document.querySelector('#installLater').addEventListener('click', closeInstallGuide);
document.querySelector('#closeInstall').addEventListener('click', closeInstallGuide);
document.querySelector('#installModalBackdrop').addEventListener('click', event => { if (event.target.id === 'installModalBackdrop') closeInstallGuide(); });
document.querySelector('#openInstallGuide').addEventListener('click', () => {
  closeSettings();
  openInstallGuide();
});

function remindersSupported() {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

function urlBase64ToUint8Array(text) {
  const padding = '='.repeat((4 - text.length % 4) % 4);
  const base64 = (text + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const bytes = new Uint8Array(raw.length);
  for (let index = 0; index < raw.length; index++) bytes[index] = raw.charCodeAt(index);
  return bytes;
}

async function getPushSubscription() {
  if (!remindersSupported()) return null;
  const registration = await navigator.serviceWorker.ready;
  return registration.pushManager.getSubscription();
}

async function updateReminderButton() {
  const button = document.querySelector('#reminderButton');
  if (!remindersSupported()) {
    button.hidden = true;
    setKey('#reminderStatus', isIos() && !isStandalone() ? 'reminderNeedsInstall' : 'reminderNotSupported');
    return;
  }
  button.hidden = false;
  const subscription = await getPushSubscription();
  const enabled = Boolean(subscription) && Notification.permission === 'granted';
  setKey('#reminderButton', enabled ? 'reminderOff' : 'reminderOn');
  setKey('#reminderStatus', enabled ? 'reminderEnabled' : 'reminderDisabled');
}

async function toggleReminder() {
  if (!currentSession || !cloudApi.cloudEnabled) return;
  const button = document.querySelector('#reminderButton');
  button.disabled = true;
  try {
    const current = await getPushSubscription();
    if (current) {
      await cloudApi.deletePushSubscription(current.endpoint);
      await current.unsubscribe();
    } else {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setKey('#reminderStatus', 'reminderDenied');
        return;
      }
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(cloudApi.vapidPublicKey) });
      await cloudApi.savePushSubscription(currentSession.user.id, subscription.toJSON());
    }
    await updateReminderButton();
  } catch (error) {
    console.error('Reminder error', error);
    setKey('#reminderStatus', 'reminderFailed');
    document.querySelector('#reminderStatus').textContent += ' [' + (error.name || 'Error') + ': ' + (error.message || error) + ']';
  } finally {
    button.disabled = false;
  }
}

async function removeReminderForDevice() {
  try {
    const subscription = await getPushSubscription();
    if (!subscription) return;
    await cloudApi.deletePushSubscription(subscription.endpoint);
    await subscription.unsubscribe();
  } catch (error) {
    console.error('Reminder cleanup error', error);
  }
}

function saveLanguageForWorker(language) {
  if (!('caches' in window)) return;
  caches.open('my-expenses-settings').then(cache => cache.put('/settings/language', new Response(language))).catch(error => console.error(error));
}

document.querySelector('#reminderButton').addEventListener('click', toggleReminder);

function maybeShowReminderBanner() {
  const banner = document.querySelector('#reminderBanner');
  banner.hidden = true;
  if (!currentSession || !remindersSupported()) return;
  if (Notification.permission !== 'default') return;
  if (localStorage.getItem(`sarfati-reminder-banner-${currentSession.user.id}`)) return;
  banner.hidden = false;
}

function closeReminderBanner() {
  if (currentSession) localStorage.setItem(`sarfati-reminder-banner-${currentSession.user.id}`, 'shown');
  document.querySelector('#reminderBanner').hidden = true;
}

document.querySelector('#reminderBannerOn').addEventListener('click', async () => {
  closeReminderBanner();
  await toggleReminder();
});
document.querySelector('#reminderBannerClose').addEventListener('click', closeReminderBanner);

// ---------- ربط الأزرار ----------

document.querySelector('#openModal').addEventListener('click', () => openModal());
document.querySelector('#emptyAdd').addEventListener('click', () => openModal());
document.querySelector('#closeModal').addEventListener('click', closeModal);
document.querySelector('#modalBackdrop').addEventListener('click', event => { if (event.target.id === 'modalBackdrop') closeModal(); });

document.querySelector('#categoryInput').addEventListener('change', event => {
  showCustomField(event.target.value === CUSTOM_CATEGORY);
});

document.querySelector('#expenseForm').addEventListener('submit', event => {
  event.preventDefault();
  if (!saveExpenseFromForm(event.target)) return;
  closeModal();
  render();
});

// نسمع للضغط على القائمة كلها مرة وحدة، لأن أزرار التعديل والحذف تنرسم من جديد مع كل بحث وتضيع أحداثها لو ربطناها فيها مباشرة
document.querySelector('#transactionList').addEventListener('click', event => {
  const button = event.target.closest('[data-action]');
  if (!button) return;
    if (button.dataset.action === 'toggle') {
    const group = button.closest('.transaction-group');
    group.classList.toggle('open');
    group.querySelector('.group-items').hidden = !group.classList.contains('open');
    return;
  }
  const item = expenses.find(expense => expense.id === button.dataset.id);
  if (!item) return;
  if (button.dataset.action === 'edit') openModal(item);
  if (button.dataset.action === 'delete') deleteExpense(item.id);
});

document.querySelector('#undoButton').addEventListener('click', undoDelete);

document.querySelector('#recurringList').addEventListener('click', event => {
  const button = event.target.closest('[data-rule-id]');
  if (button) stopRecurring(button.dataset.ruleId);
});

document.querySelector('#editBudget').addEventListener('click', openBudgetModal);
document.querySelector('#closeBudgetModal').addEventListener('click', closeBudgetModal);
document.querySelector('#budgetModalBackdrop').addEventListener('click', event => { if (event.target.id === 'budgetModalBackdrop') closeBudgetModal(); });
document.querySelector('#budgetForm').addEventListener('submit', event => {
  event.preventDefault();
  const next = Number(document.querySelector('#budgetInput').value);
  if (next <= 0) return;
  // الميزانية تنحفظ للشهر المعروض بس، فالشهور اللي قبله ما تتغير
  budgets[selectedMonth] = next;
  saveBudgets(budgets);
  markProfileChanged();
  pushChanges();
  closeBudgetModal();
  render();
});

document.querySelector('#settingsButton').addEventListener('click', () => {
  // نقفل القائمة الجانبية أول عشان ما تغطي نافذة الإعدادات في الجوال
  closeMobileMenu();
  openSettings();
});
document.querySelector('#closeSettings').addEventListener('click', closeSettings);
document.querySelector('#settingsModalBackdrop').addEventListener('click', event => { if (event.target.id === 'settingsModalBackdrop') closeSettings(); });
document.querySelector('#languageInput').addEventListener('change', event => {
  saveLanguage(event.target.value);
  applyLanguage();
  updateRecurringList(recurring);
  render();
});
document.querySelector('#settingsForm').addEventListener('submit', event => {
  event.preventDefault();
  saveEnglishDisplayName(document.querySelector('#displayNameInput').value);
  markProfileChanged();
  pushChanges();
  saveLanguage(document.querySelector('#languageInput').value);
  applyLanguage();
  render();
  closeSettings();
});

document.querySelector('#mobileMenuButton').addEventListener('click', openMobileMenu);
document.querySelector('#mobileMenuBackdrop').addEventListener('click', closeMobileMenu);
document.querySelectorAll('.nav-item').forEach(item => item.addEventListener('click', closeMobileMenu));

document.querySelector('#authButton').addEventListener('click', () => {
  if (currentSession) signOutUser();
  else openAuthModal();
});
document.querySelector('#gateAuthButton').addEventListener('click', openAuthModal);
document.querySelector('#closeAuthModal').addEventListener('click', closeAuthModal);
document.querySelector('#authModalBackdrop').addEventListener('click', event => { if (event.target.id === 'authModalBackdrop') closeAuthModal(); });
document.querySelector('#signUpButton').addEventListener('click', () => {
  authMode = authMode === 'signup' ? 'signin' : 'signup';
  document.querySelector('#authMessage').textContent = '';
  updateAuthTexts();
});

document.querySelector('#authForm').addEventListener('submit', async event => {
  event.preventDefault();
  const email = event.target.elements.email.value;
  const password = event.target.elements.password.value;
  const message = document.querySelector('#authMessage');
  try {
    let session;
    if (authMode === 'signup') session = await cloudApi.signUp(email, password);
    else session = await cloudApi.signIn(email, password);
    if (!session && authMode === 'signup') {
      message.textContent = t('accountCreated');
      return;
    }
    closeAuthModal();
    await finishCloudSignIn(session);
  } catch (error) {
    console.error(error);
    message.textContent = t(authErrorKey(error));
  }
});

document.querySelector('#searchInput').addEventListener('input', () => updateTransactions(getVisibleExpenses()));
document.querySelector('#categoryFilter').addEventListener('change', () => updateTransactions(getVisibleExpenses()));
document.querySelector('#showAll').addEventListener('click', () => {
  document.querySelector('#searchInput').value = '';
  document.querySelector('#categoryFilter').value = 'all';
  updateTransactions(getVisibleExpenses());
});
document.querySelector('#monthFilter').addEventListener('change', event => {
  selectedMonth = event.target.value || selectedMonth;
  render();
});
document.querySelector('#previousWeek').addEventListener('click', () => { selectedWeekOffset -= 1; render(); });
document.querySelector('#nextWeek').addEventListener('click', () => {
  if (selectedWeekOffset < 0) {
    selectedWeekOffset += 1;
    render();
  }
});

// زر Esc يقفل أي نافذة مفتوحة، أريح على الكمبيوتر
document.addEventListener('keydown', event => {
  if (event.key !== 'Escape') return;
  closeModal();
  closeBudgetModal();
  closeSettings();
  closeAuthModal();
  closeInstallGuide();
  closeMobileMenu();
});

// لما يرجع المستخدم للتطبيق نسحب آخر البيانات، ولما يطلع منه نثبت أي حذف ينتظر عشان ما يضيع لو قفل التطبيق
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') {
    commitPendingDelete();
    return;
  }
  refreshDateTime();
  // السحب نفسه يضيف المتكرر بعد ما يجيب آخر نسخة، فما نضيفه قبله عشان ما نرفع قائمة قديمة فوق الجديدة
  if (currentSession && navigator.onLine && Date.now() - lastPullTime > PULL_WAIT_MS) pullFromCloud();
  else if (addDueRecurring()) render();
});

window.addEventListener('online', () => pullFromCloud());
window.addEventListener('offline', () => { if (currentSession) setCloudStatus('offlineSaved'); });

// ---------- التشغيل ----------

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch(error => console.error('Service worker failed', error));
}

moveLegacyBudget(loadLegacyBudget());
checkTranslations();
applyLanguage();
render();
setInterval(refreshDateTime, 60000);

import('./cloud.js')
  .then(async api => {
    cloudApi = api;
    if (!api.cloudEnabled) {
      setCloudStatus('localOnly');
      setAppLocked(true);
      return;
    }
    setCloudStatus('syncReady');
    let session = null;
    try {
      session = await api.getCloudSession();
    } catch (error) {
      console.error(error);
    }
    if (session) await finishCloudSignIn(session);
    else setAppLocked(true);
  })
  .catch(error => {
    // بدون نت ممكن مكتبة Supabase ما تتحمل، فنعرض بيانات الجهاز لو كان المستخدم مسجل من قبل
    console.error(error);
    setCloudStatus('offlineSaved');
    setAppLocked(expenses.length === 0 && Object.keys(budgets).length === 0);
  });