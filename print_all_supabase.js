import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://xqdfyyfiroukkluygvkq.supabase.co';
const supabaseAnonKey = 'sb_publishable_VzYxmxytt9IFqmFuI9FW7Q_V9mDciJK';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function dumpAll() {
  console.log('=== DUMPING SUPABASE DATA ===');
  try {
    // 1. Notices
    const { data: notices } = await supabase.from('sb_notices').select('*');
    console.log(`\n--- NOTICES (${notices?.length || 0} items) ---`);
    notices?.forEach(n => console.log(`[ID ${n.id}] [${n.tag}] ${n.title} (${n.date})`));

    // 2. Classes
    const { data: classes } = await supabase.from('sb_classes').select('*');
    console.log(`\n--- CLASSES (${classes?.length || 0} items) ---`);
    classes?.forEach(c => console.log(`[ID ${c.id}] ${c.name} | Textbooks: ${JSON.stringify(c.textbooks)}`));

    // 3. Students
    const { data: students } = await supabase.from('sb_students').select('*');
    console.log(`\n--- STUDENTS (${students?.length || 0} items) ---`);
    students?.forEach(s => console.log(`[ID ${s.id}] ${s.name} (Age: ${s.age}, School: ${s.school}, Phone: ${s.phone}, ClassID: ${s.class_id})`));

    // 4. Mock Users (Parent accounts)
    const { data: mockUsers } = await supabase.from('sb_mock_users').select('*');
    console.log(`\n--- PARENT ACCOUNTS (MOCK USERS) (${mockUsers?.length || 0} items) ---`);
    mockUsers?.forEach(u => console.log(`[ID ${u.id}] ${u.name || 'No Name'} | Email: ${u.email} | Phone: ${u.phone} | Status: ${u.status}`));

    // 5. Textbook Requests
    const { data: textbookRequests } = await supabase.from('sb_textbook_requests').select('*');
    console.log(`\n--- TEXTBOOK REQUESTS (${textbookRequests?.length || 0} items) ---`);
    textbookRequests?.forEach(r => console.log(`[ID ${r.id}] Student: ${r.student_name} | Textbook: ${r.textbook_name} | Price: ${r.price} | Paid: ${r.is_paid}`));

    // 6. Consultations
    const { data: consultations } = await supabase.from('sb_consultations').select('*');
    console.log(`\n--- CONSULTATIONS (${consultations?.length || 0} items) ---`);
    consultations?.forEach(c => console.log(`[ID ${c.id}] Name: ${c.name} | Phone: ${c.phone} | Status: ${c.status}`));

  } catch (err) {
    console.error('Error dumping data:', err);
  }
}

dumpAll();
