const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://xqdfyyfiroukkluygvkq.supabase.co';
const supabaseAnonKey = 'sb_publishable_VzYxmxytt9IFqmFuI9FW7Q_V9mDciJK';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  const { data, error } = await supabase.from('sb_class_formulas').select('id, formula_name');
  if (error) console.error(error);
  else {
    const toDelete = data.filter(d => d.formula_name === '근의 공식' || d.formula_name === '최대공약수');
    console.log(`Found ${toDelete.length} formulas to delete.`);
    for (const item of toDelete) {
      const { error: delErr } = await supabase.from('sb_class_formulas').delete().eq('id', item.id);
      if (delErr) console.error('Error deleting', item.id, delErr);
      else console.log('Deleted', item.id);
    }
  }
}
run();
