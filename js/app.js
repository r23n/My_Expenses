import { loadBudget, loadExpenses, saveBudget, saveExpenses } from './storage.js';
import { formatMonth, formatToday, formatWeekRange, getWeekRange, todayKey, updateCategories, updateChart, updateReports, updateSummary, updateTransactions } from './ui.js';
import { applyTranslations, checkTranslations, getDisplayName, getEnglishDisplayName, getLanguage, saveEnglishDisplayName, saveLanguage, t } from './i18n.js';

// القيم هذي تنحفظ بالعربي في قاعدة البيانات، فلا نغيرها حتى لو الواجهة إنجليزي
const STANDARD_CATEGORIES = ['طعام', 'مواصلات', 'تسوق', 'فواتير', 'ترفيه', 'أخرى'];
const CUSTOM_CATEGORY = 'مخصص';

let expenses = loadExpenses();
let budget = loadBudget();
let selectedMonth = todayKey(new Date()).slice(0, 7);
let selectedWeekOffset = 0;
let editingId = null;
let cloudApi = { cloudEnabled: false };
let currentSession = null;
let authMode = 'signin';
// نحفظ مفتاح حالة السحابة بدل النص نفسه عشان نقدر نعيد ترجمته لو تغيرت اللغة
let cloudStatusKey = 'localOnly';
let cloudStatusExtra = '';

// ---------- أدوات صغيرة ----------

function setKey(selector, key) {
  // نغير مفتاح الترجمة على العنصر نفسه، فلو تغيرت اللغة بعدين تترجمه applyTranslations صح
  const element = document.querySelector(selector);
  element.dataset.i18n = key;
  element.textContent = t(key);
}

