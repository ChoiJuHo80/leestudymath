const fs = require('fs');
const path = require('path');

const mainJsPath = path.join(__dirname, 'main.js');
let content = fs.readFileSync(mainJsPath, 'utf8');

// 1. Export initAdminExamDashboard to window
if (content.includes('initTeacherExamView } from')) {
    content = content.replace(
        "import { initStudentExamView, initTeacherExamView } from './src/examManager.js';",
        "import { initStudentExamView, initTeacherExamView, initAdminExamDashboard } from './src/examManager.js';"
    );
    if (!content.includes('window.initAdminExamDashboard = initAdminExamDashboard;')) {
        content = content.replace(
            "window.initTeacherExamView = initTeacherExamView;",
            "window.initTeacherExamView = initTeacherExamView;\nwindow.initAdminExamDashboard = initAdminExamDashboard;"
        );
    }
}

// 2. Add button in the admin students section
// Look for where the admin dashboard renders or just insert a button using JS directly in the DOM.
// Actually, it's safer to just inject it into the `renderStudents` function header rendering,
// or wait, `index.html` has an `#admin-search-container` we can attach it to.
// Let's just find `const adminSearchContainer = document.querySelector('.admin-search-container');`
// Or, we can just insert a button dynamically inside `main.js` when the student view opens.
// A simpler way: we just insert an event listener in the global scope of main.js that adds the button if not exists.

const globalInjectScript = `
setTimeout(() => {
    const studentsSection = document.getElementById('students');
    if (studentsSection && !document.getElementById('btn-global-exam-dashboard')) {
        const titleBar = studentsSection.querySelector('.section-title-bar');
        if (titleBar) {
            const btn = document.createElement('button');
            btn.id = 'btn-global-exam-dashboard';
            btn.className = 'btn-primary';
            btn.style.marginLeft = '10px';
            btn.innerHTML = '<i data-lucide="bar-chart-2" style="width:16px;height:16px;margin-right:4px;vertical-align:middle;"></i> 전체 시험 성적 통계';
            btn.addEventListener('click', () => {
                if (window.initAdminExamDashboard) window.initAdminExamDashboard();
            });
            titleBar.appendChild(btn);
            if (window.lucide) window.lucide.createIcons();
        }
    }
}, 2000);
`;

if (!content.includes('btn-global-exam-dashboard')) {
    // Append to bottom
    content += `\n${globalInjectScript}\n`;
}

fs.writeFileSync(mainJsPath, content, 'utf8');
console.log('Successfully patched main.js for Admin Exam Dashboard');
