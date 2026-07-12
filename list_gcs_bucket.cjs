const https = require('https');

https.get('https://storage.googleapis.com/leestudymath/', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('--- GCS XML Response ---');
    console.log(data.substring(0, 2000)); // Print first 2000 chars of XML
    console.log('------------------------');
  });
}).on('error', (e) => {
  console.error(e);
});
