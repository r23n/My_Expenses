import { CATEGORY_COLORS, CATEGORY_ICONS, CURRENCY_LABEL } from './config.js';
import { currencyLabel, getLanguage, t } from './i18n.js';

const locale = () => getLanguage() === 'en' ? 'en-BH' : 'ar-BH';
const numberFormat = value => new Intl.NumberFormat(locale(), { minimumFractionDigits: 3, maximumFractionDigits: 3 }).format(value);

export const money = value => `${numberFormat(value)} ${currencyLabel()}`;
export const compactMoney = value => numberFormat(value);
export const dateLabel = value => new Intl.DateTimeFormat(locale(), { day: 'numeric', month: 'short' }).format(new Date(`${value}T12:00:00`));
export const formatToday = date => new Intl.DateTimeFormat(locale(), { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: 'numeric', minute: '2-digit' }).format(date);
export const formatMonth = date => new Intl.DateTimeFormat(locale(), { month: 'long', year: 'numeric' }).format(date);
export const todayKey = date => date.toISOString().slice(0, 10);
export const escapeHtml = value => { const div = document.createElement('div'); div.textContent = value; return div.innerHTML; };

export function getWeekRange(date, offset = 0) {
  const start = new Date(date);
  start.setDate(date.getDate() - ((date.getDay() + 1) % 7) + offset * 7);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return { start, end };
}

export function formatWeekRange(start, end) {
  const rangeFormat = new Intl.DateTimeFormat(locale(), { day: 'numeric', month: 'short' });
  return `${rangeFormat.format(start)} - ${rangeFormat.format(end)}`;
}

export function updateSummary(expenses, budget) {
  const total = expenses.reduce((sum, item) => sum + item.amount, 0);
  const remaining = budget - total;
  const days = new Set(expenses.map(item => item.date)).size;
  document.querySelector('#totalSpent').textContent = money(total);
  document.querySelector('#remainingBudget').textContent = money(Math.max(remaining, 0));
  document.querySelector('#remainingCaption').textContent = remaining >= 0 ? t('inPlan') : t('overBudget');
  document.querySelector('#remainingCaption').classList.toggle('positive', remaining >= 0);
  document.querySelector('#spentCaption').textContent = total ? `${expenses.length} ${t('transactionsCount')}` : t('firstExpense');
  document.querySelector('#budgetLabel').textContent = money(budget);
  document.querySelector('#budgetProgress').style.width = budget > 0 ? `${Math.min(total / budget * 100, 100)}%` : '0%';
  document.querySelector('#budgetActionLabel').textContent = budget > 0 ? t('editBudget') : t('setBudget');
  if (budget === 0) document.querySelector('#remainingCaption').textContent = t('setBudgetFirst');
  document.querySelector('#dailyAverage').textContent = money(days ? total / days : 0);
}

function categoryColor(category) {
  if (CATEGORY_COLORS[category]) return CATEGORY_COLORS[category];
  const colors = Object.values(CATEGORY_COLORS);
  return colors[category.length % colors.length];
}

function categoryLabel(category) {
  if (getLanguage() !== 'en') return category;
  const labels = { طعام: 'Food & drinks', مواصلات: 'Transport', تسوق: 'Shopping', فواتير: 'Bills', ترفيه: 'Entertainment', أخرى: 'Other' };
  return labels[category] || category;
}

export function updateChart(expenses, now, weekOffset = 0) {
  const labels = getLanguage() === 'en' ? ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] : ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
  const { start: weekStart } = getWeekRange(now, weekOffset);
  const values = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + index);
    const key = todayKey(date);
    return { key, label: labels[date.getDay()], value: expenses.filter(item => item.date === key).reduce((sum, item) => sum + item.amount, 0) };
  });
  const max = Math.max(...values.map(item => item.value), 1);
  document.querySelector('#weeklyChart').innerHTML = values.map(item => `<div class="chart-bar ${weekOffset === 0 && item.key === todayKey(now) ? 'today' : ''}" style="height:${Math.max(item.value / max * 100, 3)}%" data-value="${compactMoney(item.value)}" data-currency="${currencyLabel()}"></div>`).join('');
  document.querySelector('#chartDays').innerHTML = values.map(item => `<span>${item.label}</span>`).join('');
}

