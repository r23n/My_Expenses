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

function toRow(userId, item) {
  return { id: item.id, user_id: userId, amount: item.amount, category: item.category, description: item.description, expense_date: item.date, created_at: new Date(item.createdAt || Date.now()).toISOString() };
}

export async function loadCloudData(userId) {
  if (!supabase) return null;
  const [expensesResult, profileResult] = await Promise.all([
    supabase.from('expenses').select('*').eq('user_id', userId).order('expense_date', { ascending: false }),
    supabase.from('profiles').select('budget, budgets, recurring').eq('id', userId).maybeSingle()
  ]);
  if (expensesResult.error) throw expensesResult.error;
  if (profileResult.error) {
    // نطبع الرد كامل عشان لو نسيت تشغّل ملف SQL الجديد يبان السبب بوضوح في الـ Console
    console.error('profiles error (did you run supabase_update_v4.sql?)', profileResult.error);
    throw profileResult.error;
  }
  const profile = profileResult.data || {};
  return {
    expenses: expensesResult.data.map(item => ({ id: item.id, amount: Number(item.amount), category: item.category, description: item.description, date: item.expense_date, createdAt: new Date(item.created_at).getTime() })),
    budgets: profile.budgets || {},
    recurring: profile.recurring || [],
    legacyBudget: Number(profile.budget || 0)
  };
}

// نرفع المصاريف اللي تغيرت بس بدل كل القائمة، عشان الحفظ يبقى سريع حتى مع مئات المصاريف
export async function upsertCloudExpenses(userId, expenses) {
  if (!supabase || !expenses.length) return;
  const rows = expenses.map(item => toRow(userId, item));
  const { error } = await supabase.from('expenses').upsert(rows, { onConflict: 'id' });
  if (error) throw error;
}

export async function deleteCloudExpenses(userId, ids) {
  if (!supabase || !ids.length) return;
  const { error } = await supabase.from('expenses').delete().in('id', ids).eq('user_id', userId);
  if (error) throw error;
}

export async function saveCloudProfile(userId, budgets, recurring) {
  if (!supabase) return;
  const { error } = await supabase.from('profiles').upsert({ id: userId, budgets, recurring }, { onConflict: 'id' });
  if (error) throw error;
}