import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://xqdfyyfiroukkluygvkq.supabase.co';
const supabaseAnonKey = 'sb_publishable_VzYxmxytt9IFqmFuI9FW7Q_V9mDciJK';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function alterTable() {
  const { data, error } = await supabase.rpc('exec_sql', { query: 'ALTER TABLE sb_students ADD COLUMN grade VARCHAR(20);' });
  console.log("Error:", error);
  console.log("Data:", data);
}

alterTable();
