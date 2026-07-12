// src/api.js
// Simple wrapper functions around Supabase for the app.
import { supabase } from "./supabase.js";

/** Add a new parent (signup) */
export const addParent = async ({ email, password, phone }) => {
  // Insert parent record (you may also store hashed password or rely on Supabase Auth)
  const { data, error } = await supabase.from('parents').insert([
    { email, password, phone }
  ]);
  if (error) throw error;
  // Optionally sign up with Supabase Auth (email/password)
  const { user, error: authError } = await supabase.auth.signUp({ email, password });
  if (authError) throw authError;
  return data;
};

/** Sign in with email/password */
export const signIn = async ({ email, password }) => {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
};

/** Sign in with Google */
export const signInWithGoogle = async () => {
  const { data, error } = await supabase.auth.signInWithOAuth({ provider: 'google' });
  if (error) throw error;
  return data;
};

/** Generic insert for other tables */
export const insertRecord = async (table, record) => {
  const { data, error } = await supabase.from(table).insert([record]);
  if (error) throw error;
  return data;
};

export const getTable = async (table) => {
  const { data, error } = await supabase.from(table).select('*');
  if (error) throw error;
  return data;
};
