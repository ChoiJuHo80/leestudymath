import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://xqdfyyfiroukkluygvkq.supabase.co';
const supabaseAnonKey = 'sb_publishable_VzYxmxytt9IFqmFuI9FW7Q_V9mDciJK';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkVocabs() {
    const { data: vocabs, error } = await supabase.from('sb_word_sets').select('*');
    if (error) {
        console.error("Error:", error);
    } else {
        console.log("Total vocabs:", vocabs.length);
        console.log(vocabs);
    }
}

checkVocabs();
