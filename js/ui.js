import { CATEGORY_COLORS, CATEGORY_ICONS } from './config.js';
import { categoryLabel, currencyLabel, getLanguage, t } from './i18n.js';

const locale = () => getLanguage() === 'en' ? 'en-BH' : 'ar-BH';
const numberFormat = value => new Intl.NumberFormat(locale(), { minimumFractionDigits: 3, maximumFractionDigits: 3 }).format(value);

export const money = value => `${numberFormat(value)} ${currencyLabel()}`;
export const compactMoney = value => numberFormat(value);
export const dateLabel = value => new Intl.DateTimeFormat(locale(), { day: 'numeric', month: 'short' }).format(new Date(`${value}T12:00:00`));
export const formatToday = date => new Intl.DateTimeFormat(locale(), { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' }).format(date);
export const formatMonth = date => new Intl.DateTimeFormat(locale(), { month: 'long', year: 'numeric' }).format(date);
// نحول علامة التنصيص كمان عشان الوصف ما يكسر خانة aria-label لو فيه "
export const escapeHtml = value => { const div = document.createElement('div'); div.textContent = value; return div.innerHTML.replace(/"/g, '&quot;'); };

export function todayKey(date) {
  // نبني التاريخ من الوقت المحلي، لأن toISOString يحوّل لتوقيت غرينتش فيرجع يوم لورا بعد منتصف الليل في البحرين
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

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
  const budgetAction = document.querySelector('#budgetActionLabel');
  // نحدث مفتاح الترجمة نفسه عشان لو تغيرت اللغة يبقى نفس المعنى
  budgetAction.dataset.i18n = budget > 0 ? 'editBudget' : 'setBudget';
  budgetAction.textContent = t(budgetAction.dataset.i18n);
  if (budget === 0) document.querySelector('#remainingCaption').textContent = t('setBudgetFirst');
  document.querySelector('#dailyAverage').textContent = money(days ? total / days : 0);
}

function categoryColor(category) {
  if (CATEGORY_COLORS[category]) return CATEGORY_COLORS[category];
  const colors = Object.values(CATEGORY_COLORS);
  return colors[category.length % colors.length];
}

export function updateChart(expenses, now, weekOffset = 0) {
  // أسماء الأيام من المتصفح نفسه حسب اللغة، فما نحتاج نكتبها يدوي
  const dayFormat = new Intl.DateTimeFormat(locale(), { weekday: 'long' });
  const { start: weekStart } = getWeekRange(now, weekOffset);
  const values = [];
  for (let index = 0; index < 7; index++) {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + index);
    const key = todayKey(date);
    let value = 0;
    expenses.forEach(item => { if (item.date === key) value += item.amount; });
    values.push({ key, label: dayFormat.format(date), value });
  }
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
  // تصنيف واحد بصيغة المفرد والباقي بالجمع عشان ما يطلع "1 categories"
  const countWord = sorted.length === 1 ? t('categoryOne') : t('categoryMany');
  document.querySelector('#donutTotal').textContent = `${sorted.length} ${countWord}`;
  let progress = 0;
  const stops = sorted.length ? sorted.map(([category, value]) => { const start = progress; progress += value / total * 100; return `${categoryColor(category)} ${start}% ${progress}%`; }).join(',') : '#dce7e3 0 100%';
  document.querySelector('#donutChart').style.background = `conic-gradient(${stops})`;
  document.querySelector('#categoryList').innerHTML = sorted.slice(0, 4).map(([category, value]) => `<div class="category-row"><span class="category-name"><i class="category-dot" style="background:${categoryColor(category)}"></i>${escapeHtml(categoryLabel(category))}</span><strong class="category-amount">${money(value)}</strong></div>`).join('') || `<span style="font-size:11px;color:#9ba7a7">${t('noCategories')}</span>`;
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
  document.querySelector('#topCategory').textContent = topCategory ? categoryLabel(topCategory[0]) : t('noData');
  document.querySelector('#topCategoryAmount').textContent = topCategory ? money(topCategory[1]) : t('addToSee');
  document.querySelector('#topSpendingDay').textContent = topDay ? new Intl.DateTimeFormat(locale(), { weekday: 'long', day: 'numeric', month: 'short' }).format(new Date(`${topDay[0]}T12:00:00`)) : t('noData');
  document.querySelector('#topSpendingDayAmount').textContent = topDay ? money(topDay[1]) : t('addToSee');
}

export function updateTransactions(expenses) {
  // نحول البحث لحروف صغيرة ونبحث في اسم التصنيف المترجم بعد، عشان "food" و "Food" يلقون نفس النتيجة
  const query = document.querySelector('#searchInput').value.trim().toLowerCase();
  const category = document.querySelector('#categoryFilter').value;
  const filtered = expenses.filter(item => {
    if (category !== 'all' && item.category !== category) return false;
    const searchText = `${item.description} ${item.category} ${categoryLabel(item.category)}`.toLowerCase();
    return searchText.includes(query);
  });
  filtered.sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt);
  const filter = document.querySelector('#categoryFilter');
  const customCategories = [...new Set(expenses.map(item => item.category).filter(Boolean))].filter(item => !Object.keys(CATEGORY_COLORS).includes(item));
  customCategories.forEach(item => { if (!filter.querySelector(`option[value="${CSS.escape(item)}"]`)) filter.add(new Option(item, item)); });
  const editWord = t('edit');
  const deleteWord = t('delete');
  document.querySelector('#transactionList').innerHTML = filtered.map(item => `<div class="transaction-row"><div class="transaction-icon" style="background:${categoryColor(item.category)}22;color:${categoryColor(item.category)}">${CATEGORY_ICONS[item.category] || '•'}</div><div class="transaction-main"><strong>${escapeHtml(item.description)}</strong><span>${escapeHtml(categoryLabel(item.category))} · ${dateLabel(item.date)}</span></div><strong class="transaction-amount">− ${money(item.amount)}</strong><button class="transaction-edit" data-action="edit" data-id="${item.id}" type="button" aria-label="${editWord} ${escapeHtml(item.description)}">✎</button><button class="transaction-delete" data-action="delete" data-id="${item.id}" type="button" aria-label="${deleteWord} ${escapeHtml(item.description)}">×</button></div>`).join('');
  document.querySelector('#emptyState').classList.toggle('visible', !filtered.length);
}


function sumByCategory(expenses) {
  const totals = {};
  expenses.forEach(item => { totals[item.category] = (totals[item.category] || 0) + item.amount; });
  return totals;
}

export function updateComparison(thisPeriod, lastPeriod, isSamePeriod) {
  const thisTotal = thisPeriod.reduce((sum, item) => sum + item.amount, 0);
  const lastTotal = lastPeriod.reduce((sum, item) => sum + item.amount, 0);
  const valueElement = document.querySelector('#compareValue');
  const noteElement = document.querySelector('#compareNote');
  const categoryElement = document.querySelector('#compareCategory');
  valueElement.classList.remove('up', 'down');
  if (lastTotal === 0) {
    valueElement.textContent = '—';
    noteElement.textContent = t('noLastMonth');
    categoryElement.textContent = '';
    return;
  }
  const percent = Math.round((thisTotal - lastTotal) / lastTotal * 100);
  valueElement.textContent = `${percent > 0 ? '+' : ''}${percent}%`;
  if (percent > 0) valueElement.classList.add('up');
  if (percent < 0) valueElement.classList.add('down');
  const periodWord = isSamePeriod ? t('samePeriodLastMonth') : t('lastMonthTotal');
  noteElement.textContent = `${periodWord}: ${money(lastTotal)}`;

  const thisTotals = sumByCategory(thisPeriod);
  const lastTotals = sumByCategory(lastPeriod);
  let biggestCategory = '';
  let biggestDifference = 0;
  Object.keys(thisTotals).forEach(category => {
    const difference = thisTotals[category] - (lastTotals[category] || 0);
    if (difference > biggestDifference) {
      biggestDifference = difference;
      biggestCategory = category;
    }
  });
  categoryElement.textContent = biggestCategory ? `${t('biggestIncrease')}: ${categoryLabel(biggestCategory)} (+${money(biggestDifference)})` : '';
}

export function updateRecurringList(rules) {
  const list = document.querySelector('#recurringList');
  if (!rules.length) {
    list.innerHTML = `<p class="recurring-empty">${t('recurringEmpty')}</p>`;
    return;
  }
  list.innerHTML = rules.map(rule => `<div class="recurring-row"><div><strong>${escapeHtml(rule.description)}</strong><span>${escapeHtml(categoryLabel(rule.category))} · ${t('dayOfMonth')} ${rule.day}</span></div><strong>${money(rule.amount)}</strong><button class="transaction-delete" data-rule-id="${rule.id}" type="button" aria-label="${t('stopRecurring')} ${escapeHtml(rule.description)}" title="${t('stopRecurring')}">×</button></div>`).join('');
}