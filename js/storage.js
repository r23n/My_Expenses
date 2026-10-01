import { DEFAULT_BUDGET, STORAGE_KEYS } from './config.js';

export function loadExpenses() {
  try {
    const expenses = JSON.parse(localStorage.getItem(STORAGE_KEYS.expenses) || '[]');
    return Array.isArray(expenses) ? expenses.filter(item => item && Number(item.amount) > 0 && item.category && item.description && item.date).map(item => ({ ...item, amount: Number(item.amount), createdAt: item.createdAt || Date.now() })) : [];
  } catch {
    return [];
  }
}

export function saveExpenses(expenses) {
  localStorage.setItem(STORAGE_KEYS.expenses, JSON.stringify(expenses));
}

export function loadBudget() {
  const savedBudget = localStorage.getItem(STORAGE_KEYS.budget);
  return savedBudget === null ? DEFAULT_BUDGET : Number(savedBudget);
}

export function saveBudget(budget) {
  localStorage.setItem(STORAGE_KEYS.budget, String(budget));
}
