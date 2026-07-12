import http from 'https';

const urls = [
  'https://storage.googleapis.com/leestudymath/index.html',
  'https://storage.googleapis.com/leestudymath/assets/index-BgW2b92_.css',
  'https://storage.googleapis.com/leestudymath/assets/index-DqB9kLxR.js',
  'https://storage.googleapis.com/leestudymath/assets/index-BfzbR1Cp.js',
  'https://storage.googleapis.com/leestudymath/assets/index-DVpC_5ke.css',
  'https://storage.googleapis.com/leestudymath/assets/index-Bx8N1xR1.js'
];

urls.forEach(url => {
  http.get(url, (res) => {
    console.log(`URL: ${url} -> Status: ${res.statusCode} (MIME: ${res.headers['content-type']})`);
  }).on('error', (e) => {
    console.error(`Error for ${url}:`, e.message);
  });
});
