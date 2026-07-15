import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://xqdfyyfiroukkluygvkq.supabase.co';
const supabaseAnonKey = 'sb_publishable_VzYxmxytt9IFqmFuI9FW7Q_V9mDciJK';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testExams() {
  const { data, error } = await supabase.from('exams').select('*').order('created_at', { ascending: false }).limit(5);
  console.log("Error:", error);
  console.log("Exams:");
  console.log(JSON.stringify(data, null, 2));
}

testExams();
