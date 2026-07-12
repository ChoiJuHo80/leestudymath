const supabaseUrl = 'https://xqdfyyfiroukkluygvkq.supabase.co';
const supabaseAnonKey = 'sb_publishable_VzYxmxytt9IFqmFuI9FW7Q_V9mDciJK';

async function getSchema() {
  const url = `${supabaseUrl}/rest/v1/`;
  const headers = {
    'apikey': supabaseAnonKey,
    'Authorization': `Bearer ${supabaseAnonKey}`
  };
  try {
    const res = await fetch(url, { headers });
    const spec = await res.json();
    console.log('=== SUPABASE SCHEMA SPEC ===');
    console.log(JSON.stringify(spec, null, 2));
  } catch (err) {
    console.error('Error fetching schema:', err);
  }
}

getSchema();
