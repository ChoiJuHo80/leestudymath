const fs = require('fs');
if (fs.existsSync('c:/Users/Administrator/Documents/WORK/dist/index.html')) {
  const content = fs.readFileSync('c:/Users/Administrator/Documents/WORK/dist/index.html', 'utf8');
  console.log('--- LOCAL dist/index.html head content ---');
  const matchJs = content.match(/src="([^"]+)"/g);
  console.log('JS references:', matchJs);
  console.log('-----------------------------------------');
} else {
  console.log('dist/index.html does not exist!');
}
