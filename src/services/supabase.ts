import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bzbzcnyipynpkzaqauxd.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ6YnpjbnlpcHlucGt6YXFhdXhkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQwOTUxNDMsImV4cCI6MjA0OTY3MTE0M30.owbLIBB6wlMUGELBzEBx-h_6KQp7O6rSqR6N9F_-bNY';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
