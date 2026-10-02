// كل نصوص الواجهة هنا في مكان واحد، وأي نص جديد نضيف له سطر بالعربي وسطر بالإنجليزي
const translations = {
  ar: {
    pageTitle: 'مصاريفي | مصاريفي اليومية',
    appName: 'مصاريفي',
    brandTagline: 'مصاريفك بوضوح',
    mainNav: 'التنقل الرئيسي',
    overview: 'نظرة عامة',
    expenses: 'المصروفات',
    insights: 'التحليلات',
    settings: 'الإعدادات',
    openMenu: 'فتح القائمة',
    close: 'إغلاق',
    currency: 'د.ب',
    localOnly: 'محفوظ على هذا الجهاز',
    syncReady: 'جاهز للمزامنة',
    syncedAs: 'متزامن:',
    cloudFailed: 'تعذر تحديث السحابة',
    addSupabaseFirst: 'أضف إعدادات Supabase أولًا',
    signInSync: 'تسجيل الدخول للمزامنة',
    signOut: 'تسجيل الخروج',
    signOutFailed: 'ما قدرنا نحفظ آخر تعديلاتك في السحابة. تأكد من الإنترنت وجرّب تسجيل الخروج مرة ثانية.',
    dataLocal: 'بياناتك محفوظة على جهازك',
    hello: 'مرحبا',
    addExpense: 'إضافة مصروف',
    currentMonth: 'الشهر الحالي',
    tracking: 'تتابع الآن',
    monthlyBudget: 'ميزانية الشهر',
    setBudget: 'تحديد الميزانية',
    editBudget: 'تعديل الميزانية',
    summary: 'ملخص المصاريف',
    totalSpent: 'إجمالي المصروف',
    remaining: 'المتبقي من الميزانية',
    dailyAverage: 'متوسط الصرف اليومي',
    daysRecorded: 'خلال الأيام المسجلة',
    inPlan: 'أنت داخل خطتك',
    overBudget: 'تجاوزت الميزانية',
    setBudgetFirst: 'حدد ميزانيتك أولاً',
    firstExpense: 'سجّل أول مصروف لك اليوم',
    transactionsCount: 'عملية مسجلة هذا الشهر',
    spendingRhythm: 'إيقاع الصرف',
    weekExpenses: 'مصروفات الأسبوع',
    thisWeek: 'هذا الأسبوع',
    previousWeek: 'الأسبوع السابق',
    nextWeek: 'الأسبوع التالي',
    spendingDistribution: 'توزيع الإنفاق',
    whereMoneyGoes: 'أين تذهب فلوسك؟',
    noCategories: 'ستظهر التصنيفات هنا بعد الإضافة',
    categoryOne: 'تصنيف',
    categoryMany: 'تصنيفات',
    monthlyReport: 'تقرير الشهر',
    topCategory: 'أعلى تصنيف صرف',
    topDay: 'أعلى يوم صرف',
    noData: 'لا توجد بيانات',
    addToSee: 'أضف مصروفات لتظهر النتيجة',
    activity: 'سجل نشاطك',
    latestExpenses: 'آخر المصروفات',
    showAll: 'عرض الكل',
    search: 'ابحث في المصروفات...',
    month: 'الشهر',
    filterByCategory: 'تصفية حسب التصنيف',
    allCategories: 'كل التصنيفات',
    catFood: 'طعام ومشروبات',
    catTransport: 'مواصلات',
    catShopping: 'تسوق',
    catBills: 'فواتير',
    catFun: 'ترفيه',
    catOther: 'أخرى',
    customOption: 'نوع مخصص...',
    noExpenses: 'لا توجد مصروفات هنا',
    startTracking: 'أضف أول مصروف وابدأ تتابع عاداتك المالية.',
    edit: 'تعديل',
    delete: 'حذف',
    expenseDeleted: 'انحذف المصروف',
    undo: 'تراجع',
    offlineSaved: 'محفوظ على الجهاز، بيرتفع لما يرجع النت',
    repeatMonthly: 'كرره كل شهر بنفس اليوم',
    recurringTitle: 'المصاريف المتكررة',
    recurringEmpty: 'ما عندك مصاريف متكررة. فعّل «كرره كل شهر» وأنت تضيف مصروف.',
    stopRecurring: 'إيقاف التكرار',
    dayOfMonth: 'يوم',
    compareTitle: 'مقارنة بالشهر الماضي',
    samePeriodLastMonth: 'نفس الفترة من الشهر الماضي',
    lastMonthTotal: 'الشهر الماضي',
    noLastMonth: 'ما في مصاريف مسجلة للشهر الماضي',
    biggestIncrease: 'أكثر زيادة',
    gateTitle: 'سجّل دخولك للمتابعة',
    gateMessage: 'يجب تسجيل الدخول لاستخدام النظام وحفظ مصاريفك بأمان.',
    signIn: 'تسجيل الدخول',
    newExpense: 'مصروف جديد',
    editExpense: 'تعديل مصروف',
    recordExpense: 'سجّل عملية صرف',
    editExpenseDetails: 'عدّل تفاصيل الصرف',
    controlNote: 'أنت تتحكم بالمبلغ والتصنيف والتاريخ.',
    amount: 'المبلغ',
    expenseType: 'نوع الصرف',
    customType: 'اكتب نوع الصرف',
    description: 'وصف مختصر',
    date: 'التاريخ',
    saveExpense: 'حفظ المصروف',
    saveEdit: 'حفظ التعديل',
    budgetKicker: 'ميزانيتك الشهرية',
    budgetTitle: 'حدد المبلغ الذي يناسبك',
    budgetNote: 'يمكنك تغييره في أي وقت.',
    saveBudget: 'حفظ الميزانية',
    secureSync: 'مزامنة آمنة',
    loginTitle: 'سجّل دخولك',
    signupTitle: 'أنشئ حسابك',
    loginNote: 'استخدم نفس الحساب على الجوال والكمبيوتر.',
    signupNote: 'استخدم بريدك وكلمة مرور من 6 أحرف أو أكثر.',
    email: 'البريد الإلكتروني',
    password: 'كلمة المرور',
    createAccount: 'إنشاء حساب',
    createNewAccount: 'إنشاء حساب جديد',
    haveAccount: 'لديك حساب؟ سجّل الدخول',
    accountCreated: 'تم إنشاء الحساب. افتح بريدك لتأكيده ثم سجّل الدخول.',
    errAlreadyRegistered: 'هذا البريد مسجل مسبقًا. استخدم تسجيل الدخول.',
    errPassword: 'كلمة المرور يجب أن تكون 6 أحرف أو أكثر.',
    errInvalidLogin: 'البريد أو كلمة المرور غير صحيحة.',
    errSignupDisabled: 'إنشاء الحسابات معطل من إعدادات Supabase.',
    errEmail: 'تأكد من كتابة بريد إلكتروني صحيح.',
    errGeneric: 'تعذر إكمال الطلب. تحقق من اتصال الإنترنت.',
    userSettings: 'إعدادات المستخدم',
    settingsNote: 'خصص طريقة ظهور النظام لك.',
    displayName: 'اسم العرض',
    displayNamePlaceholder: 'مثال: أحمد',
    language: 'اللغة',
    saveSettings: 'حفظ الإعدادات'
  },
  en: {
    pageTitle: 'My Expenses | Daily spending',
    appName: 'My Expenses',
    brandTagline: 'Your spending, clearly',
    mainNav: 'Main navigation',
    overview: 'Overview',
    expenses: 'Expenses',
    insights: 'Insights',
    settings: 'Settings',
    openMenu: 'Open menu',
    close: 'Close',
    currency: 'BHD',
    localOnly: 'Saved on this device',
    syncReady: 'Ready to sync',
    syncedAs: 'Synced:',
    cloudFailed: 'Cloud update failed',
    addSupabaseFirst: 'Add Supabase settings first',
    signInSync: 'Sign in to sync',
    signOut: 'Sign out',
    signOutFailed: 'We could not save your latest changes to the cloud. Check your internet and try signing out again.',
    dataLocal: 'Your data is stored locally',
    hello: 'Hi',
    addExpense: 'Add expense',
    currentMonth: 'Current month',
    tracking: 'Tracking',
    monthlyBudget: 'Monthly budget',
    setBudget: 'Set budget',
    editBudget: 'Edit budget',
    summary: 'Spending summary',
    totalSpent: 'Total spent',
    remaining: 'Budget remaining',
    dailyAverage: 'Daily average',
    daysRecorded: 'Across recorded days',
    inPlan: 'Within your plan',
    overBudget: 'Over budget',
    setBudgetFirst: 'Set your budget first',
    firstExpense: 'Record your first expense today',
    transactionsCount: 'expenses recorded this month',
    spendingRhythm: 'Spending rhythm',
    weekExpenses: 'Weekly expenses',
    thisWeek: 'This week',
    previousWeek: 'Previous week',
    nextWeek: 'Next week',
    spendingDistribution: 'Spending split',
    whereMoneyGoes: 'Where does it go?',
    noCategories: 'Categories will appear here',
    categoryOne: 'category',
    categoryMany: 'categories',
    monthlyReport: 'Monthly report',
    topCategory: 'Top spending category',
    topDay: 'Highest spending day',
    noData: 'No data yet',
    addToSee: 'Add expenses to see the result',
    activity: 'Your activity',
    latestExpenses: 'Latest expenses',
    showAll: 'Show all',
    search: 'Search expenses...',
    month: 'Month',
    filterByCategory: 'Filter by category',
    allCategories: 'All categories',
    catFood: 'Food & drinks',
    catTransport: 'Transport',
    catShopping: 'Shopping',
    catBills: 'Bills',
    catFun: 'Entertainment',
    catOther: 'Other',
    customOption: 'Custom type...',
    noExpenses: 'No expenses here',
    startTracking: 'Add your first expense and start tracking your habits.',
    edit: 'Edit',
    delete: 'Delete',
    expenseDeleted: 'Expense deleted',
    undo: 'Undo',
    offlineSaved: 'Saved on device, will upload when online',
    repeatMonthly: 'Repeat every month on the same day',
    recurringTitle: 'Recurring expenses',
    recurringEmpty: 'No recurring expenses yet. Turn on "Repeat every month" when adding an expense.',
    stopRecurring: 'Stop repeating',
    dayOfMonth: 'Day',
    compareTitle: 'Compared to last month',
    samePeriodLastMonth: 'Same period last month',
    lastMonthTotal: 'Last month',
    noLastMonth: 'No expenses recorded last month',
    biggestIncrease: 'Biggest increase',
    gateTitle: 'Sign in to continue',
    gateMessage: 'Sign in is required to use the system and keep your expenses secure.',
    signIn: 'Sign in',
    newExpense: 'New expense',
    editExpense: 'Edit expense',
    recordExpense: 'Record an expense',
    editExpenseDetails: 'Edit expense details',
    controlNote: 'You control the amount, category, and date.',
    amount: 'Amount',
    expenseType: 'Expense type',
    customType: 'Enter expense type',
    description: 'Short description',
    date: 'Date',
    saveExpense: 'Save expense',
    saveEdit: 'Save changes',
    budgetKicker: 'Your monthly budget',
    budgetTitle: 'Set the amount that works for you',
    budgetNote: 'You can change it at any time.',
    saveBudget: 'Save budget',
    secureSync: 'Secure sync',
    loginTitle: 'Sign in',
    signupTitle: 'Create your account',
    loginNote: 'Use the same account on your phone and computer.',
    signupNote: 'Use an email and a password of 6 characters or more.',
    email: 'Email address',
    password: 'Password',
    createAccount: 'Create account',
    createNewAccount: 'Create a new account',
    haveAccount: 'Already have an account? Sign in',
    accountCreated: 'Account created. Check your email to confirm it, then sign in.',
    errAlreadyRegistered: 'This email is already registered. Please sign in.',
    errPassword: 'Password must be 6 characters or more.',
    errInvalidLogin: 'Email or password is incorrect.',
    errSignupDisabled: 'Sign up is disabled in Supabase settings.',
    errEmail: 'Please enter a valid email address.',
    errGeneric: 'Something went wrong. Check your internet connection.',
    userSettings: 'User settings',
    settingsNote: 'Customize how the system appears to you.',
    displayName: 'Display name',
    displayNamePlaceholder: 'Example: Ahmed',
    language: 'Language',
    saveSettings: 'Save settings'
  }
};

