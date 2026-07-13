const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://xqdfyyfiroukkluygvkq.supabase.co';
const supabaseAnonKey = 'sb_publishable_VzYxmxytt9IFqmFuI9FW7Q_V9mDciJK';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  const { data, error } = await supabase.from('sb_class_formulas').select('id, formula_name');
  if (error) console.error(error);
  else {
    console.log(data);
    const toDelete = data.filter(d => String(d.id).endsWith('1') || String(d.id).endsWith('2'));
    console.log(`Found ${toDelete.length} formulas to delete.`);
    for (const item of toDelete) {
      const { error: delErr } = await supabase.from('sb_class_formulas').delete().eq('id', item.id);
      if (delErr) console.error('Error deleting', item.id, delErr);
      else console.log('Deleted', item.id);
    }
  }
}
run();
