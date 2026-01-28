"use client";

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://tpmzugakgpwvrtusxsyf.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRwbXp1Z2FrZ3B3dnJ0dXN4c3lmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkxNDQwNTYsImV4cCI6MjA4NDcyMDA1Nn0.g1IjAH56w_GwtSKHSrhZxNyJGK0XWY1Vbyz3HW643MU';

export const supabaseBrowser = createClient(supabaseUrl, supabaseKey);
