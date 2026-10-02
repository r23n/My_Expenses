import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { SUPABASE_ANON_KEY, SUPABASE_URL } from './cloud-config.js';

export const cloudEnabled = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
export const supabase = cloudEnabled ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

export async function getCloudSession() {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session;
}

export async function signIn(email, password) {
  if (!supabase) throw new Error('cloud_not_configured');
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data.session;
}

export async function signUp(email, password) {
  if (!supabase) throw new Error('cloud_not_configured');
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;
  return data.session;
}

export async function signOut() {
  if (supabase) await supabase.auth.signOut();
}

export async function loadCloudData(userId) {
  if (!supabase) return null;
  const [expensesResult, profileResult] = await Promise.all([
    supabase.from('expenses').select('*').eq('user_id', userId).order('expense_date', { ascending: false }),
    supabase.from('profiles').select('budget').eq('id', userId).maybeSingle()
  ]);
  if (expensesResult.error) throw expensesResult.error;
  if (profileResult.error) throw profileResult.error;
  return {
    expenses: expensesResult.data.map(item => ({ id: item.id, amount: Number(item.amount), category: item.category, description: item.description, date: item.expense_date, createdAt: new Date(item.created_at).getTime() })),
    budget: Number(profileResult.data?.budget || 0)
  };
}

export async function saveCloudData(userId, expenses, budget) {
  if (!supabase) return;
  const profileResult = await supabase.from('profiles').upsert({ id: userId, budget }, { onConflict: 'id' });
  if (profileResult.error) throw profileResult.error;
  const rows = expenses.map(item => ({ id: item.id, user_id: userId, amount: item.amount, category: item.category, description: item.description, expense_date: item.date, created_at: new Date(item.createdAt || Date.now()).toISOString() }));
  if (rows.length) {
    const expensesResult = await supabase.from('expenses').upsert(rows, { onConflict: 'id' });
    if (expensesResult.error) throw expensesResult.error;
  }
}

// الحفظ يرفع المصاريف الموجودة بس، فالمحذوف لازم ينحذف من السحابة بطلب خاص، وإلا يرجع يطلع بعد تسجيل الدخول
export async function deleteCloudExpense(userId, expenseId) {
  if (!supabase) return;
  const { error } = await supabase.from('expenses').delete().eq('id', expenseId).eq('user_id', userId);
  if (error) throw error;
}