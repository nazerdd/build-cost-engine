import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://lwyfaoljighmhiamving.supabase.co/rest/v1/'

const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)