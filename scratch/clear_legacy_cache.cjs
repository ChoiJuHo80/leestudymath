const fs = require('fs');
let content = fs.readFileSync('main.js', 'utf8');

const injectionPoint = "document.addEventListener('DOMContentLoaded', () => {";
const cacheClearCode = `
    // [HOTFIX] 기존 하드코딩된 더미 데이터가 로컬 스토리지에 남아있는 경우 강제 초기화
    try {
        const checkClasses = localStorage.getItem('gongbubang_classes');
        const checkStudents = localStorage.getItem('gongbubang_students');
        if ((checkClasses && checkClasses.includes('초등 4학년 A반')) || 
            (checkStudents && checkStudents.includes('김민준'))) {
            console.log('[Cache Clear] Detected legacy dummy data. Purging local storage...');
            const keysToClear = [
                'gongbubang_notices', 'gongbubang_classes', 'gongbubang_students',
                'gongbubang_homework', 'gongbubang_messages', 'gongbubang_feedbacks',
                'gongbubang_progress', 'gongbubang_attendance', 'gongbubang_consultations',
                'gongbubang_curriculums', 'gongbubang_ai_queries', 'gongbubang_textbook_requests',
                'gongbubang_habits_admin'
            ];
            keysToClear.forEach(k => localStorage.removeItem(k));
        }
    } catch(e) {}
`;

if (content.includes(injectionPoint)) {
    if (!content.includes('[HOTFIX]')) {
        content = content.replace(injectionPoint, injectionPoint + '\n' + cacheClearCode);
        fs.writeFileSync('main.js', content, 'utf8');
        console.log('✅ Injected cache clear logic successfully.');
    } else {
        console.log('⚠️ Cache clear logic already exists.');
    }
} else {
    console.log('❌ Could not find injection point.');
}
