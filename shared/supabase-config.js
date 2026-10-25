// /shared/supabase-config.js

// Replace these with your actual Supabase URL and Anon Key
const SUPABASE_URL = 'https://zuhtbfppyklzkjmrictb.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp1aHRiZnBweWtsemtqbXJpY3RiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYzNTIxODgsImV4cCI6MjEwMTkyODE4OH0.CJh3zean3otRZD8wyGaOjPIESWKwoe2TcCq7FRpX50Q';

// Initialize the Supabase client using the CDN version (which we will include in our HTML files)
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export { supabase };