const fs = require('fs');
let code = fs.readFileSync('main.js', 'utf8');
code += `
document.addEventListener('DOMContentLoaded', () => {
    const gradeFilter = document.getElementById('parent-exam-grade-filter');
    const semesterFilter = document.getElementById('parent-exam-semester-filter');
    if (gradeFilter) gradeFilter.addEventListener('change', () => { if (typeof renderMyClass === 'function') renderMyClass(); });
    if (semesterFilter) semesterFilter.addEventListener('change', () => { if (typeof renderMyClass === 'function') renderMyClass(); });
});
`;
fs.writeFileSync('main.js', code, 'utf8');
console.log('Filters appended.');
