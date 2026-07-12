const fs = require('fs');
const file = 'main.js';
let content = fs.readFileSync(file, 'utf8');

// 1. replace init
content = content.replace(
    /let classes = \[\];\s*try\s*\{[^}]*gongbubang_classes[^}]*\}\s*catch\s*\([^)]*\)\s*\{[^}]*\}/s,
    'let classes = [];'
);

content = content.replace(
    /let students = \[\];\s*try\s*\{[^}]*gongbubang_students[^}]*\}\s*catch\s*\([^)]*\)\s*\{[^}]*\}/s,
    'let students = [];'
);

content = content.replace(
    /let resources = defaultResources;\s*try\s*\{[^}]*gongbubang_resources[^}]*\}\s*catch\s*\([^)]*\)\s*\{[^}]*\}/s,
    'let resources = [];'
);

content = content.replace(
    /let completedVocabSets = \[\];\s*try\s*\{[^}]*gongbubang_completed_vocab_sets[^}]*\}\s*catch\s*\([^)]*\)\s*\{\}/s,
    'let completedVocabSets = [];'
);

content = content.replace(
    /try\s*\{\s*mockUsers = JSON\.parse[^}]*\}\s*catch\s*\([^)]*\)\s*\{\}/s,
    ''
);

content = content.replace(
    /try\s*\{\s*const storedHw = localStorage\.getItem\('gongbubang_homework'\);.*?\}\s*catch\s*\([^)]*\)\s*\{\s*console\.error\('localStorage is not accessible for state tables\.',\s*e\);\s*\}/s,
    ''
);

// 2. update initializeDataFromSupabase start
content = content.replace(
    /console\.log\('\[Database Debug\] Starting initialization from Supabase\.\.\.'\);\s*try\s*\{/s,
    `console.log('[Database Debug] Starting initialization from Supabase...');
        const overlay = document.createElement('div');
        overlay.id = 'app-init-overlay';
        overlay.style.position = 'fixed';
        overlay.style.top = '0'; overlay.style.left = '0';
        overlay.style.width = '100vw'; overlay.style.height = '100vh';
        overlay.style.backgroundColor = 'rgba(255,255,255,0.9)';
        overlay.style.zIndex = '999999';
        overlay.style.display = 'flex';
        overlay.style.flexDirection = 'column';
        overlay.style.justifyContent = 'center';
        overlay.style.alignItems = 'center';
        overlay.innerHTML = \`
            <div style="border:4px solid #f3f3f3; border-top:4px solid #6C3AE8; border-radius:50%; width:40px; height:40px; animation:spin 1s linear infinite;"></div>
            <div style="margin-top:16px; font-weight:bold; color:#6C3AE8;">데이터 동기화 중...</div>
            <style>@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }</style>
        \`;
        document.body.appendChild(overlay);
        try {`
);

// 3. update initializeDataFromSupabase end
content = content.replace(
    /\/\/ Refresh all views dynamically\s*renderNotices\(\);\s*if\s*\(isAdmin\)\s*\{\s*renderStudents\(\);\s*renderConsultList\(\);\s*renderAdminCurriculumList\(\);\s*renderAiQueryManagement\(\);\s*if\s*\(typeof renderApprovalList === 'function'\)\s*renderApprovalList\(\);\s*\}\s*if\s*\(isStudent\)\s*\{\s*renderMyClass\(\);\s*\}\s*\}\s*catch\s*\(err\)\s*\{\s*console\.error\('\[Database Debug\] Exceptional error during Supabase sync:',\s*err\);\s*\}/s,
    `// Refresh all views dynamically
            if (typeof renderMainScheduleTable === 'function') renderMainScheduleTable();
            if (typeof renderNotices === 'function') renderNotices();
            
            if (isAdmin) {
                if (typeof renderStudents === 'function') renderStudents();
                if (typeof renderConsultList === 'function') renderConsultList();
                if (typeof renderAdminCurriculumList === 'function') renderAdminCurriculumList();
                if (typeof renderAiQueryManagement === 'function') renderAiQueryManagement();
                if (typeof renderApprovalList === 'function') renderApprovalList();
            }
            if (isStudent) {
                if (typeof renderMyClass === 'function') renderMyClass();
            }
        } catch (err) {
            console.error('[Database Debug] Exceptional error during Supabase sync:', err);
        } finally {
            const overlay = document.getElementById('app-init-overlay');
            if (overlay) overlay.remove();
        }`
);

fs.writeFileSync(file, content, 'utf8');
console.log('main.js patched successfully');
