// /assets/js/supabase-client.js (VERSI BENAR DAN LENGKAP)

// GANTI DENGAN URL & KUNCI API SUPABASE PROYEK ANDA YANG ASLI
const SUPABASE_URL = 'https://njirablhensmstzzkdta.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5qaXJhYmxoZW5zbXN0enprZHRhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg5NTY0ODEsImV4cCI6MjA3NDUzMjQ4MX0.xXxFxyL_2GTr5f00A8MkRuIvrXY38MoQ2o-W6Afsrek';

// Cek jika variabel diisi. Jika belum, lempar error yang jelas.
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error("Supabase URL and Key are required. Please check your supabase-client.js file.");
}

// Pustaka utama Supabase diambil dari CDN dan akan menciptakan objek 'supabase' di window
// Kita langsung gunakan objek itu untuk membuat client yang sudah terkonfigurasi.
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Ganti objek supabase global dengan klien yang sudah terkonfigurasi ini,
// agar semua file lain (main.js, seller.js) bisa langsung menggunakannya.
window.supabase = supabase;