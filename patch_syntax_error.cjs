const fs = require('fs');

let mainJs = fs.readFileSync('main.js', 'utf8');

// Fix the syntax error in mapStudentBadgeToDb caused by a previous bad commit
mainJs = mainJs.replace(
    `    const mapStudentBadgeToDb = (jsItem) => {
        }
        return {
            id: cleanId,`,
    `    const mapStudentBadgeToDb = (jsItem) => {
        return {
            id: jsItem.id,`
);

fs.writeFileSync('main.js', mainJs);
console.log('Syntax error fixed successfully');
