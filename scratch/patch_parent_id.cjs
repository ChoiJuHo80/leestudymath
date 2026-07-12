const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', 'main.js');
let content = fs.readFileSync(file, 'utf8');
let patchCount = 0;

function patch(id, oldStr, newStr) {
    if (content.includes(oldStr)) {
        content = content.replace(oldStr, newStr);
        console.log('PATCH ' + id + ' OK');
        patchCount++;
    } else {
        console.log('PATCH ' + id + ' NOT FOUND');
    }
}

// ============================================================
// PATCH: 부모 가입 시 ID를 이메일로 설정
// ============================================================
patch('PARENT_ID',
    `                                // Create locally in mock database with status 'pending'\r\n                                const localPendingUser = {\r\n                                    id: session.user.id,\r\n                                    email: userEmail,`,
    `                                // Create locally in mock database with status 'pending'\r\n                                const localPendingUser = {\r\n                                    id: userEmail,\r\n                                    email: userEmail,`
);

fs.writeFileSync(file, content, 'utf8');
console.log('DONE - ' + patchCount + ' patches applied');
