const fs = require('fs');
let content = fs.readFileSync('main.js', 'utf8');

let count = 0;

// ─────────────────────────────────────────────────────────────────────────────
// 1. notices 초기화: defaultNotices → []
// ─────────────────────────────────────────────────────────────────────────────
const r1 = /let notices = defaultNotices;\r?\n    try \{\r?\n        const stored = localStorage\.getItem\('gongbubang_notices'\);\r?\n        if \(stored\) \{\r?\n            notices = JSON\.parse\(stored\);\r?\n        \}\r?\n    \} catch \(e\) \{\r?\n        console\.error\('localStorage is not accessible, using in-memory notices\.', e\);\r?\n    \}/;
if (r1.test(content)) {
    content = content.replace(r1,
        `let notices = [];\n    // notices는 Supabase 동기화(initializeDataFromSupabase) 후 설정됩니다`);
    console.log('✅ Fixed: notices init');
    count++;
} else {
    console.log('❌ NOT FOUND: notices init');
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. homework/messages/feedbacks/progressList/attendance 초기값 → []
// ─────────────────────────────────────────────────────────────────────────────
const r2 = /let homework = defaultHomework;\r?\n    let messages = defaultMessages;\r?\n    let feedbacks = defaultFeedbacks;\r?\n    let progressList = defaultProgressList;\r?\n    let attendance = defaultAttendance;\r?\n    let consultations = defaultConsultations;\r?\n    let curriculums = defaultCurriculums;\r?\n    let aiQueries = defaultAiQueries;\r?\n    const defaultTextbookRequests = \[\];\r?\n    let textbookRequests = defaultTextbookRequests;/;
if (r2.test(content)) {
    content = content.replace(r2,
        `// 모든 데이터는 Supabase 동기화 후 설정됩니다 - 기본값 사용 안 함\n    let homework = [];\n    let messages = [];\n    let feedbacks = [];\n    let progressList = [];\n    let attendance = [];\n    let consultations = [];\n    let curriculums = [];\n    let aiQueries = [];\n    const defaultTextbookRequests = [];\n    let textbookRequests = [];`);
    console.log('✅ Fixed: state variables init');
    count++;
} else {
    console.log('❌ NOT FOUND: state variables init');
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. localStorage 초기 읽기에서 else 절 제거 (defaultXxx 저장 막기)
// ─────────────────────────────────────────────────────────────────────────────
// homework
const r3a = /const storedHw = localStorage\.getItem\('gongbubang_homework'\);\r?\n        if \(storedHw\) homework = JSON\.parse\(storedHw\);\r?\n        else localStorage\.setItem\('gongbubang_homework', JSON\.stringify\(defaultHomework\)\);/;
if (r3a.test(content)) {
    content = content.replace(r3a,
        `const storedHw = localStorage.getItem('gongbubang_homework');\n        if (storedHw) homework = JSON.parse(storedHw);`);
    console.log('✅ Fixed: homework localStorage init');
    count++;
} else { console.log('❌ NOT FOUND: homework localStorage init'); }

// messages
const r3b = /const storedMsg = localStorage\.getItem\('gongbubang_messages'\);\r?\n        if \(storedMsg\) messages = JSON\.parse\(storedMsg\);\r?\n        else localStorage\.setItem\('gongbubang_messages', JSON\.stringify\(defaultMessages\)\);/;
if (r3b.test(content)) {
    content = content.replace(r3b,
        `const storedMsg = localStorage.getItem('gongbubang_messages');\n        if (storedMsg) messages = JSON.parse(storedMsg);`);
    console.log('✅ Fixed: messages localStorage init');
    count++;
} else { console.log('❌ NOT FOUND: messages localStorage init'); }

// feedbacks
const r3c = /const storedFb = localStorage\.getItem\('gongbubang_feedbacks'\);\r?\n        if \(storedFb\) feedbacks = JSON\.parse\(storedFb\);\r?\n        else localStorage\.setItem\('gongbubang_feedbacks', JSON\.stringify\(defaultFeedbacks\)\);/;
if (r3c.test(content)) {
    content = content.replace(r3c,
        `const storedFb = localStorage.getItem('gongbubang_feedbacks');\n        if (storedFb) feedbacks = JSON.parse(storedFb);`);
    console.log('✅ Fixed: feedbacks localStorage init');
    count++;
} else { console.log('❌ NOT FOUND: feedbacks localStorage init'); }

// progress
const r3d = /const storedProg = localStorage\.getItem\('gongbubang_progress'\);\r?\n        if \(storedProg\) progressList = JSON\.parse\(storedProg\);\r?\n        else localStorage\.setItem\('gongbubang_progress', JSON\.stringify\(defaultProgressList\)\);/;
if (r3d.test(content)) {
    content = content.replace(r3d,
        `const storedProg = localStorage.getItem('gongbubang_progress');\n        if (storedProg) progressList = JSON.parse(storedProg);`);
    console.log('✅ Fixed: progress localStorage init');
    count++;
} else { console.log('❌ NOT FOUND: progress localStorage init'); }

// attendance
const r3e = /const storedAtt = localStorage\.getItem\('gongbubang_attendance'\);\r?\n        if \(storedAtt\) attendance = JSON\.parse\(storedAtt\);\r?\n        else localStorage\.setItem\('gongbubang_attendance', JSON\.stringify\(defaultAttendance\)\);/;
if (r3e.test(content)) {
    content = content.replace(r3e,
        `const storedAtt = localStorage.getItem('gongbubang_attendance');\n        if (storedAtt) attendance = JSON.parse(storedAtt);`);
    console.log('✅ Fixed: attendance localStorage init');
    count++;
} else { console.log('❌ NOT FOUND: attendance localStorage init'); }

// consultations
const r3f = /const storedConsult = localStorage\.getItem\('gongbubang_consultations'\);\r?\n        if \(storedConsult\) consultations = JSON\.parse\(storedConsult\);\r?\n        else localStorage\.setItem\('gongbubang_consultations', JSON\.stringify\(defaultConsultations\)\);/;
if (r3f.test(content)) {
    content = content.replace(r3f,
        `const storedConsult = localStorage.getItem('gongbubang_consultations');\n        if (storedConsult) consultations = JSON.parse(storedConsult);`);
    console.log('✅ Fixed: consultations localStorage init');
    count++;
} else { console.log('❌ NOT FOUND: consultations localStorage init'); }

// curriculums
const r3g = /const storedCurriculum = localStorage\.getItem\('gongbubang_curriculums'\);\r?\n        if \(storedCurriculum\) curriculums = JSON\.parse\(storedCurriculum\);\r?\n        else localStorage\.setItem\('gongbubang_curriculums', JSON\.stringify\(defaultCurriculums\)\);/;
if (r3g.test(content)) {
    content = content.replace(r3g,
        `const storedCurriculum = localStorage.getItem('gongbubang_curriculums');\n        if (storedCurriculum) curriculums = JSON.parse(storedCurriculum);`);
    console.log('✅ Fixed: curriculums localStorage init');
    count++;
} else { console.log('❌ NOT FOUND: curriculums localStorage init'); }

// aiQueries
const r3h = /const storedAiQueries = localStorage\.getItem\('gongbubang_ai_queries'\);\r?\n        if \(storedAiQueries\) aiQueries = JSON\.parse\(storedAiQueries\);\r?\n        else localStorage\.setItem\('gongbubang_ai_queries', JSON\.stringify\(defaultAiQueries\)\);/;
if (r3h.test(content)) {
    content = content.replace(r3h,
        `const storedAiQueries = localStorage.getItem('gongbubang_ai_queries');\n        if (storedAiQueries) aiQueries = JSON.parse(storedAiQueries);`);
    console.log('✅ Fixed: aiQueries localStorage init');
    count++;
} else { console.log('❌ NOT FOUND: aiQueries localStorage init'); }

// textbookRequests
const r3i = /const storedTextbookReqs = localStorage\.getItem\('gongbubang_textbook_requests'\);\r?\n        if \(storedTextbookReqs\) textbookRequests = JSON\.parse\(storedTextbookReqs\);\r?\n        else localStorage\.setItem\('gongbubang_textbook_requests', JSON\.stringify\(defaultTextbookRequests\)\);/;
if (r3i.test(content)) {
    content = content.replace(r3i,
        `const storedTextbookReqs = localStorage.getItem('gongbubang_textbook_requests');\n        if (storedTextbookReqs) textbookRequests = JSON.parse(storedTextbookReqs);`);
    console.log('✅ Fixed: textbookRequests localStorage init');
    count++;
} else { console.log('❌ NOT FOUND: textbookRequests localStorage init'); }

// ─────────────────────────────────────────────────────────────────────────────
// 4. classes 초기화: defaultClasses → []
// ─────────────────────────────────────────────────────────────────────────────
const r4 = /let classes = sortClassesByName\(defaultClasses\);\r?\n\r?\n    \/\/ Load classes from localStorage\r?\n    try \{\r?\n        const storedClasses = localStorage\.getItem\('gongbubang_classes'\);\r?\n        if \(storedClasses\) \{\r?\n            const parsed = JSON\.parse\(storedClasses\);\r?\n            if \(Array\.isArray\(parsed\)\) \{\r?\n                classes = sortClassesByName\(parsed\.filter\(c => c && typeof c === 'object'\)\);[\s\S]*?} else \{\r?\n                localStorage\.setItem\('gongbubang_classes', JSON\.stringify\(defaultClasses\)\);\r?\n            \}\r?\n        \} else \{\r?\n            localStorage\.setItem\('gongbubang_classes', JSON\.stringify\(defaultClasses\)\);\r?\n        \}\r?\n    \} catch \(e\) \{\r?\n        console\.error\('localStorage is not accessible for classes data\.', e\);\r?\n        classes = sortClassesByName\(defaultClasses\);\r?\n    \}/;
if (r4.test(content)) {
    content = content.replace(r4,
        `// classes는 Supabase 동기화(initializeDataFromSupabase) 후 설정됩니다 - 기본값 사용 안 함\n    let classes = [];\n    try {\n        const storedClasses = localStorage.getItem('gongbubang_classes');\n        if (storedClasses) {\n            const parsed = JSON.parse(storedClasses);\n            if (Array.isArray(parsed)) {\n                classes = sortClassesByName(parsed.filter(c => c && typeof c === 'object'));\n            }\n        }\n    } catch (e) {\n        console.error('localStorage is not accessible for classes data.', e);\n        classes = [];\n    }`);
    console.log('✅ Fixed: classes init');
    count++;
} else { console.log('❌ NOT FOUND: classes init'); }

// ─────────────────────────────────────────────────────────────────────────────
fs.writeFileSync('main.js', content, 'utf8');
console.log(`\n${count > 0 ? '✅' : '⚠️'} Done! ${count} replacement(s) made.`);
