import { createClient } from '@supabase/supabase-js'

// Ganti string di bawah dengan URL dan Anon Key dari Dashboard Supabase Anda
// (Pastikan URL dan KEY-nya tetap pakai milik Anda yang sebelumnya)
const supabaseUrl = 'https://lowccxeqejaeryiuvzcw.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxvd2NjeGVxZWphZXJ5aXV2emN3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUzMDYzMzQsImV4cCI6MjA4MDg4MjMzNH0.F4SpG_qyCFoFrRDCKp7U0RUz0ixQjzpIJDUH5r_mP38'

// Tambahkan parameter ketiga (options) untuk mematikan simpan sesi
export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false // <--- INI KUNCINYA
  }
})