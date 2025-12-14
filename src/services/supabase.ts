import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://bzbzcnyipynpkzaqauxd.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ6YnpjbnlpcHlucGt6YXFhdXhkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU2MDg3ODIsImV4cCI6MjA4MTE4NDc4Mn0.1CfLmFr80h9B0_tvicYxQSJUAmaWBBi3V5ZkD451r-g';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    },
});
