const fs = require('fs');

let mainJs = fs.readFileSync('main.js', 'utf8');

// Fix 1: studentIds
mainJs = mainJs.replace(
    'const studentIds = [...new Set([String(student.id), ...siblingOrSelfProfiles.map(s => String(s.id))])];',
    'const studentIds = [...new Set([String(student.id), ...siblingOrSelfProfiles.map(s => String(s.id)), student.username])].filter(Boolean);'
);

// Fix 2: renderAdminVocabSetsList
mainJs = mainJs.replace(
    `            container.innerHTML = '';
            const filtered = wordSets.filter(w => String(w.studentId) === String(classId));
            
            if (filtered.length === 0) {`,
    `            container.innerHTML = '';
            const studentForAdmin = students.find(s => String(s.id) === String(classId));
            const adminStudentUsername = studentForAdmin ? studentForAdmin.username : null;
            const filtered = wordSets.filter(w => String(w.studentId) === String(classId) || (adminStudentUsername && String(w.studentId) === adminStudentUsername));
            
            if (filtered.length === 0) {`
);

fs.writeFileSync('main.js', mainJs);
console.log('main.js patched successfully');