export function updateCategories(expenses) {
  const totals = {};
  expenses.forEach(item => { totals[item.category] = (totals[item.category] || 0) + item.amount; });
  const sorted = Object.entries(totals).sort((a, b) => b[1] - a[1]);
  const total = sorted.reduce((sum, [, value]) => sum + value, 0);
  document.querySelector('#donutCenter').textContent = compactMoney(total);
  document.querySelector('#donutTotal').textContent = getLanguage() === 'en' ? `${sorted.length} categories` : `${sorted.length} تصنيفات`;
  let progress = 0;
  const stops = sorted.length ? sorted.map(([category, value]) => { const start = progress; progress += value / total * 100; return `${categoryColor(category)} ${start}% ${progress}%`; }).join(',') : '#dce7e3 0 100%';
  document.querySelector('#donutChart').style.background = `conic-gradient(${stops})`;
  document.querySelector('#categoryList').innerHTML = sorted.slice(0, 4).map(([category, value]) => `<div class="category-row"><span class="category-name"><i class="category-dot" style="background:${categoryColor(category)}"></i>${categoryLabel(category)}</span><strong class="category-amount">${money(value)}</strong></div>`).join('') || `<span style="font-size:11px;color:#9ba7a7">${t('noCategories')}</span>`;
}

export function updateReports(expenses) {
  const categoryTotals = {};
  const dayTotals = {};
  expenses.forEach(item => {
    if (!item?.category || !item.date) return;
    categoryTotals[item.category] = (categoryTotals[item.category] || 0) + item.amount;
    dayTotals[item.date] = (dayTotals[item.date] || 0) + item.amount;
  });
  const topCategory = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])[0];
  const topDay = Object.entries(dayTotals).sort((a, b) => b[1] - a[1])[0];
  document.querySelector('#topCategory').textContent = topCategory ? categoryLabel(topCategory[0]) : t('noExpenses');
  document.querySelector('#topCategoryAmount').textContent = topCategory ? money(topCategory[1]) : t('addToSee');
  document.querySelector('#topSpendingDay').textContent = topDay ? new Intl.DateTimeFormat(locale(), { weekday: 'long', day: 'numeric', month: 'short' }).format(new Date(`${topDay[0]}T12:00:00`)) : t('noExpenses');
  document.querySelector('#topSpendingDayAmount').textContent = topDay ? money(topDay[1]) : t('addToSee');
}

export function updateTransactions(expenses) {
  const query = document.querySelector('#searchInput').value.trim();
  const category = document.querySelector('#categoryFilter').value;
  const filtered = expenses.filter(item => (category === 'all' || item.category === category) && `${item.description} ${item.category}`.includes(query)).sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt);
  const list = document.querySelector('#transactionList');
  const knownCategories = [...new Set(expenses.map(item => item.category).filter(Boolean))].filter(item => !Object.keys(CATEGORY_COLORS).includes(item));
  const filter = document.querySelector('#categoryFilter');
  knownCategories.forEach(item => { if (!filter.querySelector(`option[value="${CSS.escape(item)}"]`)) filter.add(new Option(item, item)); });
  list.innerHTML = filtered.map(item => `<div class="transaction-row"><div class="transaction-icon" style="background:${categoryColor(item.category)}22;color:${categoryColor(item.category)}">${CATEGORY_ICONS[item.category] || '•'}</div><div class="transaction-main"><strong>${escapeHtml(item.description)}</strong><span>${categoryLabel(item.category)} · ${dateLabel(item.date)}</span></div><strong class="transaction-amount">− ${money(item.amount)}</strong><button class="transaction-edit" data-action="edit" data-id="${item.id}" type="button" aria-label="${getLanguage() === 'en' ? 'Edit' : 'تعديل'} ${escapeHtml(item.description)}">✎</button><button class="transaction-delete" data-action="delete" data-id="${item.id}" type="button" aria-label="${getLanguage() === 'en' ? 'Delete' : 'حذف'} ${escapeHtml(item.description)}">×</button></div>`).join('');
  document.querySelector('#emptyState').classList.toggle('visible', !filtered.length);
  return list.querySelectorAll('[data-action]');
}