// التصنيفات تنحفظ بالعربي في قاعدة البيانات، فنربط كل قيمة بمفتاح ترجمة عشان تنعرض بلغة المستخدم بدون ما نغير البيانات القديمة
const CATEGORY_KEYS = {
  طعام: 'catFood',
  مواصلات: 'catTransport',
  تسوق: 'catShopping',
  فواتير: 'catBills',
  ترفيه: 'catFun',
  أخرى: 'catOther'
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

export function t(key, language = getLanguage()) {
  const languageTexts = translations[language] || translations.ar;
  if (languageTexts[key] !== undefined) return languageTexts[key];
  // لو المفتاح ناقص نرجع العربي بدل ما يطلع undefined للمستخدم، وننبه المطور في الـ Console
  console.warn(`Missing translation: "${key}" (${language})`);
  if (translations.ar[key] !== undefined) return translations.ar[key];
  return key;
}

export function currencyLabel() {
  return t('currency');
}

export function categoryLabel(category) {
  const key = CATEGORY_KEYS[category];
  // التصنيف المخصص اللي كتبه المستخدم بنفسه نعرضه زي ما كتبه
  if (!key) return category;
  return t(key);
}

// تمر على الصفحة كلها وتترجم أي عنصر عليه علامة ترجمة، عشان ما نحتاج نترجم كل عنصر بسطر خاص فيه
export function applyTranslations() {
  document.querySelectorAll('[data-i18n]').forEach(element => {
    element.textContent = t(element.dataset.i18n);
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
    element.placeholder = t(element.dataset.i18nPlaceholder);
  });
  document.querySelectorAll('[data-i18n-aria]').forEach(element => {
    element.setAttribute('aria-label', t(element.dataset.i18nAria));
  });
}

// فحص للمطور فقط: يطبع في الـ Console أي مفتاح موجود بلغة وناقص بالثانية، أو مستخدم في الصفحة وما له ترجمة
export function checkTranslations() {
  const arabicKeys = Object.keys(translations.ar);
  const englishKeys = Object.keys(translations.en);
  arabicKeys.forEach(key => {
    if (!englishKeys.includes(key)) console.warn(`Missing English translation: "${key}"`);
  });
  englishKeys.forEach(key => {
    if (!arabicKeys.includes(key)) console.warn(`Missing Arabic translation: "${key}"`);
  });
  const usedKeys = [];
  document.querySelectorAll('[data-i18n]').forEach(element => usedKeys.push(element.dataset.i18n));
  document.querySelectorAll('[data-i18n-placeholder]').forEach(element => usedKeys.push(element.dataset.i18nPlaceholder));
  document.querySelectorAll('[data-i18n-aria]').forEach(element => usedKeys.push(element.dataset.i18nAria));
  usedKeys.forEach(key => {
    if (!arabicKeys.includes(key)) console.warn(`Key used in HTML but not translated: "${key}"`);
  });
}