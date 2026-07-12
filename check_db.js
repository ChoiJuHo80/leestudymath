import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://xqdfyyfiroukkluygvkq.supabase.co';
const supabaseAnonKey = 'sb_publishable_VzYxmxytt9IFqmFuI9FW7Q_V9mDciJK';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkUsers() {
  const { data, error } = await supabase.from('sb_mock_users').select('*').eq('role', 'parent').order('created_at', { ascending: false }).limit(5);
  if (error) console.error(error);
  else console.log(JSON.stringify(data, null, 2));
}

checkUsers();
