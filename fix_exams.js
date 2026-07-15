import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://xqdfyyfiroukkluygvkq.supabase.co';
const supabaseAnonKey = 'sb_publishable_VzYxmxytt9IFqmFuI9FW7Q_V9mDciJK';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function fixExams() {
  const { data: exams, error: getErr } = await supabase.from('exams').select('*').eq('school', '').order('created_at', { ascending: false });
  if (getErr) return console.error(getErr);

  for (const ex of exams) {
    const { data: stData } = await supabase.from('sb_students').select('school, class_id').eq('id', ex.student_id).single();
    if (!stData) continue;

    let school = stData.school || '';
    let grade = '';

    const schoolMatch = school.match(/^(.*?)\s*(\d+)(?:학년)?$/);
    if (schoolMatch) {
        school = schoolMatch[1].trim();
        grade = schoolMatch[2];
    } else if (stData.class_id) {
        const { data: classData } = await supabase.from('sb_classes').select('name').eq('id', stData.class_id).single();
        if (classData && classData.name) {
            const match = classData.name.match(/(\d+)학년/);
            if (match) grade = match[1];
        }
    }

    if (school || grade) {
        await supabase.from('exams').update({ school, grade }).eq('id', ex.id);
        console.log(`Updated exam ${ex.id} -> school: ${school}, grade: ${grade}`);
    }
  }
}

fixExams();
