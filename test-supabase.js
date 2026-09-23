import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ofwtaprmxkpoafbabohl.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9md3RhcHJteGtwb2FmYmFib2hsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAwMDI3OTMsImV4cCI6MjEwNTU3ODc5M30.WeOI4QQEtJYa3lKhl7KRg-uasiWswUU_a54RmFdJGAA';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function test() {
  const { data, error } = await supabase.from('cargo_offers').select('*');
  console.log('All offers:', data?.length, error);
  
  const { data: active, error: err2 } = await supabase.from('cargo_offers').select('*').eq('is_active', true);
  console.log('Active offers:', active?.length, err2);
}

test();
