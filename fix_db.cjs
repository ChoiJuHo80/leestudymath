const fs = require('fs');
let code = fs.readFileSync('main.js', 'utf8');

const oldStr = `    const mapStudentBadgeToDb = (jsItem) => {
        }
        return {
            id: cleanId,`;

const newStr = `    const mapStudentBadgeToDb = (jsItem) => {
        return {
            id: jsItem.id,`;

code = code.replace(oldStr, newStr);
fs.writeFileSync('main.js', code);
console.log("Fixed syntax error!");
