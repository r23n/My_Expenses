import { loadBudget, loadExpenses, saveBudget, saveExpenses } from './storage.js';
import { formatMonth, formatToday, formatWeekRange, getWeekRange, todayKey, updateCategories, updateChart, updateReports, updateSummary, updateTransactions } from './ui.js';
import { getDisplayName, getEnglishDisplayName, getLanguage, saveDisplayName, saveEnglishDisplayName, saveLanguage, t, transliterateArabic } from './i18n.js';

let expenses = loadExpenses();
let budget = loadBudget();
const now = new Date();
let selectedMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
let selectedWeekOffset = 0;
let editingId = null;
let cloudApi = { cloudEnabled: false };
let currentSession = null;
let authMode = 'signin';

function currentMonthExpenses() {
  return expenses.filter(item => item.date.startsWith(selectedMonth));
}

function render() {
  const weekRange = getWeekRange(new Date(), selectedWeekOffset);
  const weekStartKey = todayKey(weekRange.start);
  const weekEndKey = todayKey(weekRange.end);
  const monthExpenses = currentMonthExpenses();
  const visibleExpenses = selectedWeekOffset === 0
    ? currentMonthExpenses()
    : expenses.filter(item => item.date >= weekStartKey && item.date <= weekEndKey);
  document.querySelector('#monthName').textContent = formatMonth(new Date(`${selectedMonth}-01T12:00:00`));
  updateSummary(monthExpenses, budget);
  updateChart(expenses, new Date(), selectedWeekOffset);
  document.querySelector('#weekLabel').textContent = selectedWeekOffset === 0 ? t('thisWeek') : formatWeekRange(weekRange.start, weekRange.end);
  document.querySelector('#nextWeek').disabled = selectedWeekOffset >= 0;
  updateCategories(visibleExpenses);
  updateReports(monthExpenses);
  const deleteButtons = updateTransactions(visibleExpenses);
  deleteButtons.forEach(button => button.addEventListener('click', () => {
    const item = expenses.find(expense => expense.id === button.dataset.id);
    if (!item) return;
    if (button.dataset.action === 'edit') return openModal(item);
    expenses = expenses.filter(expense => expense.id !== item.id);
    saveExpenses(expenses);
    syncCloud();
    render();
  }));
}

function openModal(expense = null) {
  editingId = expense?.id || null;
  document.querySelector('#expenseModalKicker').textContent = editingId ? 'تعديل مصروف' : 'مصروف جديد';
  document.querySelector('#modalTitle').textContent = editingId ? 'عدّل تفاصيل الصرف' : 'سجّل عملية صرف';
  document.querySelector('#expenseSubmitLabel').textContent = editingId ? 'حفظ التعديل' : 'حفظ المصروف';
  const form = document.querySelector('#expenseForm');
  if (expense) {
    form.elements.amount.value = expense.amount;
    form.elements.description.value = expense.description;
    form.elements.date.value = expense.date;
    const standardCategories = ['طعام', 'مواصلات', 'تسوق', 'فواتير', 'ترفيه', 'أخرى'];
    if (standardCategories.includes(expense.category)) {
      form.elements.category.value = expense.category;
    } else {
      form.elements.category.value = 'مخصص';
      document.querySelector('#customCategoryInput').value = expense.category;
    }
    document.querySelector('#customCategoryField').hidden = form.elements.category.value !== 'مخصص';
    document.querySelector('#customCategoryInput').required = form.elements.category.value === 'مخصص';
  }
  document.querySelector('#modalBackdrop').hidden = false;
  document.querySelector('input[name="amount"]').focus();
}

function closeModal() {
  document.querySelector('#modalBackdrop').hidden = true;
  editingId = null;
}

function openBudgetModal() {
  document.querySelector('#budgetInput').value = budget || '';
  document.querySelector('#budgetModalBackdrop').hidden = false;
  document.querySelector('#budgetInput').focus();
}

function closeBudgetModal() {
  document.querySelector('#budgetModalBackdrop').hidden = true;
}

function setCloudStatus(message) {
  document.querySelector('#cloudStatus').textContent = message;
}

function setAppLocked(locked) {
  document.body.classList.toggle('app-locked', locked);
  document.querySelector('#authGate').hidden = !locked;
}

