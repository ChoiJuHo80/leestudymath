import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://xqdfyyfiroukkluygvkq.supabase.co';
const supabaseAnonKey = 'sb_publishable_VzYxmxytt9IFqmFuI9FW7Q_V9mDciJK';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testConnection() {
  console.log('Testing Supabase connection...');
  try {
    // Try fetching notices
    const { data: notices, error: noticesErr } = await supabase.from('sb_notices').select('*');
    if (noticesErr) {
      console.error('Error fetching sb_notices:', noticesErr);
    } else {
      console.log(`Successfully fetched ${notices.length} notices.`);
      console.log('Sample notice:', notices[0]);
    }

    // Try fetching students
    const { data: students, error: studentsErr } = await supabase.from('sb_students').select('*');
    if (studentsErr) {
      console.error('Error fetching sb_students:', studentsErr);
    } else {
      console.log(`Successfully fetched ${students.length} students.`);
      console.log('Sample student:', students[0]);
    }

    // Try fetching classes
    const { data: classes, error: classesErr } = await supabase.from('sb_classes').select('*');
    if (classesErr) {
      console.error('Error fetching sb_classes:', classesErr);
    } else {
      console.log(`Successfully fetched ${classes.length} classes.`);
      console.log('Sample class:', classes[0]);
    }

    // Check if mock mode vs real database has different contents
  } catch (err) {
    console.error('Exceptional error during testing:', err);
  }
}

testConnection();
