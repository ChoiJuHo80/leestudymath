const http = require('http');

http.get('http://www.leestudymath.co.kr/index.html', (res) => {
  console.log('Status Code:', res.statusCode);
  console.log('Headers:', JSON.stringify(res.headers, null, 2));
}).on('error', err => console.error(err));
