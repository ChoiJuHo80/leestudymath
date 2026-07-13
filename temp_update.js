import fs from 'fs';
const jsCode = fs.readFileSync('supabase.js', 'utf8');
const urlMatch = jsCode.match(/const SUPABASE_URL = '([^']+)'/);
const keyMatch = jsCode.match(/const SUPABASE_KEY = '([^']+)'/);

import { createClient } from '@supabase/supabase-js';
const supabase = createClient(urlMatch[1], keyMatch[1]);
async function update() {
    const { error } = await supabase.from('sb_students').update({ class_id: '521311e9-08b3-4b7e-a707-d2250be5b8eb' }).eq('id', 'jun16');
    console.log('Update jun16:', error || 'Success');
    const { error: error2 } = await supabase.from('sb_students').update({ class_id: '7ab76299-8f51-4c23-9571-bcbdd75118a6' }).eq('id', 'jiyul');
    console.log('Update jiyul:', error2 || 'Success');
}
update();
