const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', 'main.js');
let content = fs.readFileSync(file, 'utf8');
let patchCount = 0;

function patch(id, oldStr, newStr) {
    if (content.includes(oldStr)) {
        content = content.replace(oldStr, newStr);
        console.log('PATCH' + id + ' OK');
        patchCount++;
    } else {
        console.log('PATCH' + id + ' NOT FOUND');
    }
}

// ============================================================
// PATCH A: onAuthStateChange 콜백을 async로 변환
// ============================================================
patch('A',
    `supabase.auth.onAuthStateChange((event, session) => {`,
    `supabase.auth.onAuthStateChange(async (event, session) => {`
);

// ============================================================
// PATCH B: await saveStudents() - login autogen 부분 (이미 있으나 비동기 오류 방지용 확인)
// -> 이미 들어가 있으므로, async 콜백으로만 해결됨
// ============================================================

fs.writeFileSync(file, content, 'utf8');
console.log('DONE - ' + patchCount + ' patches applied');
