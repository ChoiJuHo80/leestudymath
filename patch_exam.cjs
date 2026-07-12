const fs = require('fs');
const path = require('path');

const mainJsPath = path.join(__dirname, 'main.js');
let content = fs.readFileSync(mainJsPath, 'utf8');

// 1. Add import
if (!content.includes('examManager.js')) {
    content = content.replace(
        "import { supabase, isMock } from './supabase.js';", 
        "import { supabase, isMock } from './supabase.js';\nimport { initStudentExamView, initTeacherExamView } from './src/examManager.js';\nwindow.initStudentExamView = initStudentExamView;\nwindow.initTeacherExamView = initTeacherExamView;"
    );
}

// 2. Inject Teacher Exam View into Student Card
const targetCardAppend = "studentGridContainer.appendChild(card);";
if (!content.includes('window.initTeacherExamView(card, student)')) {
    content = content.replace(
        targetCardAppend,
        `if (window.initTeacherExamView) window.initTeacherExamView(card, student);\n            ${targetCardAppend}`
    );
}

// 3. Inject Student Exam View into MyClass initialization
const targetStudentInit = "window.renderStudentFormulasAndBadges = (student) => {";
if (!content.includes('window.initStudentExamView(student.id)')) {
    content = content.replace(
        targetStudentInit,
        `${targetStudentInit}\n            if (window.initStudentExamView) window.initStudentExamView(student.id);`
    );
}

fs.writeFileSync(mainJsPath, content, 'utf8');
console.log('Successfully patched main.js for Exam System');
