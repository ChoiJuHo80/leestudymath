const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function checkVocabs() {
    const { data: vocabs, error } = await supabase.from('sb_vocab_sets').select('*');
    if (error) {
        console.error("Error:", error);
    } else {
        console.log("Total vocabs:", vocabs.length);
        console.log(vocabs);
    }
}

checkVocabs();
