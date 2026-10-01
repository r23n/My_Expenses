const translations = {
  ar: {
    brandTagline: 'مصاريفك بوضوح', overview: 'نظرة عامة', expenses: 'المصروفات', insights: 'التحليلات', syncReady: 'جاهز للمزامنة', localOnly: 'محفوظ على هذا الجهاز', signInSync: 'تسجيل الدخول للمزامنة', signOut: 'تسجيل الخروج', todayIntro: 'صباحك أوضح،', todayAccent: 'ومصاريفك أهدأ.', tracking: 'تتابع الآن', monthlyBudget: 'ميزانية الشهر', setBudget: 'تحديد الميزانية', editBudget: 'تعديل الميزانية', totalSpent: 'إجمالي المصروف', remaining: 'المتبقي من الميزانية', dailyAverage: 'متوسط الصرف اليومي', daysRecorded: 'خلال الأيام المسجلة', inPlan: 'أنت داخل خطتك', overBudget: 'تجاوزت الميزانية', setBudgetFirst: 'حدد ميزانيتك أولاً', firstExpense: 'سجّل أول مصروف لك اليوم', transactionsCount: 'عملية مسجلة هذا الشهر', spendingRhythm: 'إيقاع الصرف', weekExpenses: 'مصروفات الأسبوع', thisWeek: 'هذا الأسبوع', previousWeek: 'الأسبوع السابق', nextWeek: 'الأسبوع التالي', spendingDistribution: 'توزيع الإنفاق', whereMoneyGoes: 'أين تذهب فلوسك؟', noCategories: 'ستظهر التصنيفات هنا بعد الإضافة', monthlyReport: 'تقرير الشهر', topCategory: 'أعلى تصنيف صرف', topDay: 'أعلى يوم صرف', addToSee: 'أضف مصروفات لتظهر النتيجة', activity: 'سجل نشاطك', latestExpenses: 'آخر المصروفات', export: 'تصدير', import: 'استيراد', allCategories: 'كل التصنيفات', search: 'ابحث في المصروفات...', noExpenses: 'لا توجد مصروفات هنا', startTracking: 'أضف أول مصروف وابدأ تتابع عاداتك المالية.', addExpense: 'إضافة مصروف', newExpense: 'مصروف جديد', editExpense: 'تعديل مصروف', recordExpense: 'سجّل عملية صرف', editExpenseDetails: 'عدّل تفاصيل الصرف', controlNote: 'أنت تتحكم بالمبلغ والتصنيف والتاريخ.', amount: 'المبلغ', expenseType: 'نوع الصرف', customType: 'اكتب نوع الصرف', description: 'وصف مختصر', date: 'التاريخ', saveExpense: 'حفظ المصروف', saveEdit: 'حفظ التعديل', customOption: 'نوع مخصص...', settings: 'الإعدادات', userSettings: 'إعدادات المستخدم', displayName: 'اسم العرض', language: 'اللغة', arabic: 'العربية', english: 'English', saveSettings: 'حفظ الإعدادات', close: 'إغلاق', secureSync: 'مزامنة آمنة', loginTitle: 'سجّل دخولك', loginNote: 'استخدم نفس الحساب على الجوال والكمبيوتر.'
  },
  en: {
    brandTagline: 'Your spending, clearly', overview: 'Overview', expenses: 'Expenses', insights: 'Insights', syncReady: 'Ready to sync', localOnly: 'Saved on this device', signInSync: 'Sign in to sync', signOut: 'Sign out', todayIntro: 'A clearer morning,', todayAccent: 'a calmer budget.', tracking: 'Tracking', monthlyBudget: 'Monthly budget', setBudget: 'Set budget', editBudget: 'Edit budget', totalSpent: 'Total spent', remaining: 'Budget remaining', dailyAverage: 'Daily average', daysRecorded: 'Across recorded days', inPlan: 'Within your plan', overBudget: 'Over budget', setBudgetFirst: 'Set your budget first', firstExpense: 'Record your first expense today', transactionsCount: 'expenses recorded this month', spendingRhythm: 'Spending rhythm', weekExpenses: 'Weekly expenses', thisWeek: 'This week', previousWeek: 'Previous week', nextWeek: 'Next week', spendingDistribution: 'Spending split', whereMoneyGoes: 'Where does it go?', noCategories: 'Categories will appear here', monthlyReport: 'Monthly report', topCategory: 'Top spending category', topDay: 'Highest spending day', addToSee: 'Add expenses to see the result', activity: 'Your activity', latestExpenses: 'Latest expenses', export: 'Export', import: 'Import', allCategories: 'All categories', search: 'Search expenses...', noExpenses: 'No expenses here', startTracking: 'Add your first expense and start tracking your habits.', addExpense: 'Add expense', newExpense: 'New expense', editExpense: 'Edit expense', recordExpense: 'Record an expense', editExpenseDetails: 'Edit expense details', controlNote: 'You control the amount, category, and date.', amount: 'Amount', expenseType: 'Expense type', customType: 'Enter expense type', description: 'Short description', date: 'Date', saveExpense: 'Save expense', saveEdit: 'Save changes', customOption: 'Custom type...', settings: 'Settings', userSettings: 'User settings', displayName: 'Display name', language: 'Language', arabic: 'العربية', english: 'English', saveSettings: 'Save settings', close: 'Close', secureSync: 'Secure sync', loginTitle: 'Sign in', loginNote: 'Use the same account on your phone and computer.'
  }
};

export function getLanguage() {
  return localStorage.getItem('sarfati-language') || 'ar';
}

export function saveLanguage(language) {
  localStorage.setItem('sarfati-language', language);
}

export function getDisplayName() {
  return localStorage.getItem('sarfati-display-name') || '';
}

export function saveDisplayName(name) {
  localStorage.setItem('sarfati-display-name', name.trim());
}

export function getEnglishDisplayName() {
  return localStorage.getItem('sarfati-display-name-en') || '';
}

export function saveEnglishDisplayName(name) {
  localStorage.setItem('sarfati-display-name-en', name.trim());
}

export function transliterateArabic(value) {
  const letters = { ا: 'a', أ: 'a', إ: 'i', آ: 'a', ب: 'b', ت: 't', ث: 'th', ج: 'j', ح: 'h', خ: 'kh', د: 'd', ذ: 'dh', ر: 'r', ز: 'z', س: 's', ش: 'sh', ص: 's', ض: 'd', ط: 't', ظ: 'z', ع: 'a', غ: 'gh', ف: 'f', ق: 'q', ك: 'k', ل: 'l', م: 'm', ن: 'n', ه: 'h', و: 'w', ي: 'y', ى: 'a', ة: 'a' };
  return [...value].map(letter => letters[letter] || letter).join('').replace(/\s+/g, ' ').trim();
}

export function t(key, language = getLanguage()) {
  return translations[language]?.[key] || translations.ar[key] || key;
}

export function currencyLabel(language = getLanguage()) {
  return language === 'en' ? 'BHD' : 'د.ب';
}
