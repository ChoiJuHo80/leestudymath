const fs = require('fs');
let content = fs.readFileSync('main.js', 'utf8');

const r_students = /let students = defaultStudents\.map[\s\S]*?students = defaultStudents;\r?\n    \}/;

if (r_students.test(content)) {
    const newStudentsInit = `    // students는 Supabase 동기화 후 설정됩니다 - 기본값 사용 안 함
    let students = [];
    try {
        const stored = localStorage.getItem('gongbubang_students');
        if (stored) {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed)) {
                students = parsed.filter(s => s && typeof s === 'object').map(s => ({ ...s, id: String(s.id) }));
            }
        }
    } catch (e) {
        console.error('localStorage is not accessible for students data.', e);
        students = [];
    }`;
    content = content.replace(r_students, newStudentsInit);
    fs.writeFileSync('main.js', content, 'utf8');
    console.log('✅ Fixed: students init');
} else {
    console.log('❌ NOT FOUND: students init');
}