async function syncCloud() {
  if (!currentSession || !cloudApi.cloudEnabled) return;
  try {
    await cloudApi.saveCloudData(currentSession.user.id, expenses, budget);
    setCloudStatus(t('syncReady'));
  } catch (error) {
    console.error(error);
    setCloudStatus(getLanguage() === 'en' ? 'Cloud update failed' : 'تعذر تحديث السحابة');
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
  setCloudStatus(getLanguage() === 'en' ? `Synced: ${session.user.email}` : `متزامن: ${session.user.email}`);
  document.querySelector('#authButton').textContent = 'تسجيل الخروج';
  setAppLocked(false);
  render();
}

function openAuthModal() {
  if (!cloudApi.cloudEnabled) {
    setCloudStatus(getLanguage() === 'en' ? 'Add Supabase settings first' : 'أضف إعدادات Supabase أولًا');
    return;
  }
  authMode = 'signin';
  applyAuthMode();
  document.querySelector('#authMessage').textContent = '';
  document.querySelector('#authModalBackdrop').hidden = false;
  document.querySelector('#authForm input[name="email"]').focus();
}

function closeAuthModal() {
  document.querySelector('#authModalBackdrop').hidden = true;
}

function applyAuthMode() {
  const isSignup = authMode === 'signup';
  const english = getLanguage() === 'en';
  document.querySelector('#authModalTitle').textContent = english ? (isSignup ? 'Create your account' : 'Sign in') : (isSignup ? 'أنشئ حسابك' : 'سجّل دخولك');
  document.querySelector('#authSubmit').textContent = english ? (isSignup ? 'Create account' : 'Sign in') : (isSignup ? 'إنشاء حساب' : 'تسجيل الدخول');
  document.querySelector('#signUpButton').textContent = english ? (isSignup ? 'Already have an account? Sign in' : 'Create a new account') : (isSignup ? 'لديك حساب؟ سجّل الدخول' : 'إنشاء حساب جديد');
  document.querySelector('#authModalNote').textContent = english ? (isSignup ? 'Use an email and password to create your account.' : 'Use the same account on your phone and computer.') : (isSignup ? 'استخدم بريدك وكلمة مرور من 6 أحرف أو أكثر.' : 'استخدم نفس الحساب على الجوال والكمبيوتر.');
}

function setText(selector, key) {
  const element = document.querySelector(selector);
  if (element) element.textContent = t(key);
}

function applyLanguage() {
  const language = getLanguage();
  document.documentElement.lang = language;
  document.documentElement.dir = language === 'en' ? 'ltr' : 'rtl';
  document.title = language === 'en' ? 'My Expenses | Daily spending' : 'مصاريفي | مصاريفي اليومية';
  document.querySelector('.brand strong').textContent = language === 'en' ? 'My Expenses' : 'مصاريفي';
  document.querySelectorAll('.donut-chart span, .amount-input span').forEach(element => { element.textContent = language === 'en' ? 'BHD' : 'د.ب'; });
  setText('.brand span', 'brandTagline');
  ['overview', 'expenses', 'insights'].forEach((key, index) => { const item = document.querySelectorAll('.nav-item')[index]; if (item) item.lastChild.textContent = t(key); });
  setText('#settingsLabel', 'settings');
  const displayName = getEnglishDisplayName() || transliterateArabic(getDisplayName());
  document.querySelector('#greetingIntro').textContent = getLanguage() === 'en'
    ? `Hi${displayName ? `, ${displayName}` : ''}`
    : `مرحبا${displayName ? `، ${displayName}` : ''}`;
  setText('#greetingAccent', 'todayAccent');
  setText('#trackingLabel', 'tracking');
  setText('#monthlyBudgetLabel', 'monthlyBudget');
  setText('#addExpenseLabel', 'addExpense');
  document.querySelector('#sidebarFooter').textContent = getLanguage() === 'en' ? 'Your data is stored locally' : 'بياناتك محفوظة على جهازك';
  setText('#budgetActionLabel', budget > 0 ? 'editBudget' : 'setBudget');
  setText('#totalSpentLabel', 'totalSpent');
  setText('#remainingLabel', 'remaining');
  setText('#dailyAverageLabel', 'dailyAverage');
  setText('#daysRecordedLabel', 'daysRecorded');
  const contentKickers = document.querySelectorAll('.content-grid .section-kicker');
  const contentTitles = document.querySelectorAll('.content-grid h2');
  if (contentKickers[0]) contentKickers[0].textContent = t('spendingRhythm');
  if (contentTitles[0]) contentTitles[0].textContent = t('weekExpenses');
  if (contentKickers[1]) contentKickers[1].textContent = t('spendingDistribution');
  if (contentTitles[1]) contentTitles[1].textContent = t('whereMoneyGoes');
  document.querySelectorAll('.report-card .section-kicker').forEach(item => { item.textContent = t('monthlyReport'); });
  setText('.report-card h2', 'topCategory');
  const reportTitles = document.querySelectorAll('.report-card h2');
  if (reportTitles[1]) reportTitles[1].textContent = t('topDay');
  setText('#transactions .section-kicker', 'activity');
  setText('#transactions h2', 'latestExpenses');
  document.querySelector('#showAll').textContent = getLanguage() === 'en' ? 'Show all' : 'عرض الكل';
  document.querySelector('#searchInput').placeholder = t('search');
  setText('#monthFilterLabel', language === 'en' ? 'Month' : 'الشهر');
  setText('#emptyState h3', 'noExpenses');
  setText('#emptyState p', 'startTracking');
  setText('#emptyAdd', 'addExpense');
  setText('#expenseModalKicker', editingId ? 'editExpense' : 'newExpense');
  setText('#modalTitle', editingId ? 'editExpenseDetails' : 'recordExpense');
  setText('#expenseSubmitLabel', editingId ? 'saveEdit' : 'saveExpense');
  setText('#amountLabel', 'amount');
  setText('#expenseTypeLabel', 'expenseType');
  setText('#customTypeLabel', 'customType');
  setText('#descriptionLabel', 'description');
  setText('#dateLabel', 'date');
  document.querySelector('#budgetKicker').textContent = getLanguage() === 'en' ? 'Monthly budget' : 'ميزانيتك الشهرية';
  document.querySelector('#budgetModalTitle').textContent = getLanguage() === 'en' ? 'Set the amount that works for you' : 'حدد المبلغ الذي يناسبك';
  document.querySelector('#budgetModalNote').textContent = getLanguage() === 'en' ? 'You can change it at any time.' : 'يمكنك تغييره في أي وقت.';
  document.querySelector('#budgetInputLabel').textContent = getLanguage() === 'en' ? 'Monthly budget' : 'الميزانية الشهرية';
  document.querySelector('#budgetSubmitLabel').textContent = getLanguage() === 'en' ? 'Save budget' : 'حفظ الميزانية';
  document.querySelector('#categoryInput').options[6].textContent = t('customOption');
  const categoryNames = language === 'en' ? ['All categories', 'Food & drinks', 'Transport', 'Shopping', 'Bills', 'Entertainment', 'Other'] : ['كل التصنيفات', 'طعام ومشروبات', 'مواصلات', 'تسوق', 'فواتير', 'ترفيه', 'أخرى'];
  [...document.querySelector('#categoryFilter').options].forEach((option, index) => { if (categoryNames[index]) option.textContent = categoryNames[index]; });
  setText('#settingsKicker', 'userSettings');
  setText('#settingsTitle', 'userSettings');
  document.querySelector('#settingsNote').textContent = getLanguage() === 'en' ? 'Customize how the system appears to you.' : 'خصص طريقة ظهور النظام لك.';
  setText('#displayNameLabel', 'displayName');
  setText('#languageLabel', 'language');
  setText('#settingsSubmitLabel', 'saveSettings');
  document.querySelector('#languageInput').options[0].textContent = t('arabic');
  document.querySelector('#languageInput').options[1].textContent = t('english');
  setText('#secureSyncLabel', 'secureSync');
  setText('#authModalTitle', 'loginTitle');
  setText('#authModalNote', 'loginNote');
  document.querySelector('#emailLabel').textContent = getLanguage() === 'en' ? 'Email address' : 'البريد الإلكتروني';
  document.querySelector('#passwordLabel').textContent = getLanguage() === 'en' ? 'Password' : 'كلمة المرور';
  document.querySelector('#authSubmit').textContent = getLanguage() === 'en' ? 'Sign in' : 'تسجيل الدخول';
  setText('#signUpButton', language === 'en' ? 'Create account' : 'إنشاء حساب جديد');
  document.querySelector('#authButton').textContent = currentSession ? t('signOut') : t('signInSync');
  document.querySelector('#gateKicker').textContent = getLanguage() === 'en' ? 'My Expenses' : 'مصاريفي';
  document.querySelector('#gateTitle').textContent = getLanguage() === 'en' ? 'Sign in to continue' : 'سجّل دخولك للمتابعة';
  document.querySelector('#gateMessage').textContent = getLanguage() === 'en' ? 'Sign in is required to use the system and keep your expenses secure.' : 'يجب تسجيل الدخول لاستخدام النظام وحفظ مصاريفك بأمان.';
  document.querySelector('#gateAuthButton').textContent = getLanguage() === 'en' ? 'Sign in' : 'تسجيل الدخول';
  applyAuthMode();
  if (!currentSession) setCloudStatus(cloudApi.cloudEnabled ? t('syncReady') : t('localOnly'));
  refreshDateTime();
}

function openSettings() {
  document.querySelector('#displayNameInput').value = getDisplayName();
  document.querySelector('#displayNameInput').value = getEnglishDisplayName() || transliterateArabic(getDisplayName());
  document.querySelector('#languageInput').value = getLanguage();
  document.querySelector('#settingsModalBackdrop').hidden = false;
}

function closeSettings() {
  document.querySelector('#settingsModalBackdrop').hidden = true;
}

function authErrorMessage(error) {
  const message = String(error?.message || '').toLowerCase();
  if (message.includes('already registered') || message.includes('already been registered')) return 'هذا البريد مسجل مسبقًا. استخدم تسجيل الدخول.';
  if (message.includes('password')) return 'كلمة المرور يجب أن تكون 6 أحرف أو أكثر.';
  if (message.includes('invalid login credentials')) return 'البريد أو كلمة المرور غير صحيحة.';
  if (message.includes('signup is disabled')) return 'إنشاء الحسابات معطل من إعدادات Supabase.';
  if (message.includes('email')) return 'تأكد من كتابة بريد إلكتروني صحيح.';
  return 'تعذر إنشاء الحساب. تحقق من إعدادات Supabase واتصال الإنترنت.';
}

function refreshDateTime() {
  const currentDate = new Date();
  document.querySelector('#todayLabel').textContent = formatToday(currentDate);
  if (!document.querySelector('#monthFilter').value) document.querySelector('#monthFilter').value = selectedMonth;
  document.querySelector('input[name="date"]').value = todayKey(currentDate);
}

applyLanguage();
refreshDateTime();
setInterval(refreshDateTime, 60000);
document.querySelector('#openModal').addEventListener('click', openModal);
document.querySelector('#emptyAdd').addEventListener('click', openModal);
document.querySelector('#closeModal').addEventListener('click', closeModal);
document.querySelector('#modalBackdrop').addEventListener('click', event => { if (event.target.id === 'modalBackdrop') closeModal(); });
document.querySelector('#closeBudgetModal').addEventListener('click', closeBudgetModal);
document.querySelector('#budgetModalBackdrop').addEventListener('click', event => { if (event.target.id === 'budgetModalBackdrop') closeBudgetModal(); });
document.querySelector('#settingsButton').addEventListener('click', openSettings);
document.querySelector('#closeSettings').addEventListener('click', closeSettings);
document.querySelector('#settingsModalBackdrop').addEventListener('click', event => { if (event.target.id === 'settingsModalBackdrop') closeSettings(); });
document.querySelector('#settingsForm').addEventListener('submit', event => { event.preventDefault(); const form = new FormData(event.target); saveEnglishDisplayName(form.get('displayName')); saveLanguage(form.get('language')); applyLanguage(); render(); closeSettings(); });
function closeMobileMenu() { document.querySelector('.sidebar').classList.remove('menu-open'); document.querySelector('#mobileMenuBackdrop').hidden = true; }
document.querySelector('#mobileMenuButton').addEventListener('click', () => { document.querySelector('.sidebar').classList.add('menu-open'); document.querySelector('#mobileMenuBackdrop').hidden = false; });
document.querySelector('#mobileMenuBackdrop').addEventListener('click', closeMobileMenu);
document.querySelectorAll('.nav-item').forEach(item => item.addEventListener('click', closeMobileMenu));
document.querySelector('#authButton').addEventListener('click', async () => { if (currentSession) { await cloudApi.signOut(); currentSession = null; setCloudStatus('محفوظ على هذا الجهاز'); document.querySelector('#authButton').textContent = 'تسجيل الدخول للمزامنة'; setAppLocked(true); } else openAuthModal(); });
document.querySelector('#gateAuthButton').addEventListener('click', openAuthModal);
document.querySelector('#closeAuthModal').addEventListener('click', closeAuthModal);
document.querySelector('#authModalBackdrop').addEventListener('click', event => { if (event.target.id === 'authModalBackdrop') closeAuthModal(); });
document.querySelector('#categoryInput').addEventListener('change', event => {
  const customField = document.querySelector('#customCategoryField');
  const customInput = document.querySelector('#customCategoryInput');
  const isCustom = event.target.value === 'مخصص';
  customField.hidden = !isCustom;
  customInput.required = isCustom;
  if (!isCustom) customInput.value = '';
});
document.querySelector('#searchInput').addEventListener('input', () => updateTransactions(currentMonthExpenses()));
document.querySelector('#categoryFilter').addEventListener('change', () => updateTransactions(currentMonthExpenses()));
document.querySelector('#monthFilter').addEventListener('change', event => { selectedMonth = event.target.value || selectedMonth; render(); });
document.querySelector('#previousWeek').addEventListener('click', () => { selectedWeekOffset -= 1; render(); });
document.querySelector('#nextWeek').addEventListener('click', () => { if (selectedWeekOffset < 0) { selectedWeekOffset += 1; render(); } });
document.querySelector('#showAll').addEventListener('click', () => { document.querySelector('#searchInput').value = ''; document.querySelector('#categoryFilter').value = 'all'; updateTransactions(currentMonthExpenses()); });
document.querySelector('#editBudget').addEventListener('click', openBudgetModal);
document.querySelector('#budgetForm').addEventListener('submit', event => { event.preventDefault(); const next = Number(new FormData(event.target).get('budget')); if (next > 0) { budget = next; saveBudget(budget); syncCloud(); closeBudgetModal(); render(); } });
document.querySelector('#expenseForm').addEventListener('submit', event => { event.preventDefault(); const form = new FormData(event.target); const selectedCategory = document.querySelector('#categoryInput').value; const customCategory = document.querySelector('#customCategoryInput').value.trim(); const category = selectedCategory === 'مخصص' ? customCategory : selectedCategory; if (!category) return; const expense = { id: editingId || crypto.randomUUID(), amount: Number(form.get('amount')), category, description: form.get('description').trim(), date: form.get('date'), createdAt: editingId ? expenses.find(item => item.id === editingId)?.createdAt || Date.now() : Date.now() }; expenses = editingId ? expenses.map(item => item.id === editingId ? expense : item) : [...expenses, expense]; saveExpenses(expenses); syncCloud(); event.target.reset(); document.querySelector('#customCategoryField').hidden = true; document.querySelector('#customCategoryInput').required = false; event.target.elements.date.value = todayKey(new Date()); closeModal(); render(); });

document.querySelector('#authForm').addEventListener('submit', async event => {
  event.preventDefault();
  const form = new FormData(event.target);
  const message = document.querySelector('#authMessage');
  try {
    const session = authMode === 'signup' ? await cloudApi.signUp(form.get('email'), form.get('password')) : await cloudApi.signIn(form.get('email'), form.get('password'));
    if (!session && authMode === 'signup') {
      message.textContent = getLanguage() === 'en' ? 'Account created. Check your email to confirm it, then sign in.' : 'تم إنشاء الحساب. افتح بريدك لتأكيده ثم سجّل الدخول.';
      return;
    }
    await finishCloudSignIn(session);
    closeAuthModal();
  } catch (error) {
    message.textContent = error.message === 'cloud_not_configured' ? 'أضف إعدادات Supabase أولًا.' : authErrorMessage(error);
  }
});

document.querySelector('#signUpButton').addEventListener('click', () => { authMode = authMode === 'signup' ? 'signin' : 'signup'; document.querySelector('#authMessage').textContent = ''; applyAuthMode(); });

import('./cloud.js').then(async api => { cloudApi = api; if (!api.cloudEnabled) { setCloudStatus(t('localOnly')); setAppLocked(true); return; } setCloudStatus(t('syncReady')); const session = await api.getCloudSession(); if (session) await finishCloudSignIn(session); else setAppLocked(true); }).catch(() => { setCloudStatus(t('localOnly')); setAppLocked(true); });
render();
