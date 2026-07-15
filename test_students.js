import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://xqdfyyfiroukkluygvkq.supabase.co';
const supabaseAnonKey = 'sb_publishable_VzYxmxytt9IFqmFuI9FW7Q_V9mDciJK';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testStudents() {
  const { data, error } = await supabase.from('sb_students').select('*').eq('id', 'jun16');
  console.log("Error:", error);
  console.log("Students:");
  console.log(JSON.stringify(data, null, 2));
}

testStudents();
