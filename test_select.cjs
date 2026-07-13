const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://xqdfyyfiroukkluygvkq.supabase.co';
const supabaseAnonKey = 'sb_publishable_VzYxmxytt9IFqmFuI9FW7Q_V9mDciJK';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  const { data, error } = await supabase.from('sb_class_formulas').select('*');
  console.log(JSON.stringify(data, null, 2));
}
run();
