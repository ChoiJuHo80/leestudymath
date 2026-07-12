import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://xqdfyyfiroukkluygvkq.supabase.co';
const supabaseAnonKey = 'sb_publishable_VzYxmxytt9IFqmFuI9FW7Q_V9mDciJK';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function inspectStudents() {
  console.log('Querying 최이준 in sb_students...');
  try {
    const { data, error } = await supabase.from('sb_students').select('*').eq('name', '최이준');
    if (error) {
      console.error('Error fetching students:', error);
    } else {
      console.log(' 최이준 matching records:', data);
    }
  } catch (err) {
    console.error('Exceptional error:', err);
  }
}

inspectStudents();
