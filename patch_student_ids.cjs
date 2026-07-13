const fs = require('fs');

let mainJs = fs.readFileSync('main.js', 'utf8');

// Patch 1: parentChildForm new student ID
mainJs = mainJs.replace(
    'let targetId = matchedStudent ? matchedStudent.id : Date.now().toString();',
    'let targetId = matchedStudent ? matchedStudent.id : (usernameVal || Date.now().toString());'
);

// Patch 2: studentEditorForm (Admin) new student ID
mainJs = mainJs.replace(
    `                const newStudent = {
                    id: String(Date.now()),`,
    `                const newStudent = {
                    id: username || String(Date.now()),`
);

fs.writeFileSync('main.js', mainJs);
console.log('Student ID generation patched successfully');
