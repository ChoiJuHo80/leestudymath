const fs = require('fs');
let code = fs.readFileSync('main.js', 'utf8');

code = code.replace(/id:\s*crypto\.randomUUID\(\),\s*name,/, 'id: getNextSequentialId(classes),\n                        name,');

fs.writeFileSync('main.js', code);
console.log("Patched classes!");
