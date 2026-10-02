import { DEFAULT_BUDGET, STORAGE_KEYS } from './config.js';

function readJson(key, fallback) {
  // لو البيانات المحفوظة خربانة نرجع القيمة الافتراضية بدل ما يتعطل التطبيق كامل
  try {
    const value = JSON.parse(localStorage.getItem(key));
    return value === null ? fallback : value;
  } catch {
    return fallback;
  }
}

export function loadExpenses() {
  const expenses = readJson(STORAGE_KEYS.expenses, []);
  if (!Array.isArray(expenses)) return [];
  return expenses
    .filter(item => item && Number(item.amount) > 0 && item.category && item.description && item.date)
    .map(item => ({ ...item, amount: Number(item.amount), createdAt: item.createdAt || Date.now() }));
}

export function saveExpenses(expenses) {
  localStorage.setItem(STORAGE_KEYS.expenses, JSON.stringify(expenses));
}

// الميزانية القديمة (رقم واحد لكل الشهور) نقرأها مرة وحدة بس عشان ننقلها للنظام الجديد
export function loadLegacyBudget() {
  const savedBudget = localStorage.getItem(STORAGE_KEYS.budget);
  return savedBudget === null ? DEFAULT_BUDGET : Number(savedBudget);
}

export function loadBudgets() {
  const budgets = readJson(STORAGE_KEYS.budgets, {});
  return typeof budgets === 'object' && !Array.isArray(budgets) ? budgets : {};
}

export function saveBudgets(budgets) {
  localStorage.setItem(STORAGE_KEYS.budgets, JSON.stringify(budgets));
}

export function loadRecurring() {
  const rules = readJson(STORAGE_KEYS.recurring, []);
  return Array.isArray(rules) ? rules : [];
}

export function saveRecurring(rules) {
  localStorage.setItem(STORAGE_KEYS.recurring, JSON.stringify(rules));
}

export function emptyPending() {
  return { upserts: [], deletes: [], profile: false };
}

// قائمة التعديلات اللي ما وصلت السحابة بعد، عشان لو انقطع النت ما تضيع وترتفع لما يرجع
export function loadPending() {
  const pending = readJson(STORAGE_KEYS.pending, emptyPending());
  return {
    upserts: Array.isArray(pending.upserts) ? pending.upserts : [],
    deletes: Array.isArray(pending.deletes) ? pending.deletes : [],
    profile: Boolean(pending.profile)
  };
}

export function savePending(pending) {
  localStorage.setItem(STORAGE_KEYS.pending, JSON.stringify(pending));
}

export function clearLocalData() {
  Object.values(STORAGE_KEYS).forEach(key => localStorage.removeItem(key));
}