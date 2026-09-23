import { createClient } from '@supabase/supabase-js';
const supabase = createClient('https://ofwtaprmxkpoafbabohl.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9md3RhcHJteGtwb2FmYmFib2hsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAwMDI3OTMsImV4cCI6MjEwNTU3ODc5M30.WeOI4QQEtJYa3lKhl7KRg-uasiWswUU_a54RmFdJGAA');
async function test() {
  const { data, error } = await supabase.from('cargo_offers').select('*').eq('is_active', true).gt('available_kilos', 0);
  console.log("Count:", data?.length, "Error:", error);
}
test();
