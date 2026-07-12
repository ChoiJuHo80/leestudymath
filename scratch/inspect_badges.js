import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://xqdfyyfiroukkluygvkq.supabase.co';
const supabaseAnonKey = 'sb_publishable_VzYxmxytt9IFqmFuI9FW7Q_V9mDciJK';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function inspectBadges() {
  console.log('Fetching columns from sb_student_badges...');
  try {
    const { data, error } = await supabase.from('sb_student_badges').select('*').limit(1);
    if (error) {
      console.error('Error selecting from sb_student_badges:', error);
    } else {
      console.log('Successfully fetched rows. Count:', data.length);
      if (data.length > 0) {
        console.log('Row columns:', Object.keys(data[0]));
        console.log('Row data:', data[0]);
      } else {
        console.log('No rows found. Let\'s try to insert a test badge to see if it fails and what the error says!');
        const testBadge = {
          id: Date.now(),
          student_id: 'test-student',
          formula_id: 101,
          formula_name: 'test-formula',
          achieved_at: new Date().toISOString()
        };
        const { data: insData, error: insErr } = await supabase.from('sb_student_badges').insert([testBadge]).select();
        if (insErr) {
          console.error('Insert failed! Error:', insErr);
        } else {
          console.log('Insert succeeded! Return data:', insData);
          // Delete test row
          await supabase.from('sb_student_badges').delete().eq('id', testBadge.id);
        }
      }
    }
  } catch (err) {
    console.error('Exceptional error:', err);
  }
}

inspectBadges();
