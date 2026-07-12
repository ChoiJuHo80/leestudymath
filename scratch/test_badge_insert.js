import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://xqdfyyfiroukkluygvkq.supabase.co';
const supabaseAnonKey = 'sb_publishable_VzYxmxytt9IFqmFuI9FW7Q_V9mDciJK';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testInsert() {
  const testBadge = {
    id: Date.now(),
    student_id: 'af988686-094f-4227-879c-5bb1cf87db15-1', // real student ID
    formula_id: 101,
    formula_name: '근의 공식',
    achieved_at: new Date().toISOString()
  };
  console.log('Testing insert of:', testBadge);
  const { data, error } = await supabase.from('sb_student_badges').insert([testBadge]).select();
  if (error) {
    console.error('Insert failed with error:', error);
  } else {
    console.log('Insert succeeded! Data:', data);
    // Delete it
    await supabase.from('sb_student_badges').delete().eq('id', testBadge.id);
  }
}

testInsert();
