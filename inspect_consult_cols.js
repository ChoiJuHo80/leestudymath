import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://xqdfyyfiroukkluygvkq.supabase.co';
const supabaseAnonKey = 'sb_publishable_VzYxmxytt9IFqmFuI9FW7Q_V9mDciJK';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function inspectColumns() {
  console.log('Inserting dummy record to sb_consultations with ID...');
  const { data, error } = await supabase.from('sb_consultations').insert([{
    id: 9999,
    name: 'Test',
    phone: '010-0000-0000',
    status: 'pending'
  }]).select('*');
  
  if (error) {
    console.error('Insert error:', error);
  } else {
    console.log('Successfully inserted! Returned columns:', Object.keys(data[0]));
    console.log('Row details:', data[0]);
    
    // Clean up
    await supabase.from('sb_consultations').delete().eq('id', 9999);
  }
}

inspectColumns();
