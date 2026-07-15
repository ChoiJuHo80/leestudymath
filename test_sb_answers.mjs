async function run() {
  const url = "https://xqdfyyfiroukkluygvkq.supabase.co/rest/v1/";
  const key = "sb_publishable_VzYxmxytt9IFqmFuI9FW7Q_V9mDciJK";
  
  const res = await fetch(url, {
    method: "GET",
    headers: { "apikey": key }
  });
  
  const spec = await res.json();
  console.log(spec);
}

run();
