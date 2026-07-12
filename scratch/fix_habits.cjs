const fs = require('fs');
const content = fs.readFileSync('main.js', 'utf8');

// Fix 1: Admin habit seeding block
const adminSeedOld = [
    '        // Seed default habits if empty',
    '        let habits = [];',
    '        try {',
    "            const stored = localStorage.getItem('gongbubang_habits_admin');",
    '            habits = stored ? JSON.parse(stored) : null;',
    '        } catch(e) {}',
    '',
    '        if (!habits) {',
    '            habits = [',
    "                { id: 'ah1', text: '\ud559\uc6d0 \uc804\uccb4 \uccad\uc18c \ubc0f \ud658\uae30\ud558\uae30', frequency: 7 },",
    "                { id: 'ah2', text: '\uc624\ub298 \uc218\uc5c5 \uad50\uc7ac \ubc0f \ub9de\ucda4\ud615 \ud504\ub9b0\ud2b8 \uc900\ube44\ud558\uae30', frequency: 7 },",
    "                { id: 'ah3', text: '\ucd9c\uacb0 \ud604\ud669 \ud655\uc778 \ubc0f \ub4f1\uc6d0/\ud558\uc6d0 \ubb38\uc790 \ubc1c\uc1a1\ud558\uae30', frequency: 7 },",
    "                { id: 'ah4', text: '\uc2e0\uaddc \uc0c1\ub2f4 \uc608\uc57d \ubb38\uc758 \ub0b4\uc5ed \ud655\uc778 \ubc0f \uc5f0\ub77d\ud558\uae30', frequency: 7 },",
    "                { id: 'ah5', text: '\ube14\ub85c\uadf8 \uc18c\uc2dd\uc9c0 \ubc0f \uad50\uc721 \uc815\ubcf4 \uc5c5\ub370\uc774\ud2b8\ud558\uae30', frequency: 5 }",
    '            ];',
    "            saveStudentHabits('admin', habits);",
    '        }',
    '',
    '        // Fill missing frequencies (defaults to 7)',
    '        habits = habits.map(h => ({ ...h, frequency: h.frequency || 7 }));'
].join('\r\n');

const adminSeedNew = [
    '        // Supabase\ub97c \uc9c4\uc2e4\uc758 \uc6d0\ucc9c\uc73c\ub85c: \ub85c\uceec\uc2a4\ud1a0\ub9ac\uc9c0\uc5d0 \uc788\ub294 \ub370\uc774\ud130\ub9cc \uc0ac\uc6a9, \uc5c6\uc73c\uba74 \ube48 \ubc30\uc5f4',
    '        let habits = [];',
    '        try {',
    "            const stored = localStorage.getItem('gongbubang_habits_admin');",
    '            habits = stored ? JSON.parse(stored) : [];',
    '        } catch(e) { habits = []; }',
    '',
    '        // Fill missing frequencies (defaults to 7)',
    '        habits = habits.map(h => ({ ...h, frequency: h.frequency || 7 }));'
].join('\r\n');

// Fix 2: Student habit seeding block
const studentSeedOld = [
    '        // Seed default habits if empty',
    '        let habits = [];',
    '        try {',
    "            const stored = localStorage.getItem('gongbubang_habits_' + studentId);",
    '            habits = stored ? JSON.parse(stored) : null;',
    '        } catch(e) {}',
    '',
    '        if (!habits) {',
    '            habits = [',
    "                { id: 'h1', text: '\uae30\uc0c1 \ud6c4 \ubb3c 2\uc794 \ub9c8\uc2dc\uae30', frequency: 7 },",
    "                { id: 'h2', text: '\ud587\ube5b 10~20\ubd84 \ucb10\uae30', frequency: 7 },",
    "                { id: 'h3', text: '30\ubd84 \uac77\uae30', frequency: 7 },",
    "                { id: 'h4', text: '\ub2e8\ubc31\uc9c8 2~3\ubc88 \ucc59\uaca8 \uba39\uae30', frequency: 7 },",
    "                { id: 'h5', text: '\ucc44\uc18c\uc640 \uacfc\uc77c \uba39\uae30', frequency: 7 },",
    "                { id: 'h6', text: '\ubb3c 1.5~2L \ub9c8\uc2dc\uae30', frequency: 7 },",
    "                { id: 'h7', text: '\uc624\ud6c4 2\uc2dc \uc774\ud6c4 \uce74\ud398\uc778 \uc904\uc774\uae30', frequency: 7 }",
    '            ];',
    '            saveStudentHabits(studentId, habits);',
    '        }',
    '',
    '        // Fill missing frequencies (defaults to 7)',
    '        habits = habits.map(h => ({ ...h, frequency: h.frequency || 7 }));'
].join('\r\n');

const studentSeedNew = [
    '        // Supabase\ub97c \uc9c4\uc2e4\uc758 \uc6d0\ucc9c\uc73c\ub85c: \ub85c\uceec\uc2a4\ud1a0\ub9ac\uc9c0\uc5d0 \uc788\ub294 \ub370\uc774\ud130\ub9cc \uc0ac\uc6a9, \uc5c6\uc73c\uba74 \ube48 \ubc30\uc5f4',
    '        let habits = [];',
    '        try {',
    "            const stored = localStorage.getItem('gongbubang_habits_' + studentId);",
    '            habits = stored ? JSON.parse(stored) : [];',
    '        } catch(e) { habits = []; }',
    '',
    '        // Fill missing frequencies (defaults to 7)',
    '        habits = habits.map(h => ({ ...h, frequency: h.frequency || 7 }));'
].join('\r\n');

let newContent = content;

const c1 = newContent.includes(adminSeedOld);
const c2 = newContent.includes(studentSeedOld);
console.log('Admin seed found:', c1);
console.log('Student seed found:', c2);

if (c1) newContent = newContent.replace(adminSeedOld, adminSeedNew);
if (c2) newContent = newContent.replace(studentSeedOld, studentSeedNew);

fs.writeFileSync('main.js', newContent, 'utf8');
console.log('Done!');
console.log('Admin seed still present:', newContent.includes(adminSeedOld));
console.log('Student seed still present:', newContent.includes(studentSeedOld));
