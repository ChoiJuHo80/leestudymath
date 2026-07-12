const http = require('http');

http.get('http://www.leestudymath.co.kr/assets/index-BvB8Dj0w.js', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('--- Deployed JS File content check ---');
    console.log('Length:', data.length);
    console.log('Contains sortClassesByName:', data.includes('sortClassesByName'));
    console.log('Contains parseStudentId:', data.includes('parseStudentId'));
    console.log('Contains getStudentSchedule:', data.includes('getStudentSchedule'));
    
    // Let's print some snippet where parseStudentId is defined
    const idx = data.indexOf('parseStudentId');
    if (idx !== -1) {
      console.log('parseStudentId snippet:', data.substring(idx - 100, idx + 200));
    }
  });
}).on('error', err => console.error(err));
