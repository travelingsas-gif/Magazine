import { createClient } from '@supabase/supabase-js';

// Usa le variabili d'ambiente di Vite.
// Se sei in locale, crea un file .env nella root con questi valori.
// Se sei su Vercel, aggiungile nelle Settings > Environment Variables.
// Cast a any per evitare errori TS se i tipi di Vite non sono configurati globalmente
const SUPABASE_URL = (import.meta as any).env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = (import.meta as any).env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn('Attenzione: Credenziali Supabase mancanti. L\'app potrebbe non funzionare correttamente.');
}

export const supabase = createClient(
  SUPABASE_URL || '', 
  SUPABASE_ANON_KEY || ''
);