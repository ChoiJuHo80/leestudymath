const fs = require('fs');
let mainJs = fs.readFileSync('main.js', 'utf8');

const target = `    const mapStudentBadgeToDb = (jsItem) => {
        }
        return {
            id: cleanId,`;

const replacement = `    const mapStudentBadgeToDb = (jsItem) => {
        return {
            id: jsItem.id,`;

mainJs = mainJs.replace(target, replacement);

fs.writeFileSync('main.js', mainJs);
console.log('Patch complete.');
