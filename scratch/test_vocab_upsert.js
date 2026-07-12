import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://xqdfyyfiroukkluygvkq.supabase.co';
const supabaseAnonKey = 'sb_publishable_VzYxmxytt9IFqmFuI9FW7Q_V9mDciJK';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testUpsert() {
  console.log('Testing upsert to sb_word_sets...');
  const newSet = {
    id: 999999,
    class_id: null,
    student_id: 'test-student-id',
    title: '테스트 단어장',
    words: JSON.stringify([{ word: 'test', meaning: '테스트' }]),
    created_at: new Date().toISOString()
  };

  try {
    const { data, error } = await supabase.from('sb_word_sets').upsert(newSet);
    if (error) {
      console.error('Upsert failed:', error);
    } else {
      console.log('Upsert succeeded! Data:', data);
    }
  } catch (err) {
    console.error('Exception during upsert:', err);
  }
}

testUpsert();
