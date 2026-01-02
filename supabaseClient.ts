
import { createClient } from '@supabase/supabase-js';

// INSERISCI QUI LE TUE CHIAVI DI SUPABASE
const SUPABASE_URL = 'https://vkcqbcglkvvmkkugtvtd.supabase.co'; 
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZrY3FiY2dsa3Z2bWtrdWd0dnRkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjczNTQyNTEsImV4cCI6MjA4MjkzMDI1MX0.hIx76CetZiLgOJvmj1E8HXI7YR-arVJCoM52Al4UQN4';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