function setCloudStatus(key, extra = '') {
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

// ---------- البيانات المعروضة ----------

function currentMonthExpenses() {
  return expenses.filter(item => item.date.startsWith(selectedMonth));
}

function getVisibleExpenses() {
  // في الأسبوع الحالي نعرض الشهر كامل، ولما يرجع لأسبوع سابق نعرض أيام ذاك الأسبوع بس
  if (selectedWeekOffset === 0) return currentMonthExpenses();
  const weekRange = getWeekRange(new Date(), selectedWeekOffset);
  const startKey = todayKey(weekRange.start);
  const endKey = todayKey(weekRange.end);
  return expenses.filter(item => item.date >= startKey && item.date <= endKey);
}

function render() {
  const monthExpenses = currentMonthExpenses();
  const visibleExpenses = getVisibleExpenses();
  const weekRange = getWeekRange(new Date(), selectedWeekOffset);
  document.querySelector('#monthName').textContent = formatMonth(new Date(`${selectedMonth}-01T12:00:00`));
  updateSummary(monthExpenses, budget);
  updateChart(expenses, new Date(), selectedWeekOffset);
  if (selectedWeekOffset === 0) {
    document.querySelector('#weekLabel').textContent = t('thisWeek');
  } else {
    document.querySelector('#weekLabel').textContent = formatWeekRange(weekRange.start, weekRange.end);
  }
  document.querySelector('#nextWeek').disabled = selectedWeekOffset >= 0;
  updateCategories(visibleExpenses);
  updateReports(monthExpenses);
  updateTransactions(visibleExpenses);
}

function updateGreeting() {
  const name = getEnglishDisplayName() || getDisplayName();
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

  let createdAt = Date.now();
  if (editingId) {
    const oldExpense = expenses.find(item => item.id === editingId);
    if (oldExpense) createdAt = oldExpense.createdAt;
  }
  const expense = {
    id: editingId || crypto.randomUUID(),
    amount: Number(form.elements.amount.value),
    category: category,
    description: description,
    date: form.elements.date.value,
    createdAt: createdAt
  };
  if (editingId) {
    expenses = expenses.map(item => item.id === editingId ? expense : item);
  } else {
    expenses.push(expense);
  }
  saveExpenses(expenses);
  syncCloud();
  return true;
}

async function deleteExpense(id) {
  if (!confirm(t('confirmDelete'))) return;
  expenses = expenses.filter(item => item.id !== id);
  saveExpenses(expenses);
  render();
  if (!currentSession || !cloudApi.cloudEnabled) return;
  try {
    await cloudApi.deleteCloudExpense(currentSession.user.id, id);
  } catch (error) {
    console.error(error);
    setCloudStatus('cloudFailed');
  }
}

// ---------- الميزانية والإعدادات ----------

function openBudgetModal() {
  document.querySelector('#budgetInput').value = budget || '';
  document.querySelector('#budgetModalBackdrop').hidden = false;
  document.querySelector('#budgetInput').focus();
}

function closeBudgetModal() {
  document.querySelector('#budgetModalBackdrop').hidden = true;
}

function openSettings() {
  document.querySelector('#displayNameInput').value = getEnglishDisplayName() || getDisplayName();
  document.querySelector('#languageInput').value = getLanguage();
  document.querySelector('#settingsModalBackdrop').hidden = false;
}

function closeSettings() {
  document.querySelector('#settingsModalBackdrop').hidden = true;
}

// ---------- السحابة وتسجيل الدخول ----------

async function syncCloud() {
  if (!currentSession || !cloudApi.cloudEnabled) return true;
  try {
    await cloudApi.saveCloudData(currentSession.user.id, expenses, budget);
    setCloudStatus('syncedAs', currentSession.user.email);
    return true;
  } catch (error) {
    console.error(error);
    setCloudStatus('cloudFailed');
    return false;
  }
}

async function finishCloudSignIn(session) {
  currentSession = session;
  const cloudData = await cloudApi.loadCloudData(session.user.id);
  if (cloudData.expenses.length || cloudData.budget > 0) {
    expenses = cloudData.expenses;
    budget = cloudData.budget;
    saveExpenses(expenses);
    saveBudget(budget);
  } else {
    await syncCloud();
  }
  setCloudStatus('syncedAs', session.user.email);
  setKey('#authButton', 'signOut');
  setAppLocked(false);
  render();
}

async function signOutUser() {
  // نتأكد إن آخر تعديل وصل السحابة قبل ما نمسح نسخة الجهاز، عشان ما يضيع شي
  const saved = await syncCloud();
  if (!saved) {
    alert(t('signOutFailed'));
    return;
  }
  await cloudApi.signOut();
  currentSession = null;
  // نمسح نسخة الجهاز عشان لو دخل حساب ثاني ما تنرفع له مصاريف الحساب السابق
  expenses = [];
  budget = 0;
  saveExpenses(expenses);
  saveBudget(budget);
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
  const item = expenses.find(expense => expense.id === button.dataset.id);
  if (!item) return;
  if (button.dataset.action === 'edit') openModal(item);
  if (button.dataset.action === 'delete') deleteExpense(item.id);
});

document.querySelector('#editBudget').addEventListener('click', openBudgetModal);
document.querySelector('#closeBudgetModal').addEventListener('click', closeBudgetModal);
document.querySelector('#budgetModalBackdrop').addEventListener('click', event => { if (event.target.id === 'budgetModalBackdrop') closeBudgetModal(); });
document.querySelector('#budgetForm').addEventListener('submit', event => {
  event.preventDefault();
  const next = Number(document.querySelector('#budgetInput').value);
  if (next <= 0) return;
  budget = next;
  saveBudget(budget);
  syncCloud();
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
document.querySelector('#settingsForm').addEventListener('submit', event => {
  event.preventDefault();
  saveEnglishDisplayName(document.querySelector('#displayNameInput').value);
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
    await finishCloudSignIn(session);
    closeAuthModal();
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
  closeMobileMenu();
});

// ---------- التشغيل ----------

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
    const session = await api.getCloudSession();
    if (session) await finishCloudSignIn(session);
    else setAppLocked(true);
  })
  .catch(error => {
    console.error(error);
    setCloudStatus('localOnly');
    setAppLocked(true);
  });