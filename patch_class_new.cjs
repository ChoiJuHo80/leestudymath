const fs = require('fs');
let lines = fs.readFileSync('main.js', 'utf8').split('\n');
for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('classes.push(newClass)')) {
        // Go backwards to find crypto.randomUUID()
        for(let j = i; j >= i - 15; j--) {
            if (lines[j].includes('crypto.randomUUID()')) {
                lines[j] = lines[j].replace('crypto.randomUUID()', 'getNextSequentialId(classes)');
                break;
            }
        }
    }
}
fs.writeFileSync('main.js', lines.join('\n'));
console.log("Fixed newClass ID!");
