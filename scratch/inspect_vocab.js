import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://xqdfyyfiroukkluygvkq.supabase.co';
const supabaseAnonKey = 'sb_publishable_VzYxmxytt9IFqmFuI9FW7Q_V9mDciJK';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function inspectVocab() {
  console.log('Fetching columns from sb_word_sets...');
  try {
    const { data, error } = await supabase.from('sb_word_sets').select('*').limit(3);
    if (error) {
      console.error('Error fetching word sets:', error);
    } else {
      console.log('Fetched rows count:', data.length);
      if (data.length > 0) {
        console.log('Row columns:', Object.keys(data[0]));
        console.log('Row data:', data);
      }
    }
  } catch (err) {
    console.error('Exceptional error:', err);
  }
}

inspectVocab();
