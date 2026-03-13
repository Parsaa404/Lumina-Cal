import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
(async () => {
  const { data, error } = await supabase.from('users').select('firstName, targetWeight').limit(5);
  console.log('Error:', error);
  console.log('Data:', data);
})();
