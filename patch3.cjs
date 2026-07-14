const fs = require('fs');

// 1. Fix main.js homework checkboxes
let mainJs = fs.readFileSync('main.js', 'utf8');

// Replace pending logic
const oldPendingStr = `                    if (pending.length > 0) {
                        targetHwHtml += pending.map(hw => \`
                            <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px 14px; background: #fff; border: 1px solid var(--border-color); border-radius: 12px; margin-bottom: 8px;">
                                <div>
                                    <div style="font-weight: 700; color: var(--text-primary); font-size: 0.9rem;">\${hw.title}</div>
                                    <div style="font-size: 0.75rem; color: var(--text-secondary); margin-top: 4px;">마감일: <span style="font-weight: 600; color: #ef4444;">\${hw.dueDate}</span></div>
                                </div>
                                <span style="font-size: 0.75rem; font-weight: 700; color: #ef4444; background: #fee2e2; padding: 4px 10px; border-radius: 20px;">대기 중</span>
                            </div>\`).join('');
                    }`;

const newPendingStr = `                    if (pending.length > 0) {
                        targetHwHtml += pending.map(hw => \`
                            <div class="homework-item pending" style="display: flex; flex-direction: column; padding: 12px; border: 1px solid var(--border-color); border-radius: 12px; background: #fff; margin-bottom: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.02);">
                                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 6px;">
                                    <div style="flex-grow: 1; padding-right: 12px;">
                                        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                                            <input type="checkbox" class="homework-checkbox" data-hw-id="\${hw.id}" style="width: 16px; height: 16px; cursor: pointer;">
                                            <span style="color: var(--text-primary); font-size: 0.88rem; font-weight: 700;">\${hw.title}</span>
                                        </div>
                                        <div style="font-size: 0.8rem; color: var(--text-secondary); padding-left: 24px;">\${hw.description || ''}</div>
                                    </div>
                                    <div style="text-align: right; white-space: nowrap;">
                                        <span style="font-size: 0.72rem; font-weight: 700; color: #ef4444; background: #fee2e2; padding: 2px 6px; border-radius: 6px; display: block; margin-bottom: 2px;">대기 중</span>
                                        <span style="font-size: 0.65rem; color: #ef4444; display: block; font-weight: 600;">마감: \${hw.dueDate}</span>
                                    </div>
                                </div>
                            </div>\`).join('');
                    }`;

if (mainJs.includes(oldPendingStr)) {
    mainJs = mainJs.replace(oldPendingStr, newPendingStr);
    console.log('Patched pending homework checkboxes.');
} else {
    console.log('WARNING: Pending string not found.');
}


// Replace completed logic
const oldCompletedStr = `                    if (completed.length > 0) {
                        targetHwHtml += completed.map(hw => \`
                            <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px 14px; background: #f8fafc; border: 1px solid var(--border-color); border-radius: 12px; margin-bottom: 8px;">
                                <div>
                                    <div style="font-weight: 700; color: var(--text-muted); font-size: 0.9rem; text-decoration: line-through;">\${hw.title}</div>
                                </div>
                                <span style="font-size: 0.75rem; font-weight: 700; color: #10b981; background: #d1fae5; padding: 4px 10px; border-radius: 20px;">완료</span>
                            </div>\`).join('');
                    }`;

const newCompletedStr = `                    if (completed.length > 0) {
                        targetHwHtml += completed.map(hw => {
                            const parentChecked = hw.parentConfirmed ? 'checked' : '';
                            const parentDisableAttr = isParentRole ? '' : 'disabled';
                            const teacherConfirmTag = hw.teacherConfirmed 
                                ? '<span style="font-size: 0.68rem; font-weight: 700; color: #15803d; background: #e2fbe8; border: 1px solid #bbf7d0; padding: 2px 6px; border-radius: 6px; display: inline-block;">원장선생님 확인 완료</span>'
                                : '<span style="font-size: 0.68rem; font-weight: 600; color: var(--text-muted); background: #f1f5f9; border: 1px solid var(--border-color); padding: 2px 6px; border-radius: 6px; display: inline-block;">원장선생님 확인 전</span>';
                            
                            return \`
                            <div class="homework-item completed" style="display: flex; flex-direction: column; padding: 12px; border: 1px solid var(--border-color); border-radius: 12px; background: #f8fafc; margin-bottom: 8px; opacity: 0.95; box-shadow: 0 1px 3px rgba(0,0,0,0.01);">
                                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 6px;">
                                    <div style="flex-grow: 1; padding-right: 12px;">
                                        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                                            <input type="checkbox" class="homework-checkbox" data-hw-id="\${hw.id}" checked style="width: 16px; height: 16px; cursor: pointer;">
                                            <span style="color: var(--text-muted); text-decoration: line-through; font-size: 0.88rem; font-weight: 600;">\${hw.title}</span>
                                        </div>
                                        <div style="font-size: 0.8rem; color: var(--text-muted); padding-left: 24px; text-decoration: line-through;">\${hw.description || ''}</div>
                                    </div>
                                    <div style="text-align: right; white-space: nowrap;">
                                        <span style="font-size: 0.72rem; font-weight: 700; color: var(--mascot-green-bg); background: rgba(39, 39, 42, 0.08); padding: 2px 6px; border-radius: 6px; display: block; margin-bottom: 2px;">완료됨</span>
                                    </div>
                                </div>
                                <div style="display: flex; align-items: center; justify-content: space-between; border-top: 1px dashed var(--border-color); padding-top: 8px; margin-top: 4px; flex-wrap: wrap; gap: 8px;">
                                    <label style="display: inline-flex; align-items: center; gap: 6px; font-size: 0.75rem; font-weight: 700; color: var(--text-secondary); cursor: \${isParentRole ? 'pointer' : 'default'};">
                                        <input type="checkbox" class="parent-confirm-checkbox" data-hw-id="\${hw.id}" \${parentChecked} \${parentDisableAttr} style="width: 14px; height: 14px;">
                                        학부모 확인
                                    </label>
                                    <div>
                                        \${teacherConfirmTag}
                                    </div>
                                </div>
                            </div>\`;
                        }).join('');
                    }`;

if (mainJs.includes(oldCompletedStr)) {
    mainJs = mainJs.replace(oldCompletedStr, newCompletedStr);
    console.log('Patched completed homework checkboxes.');
} else {
    console.log('WARNING: Completed string not found.');
}
fs.writeFileSync('main.js', mainJs, 'utf8');

// 2. Hide specific quick menus in index.html for parents by giving them an ID and hiding them in JS, or changing the style dynamically
let indexHtml = fs.readFileSync('index.html', 'utf8');

const regexBadge = /(<a\s+href="#myclass-badges-widget-anchor")(\s+style="display: inline-flex;)/g;
if (regexBadge.test(indexHtml)) {
    indexHtml = indexHtml.replace(regexBadge, '$1 id="parent-menu-badge-link"$2');
    console.log('Added ID to badge link.');
}

const regexExam = /(<a\s+href="#myclass-exam-widget")(\s+style="display: inline-flex;)/g;
if (regexExam.test(indexHtml)) {
    indexHtml = indexHtml.replace(regexExam, '$1 id="parent-menu-exam-link"$2');
    console.log('Added ID to exam link.');
}

fs.writeFileSync('index.html', indexHtml, 'utf8');

// 3. In main.js, add the JS to hide these IDs when userRole === 'parent'
const roleCheckStr = `        // Update Top Navigation Bar UI
        const roleBadge = document.getElementById('navbar-user-role');`;
        
const roleCheckNew = `        // Hide specific quick menu links for parent
        if (userRole === 'parent') {
            const el1 = document.getElementById('parent-menu-badge-link');
            if (el1) el1.style.display = 'none';
            const el2 = document.getElementById('parent-menu-exam-link');
            if (el2) el2.style.display = 'none';
            const el3 = document.getElementById('parent-menu-chat');
            if (el3) el3.style.display = 'none';
        } else {
            const el1 = document.getElementById('parent-menu-badge-link');
            if (el1) el1.style.display = 'inline-flex';
            const el2 = document.getElementById('parent-menu-exam-link');
            if (el2) el2.style.display = 'inline-flex';
            const el3 = document.getElementById('parent-menu-chat');
            if (el3) el3.style.display = 'inline-flex';
        }

        // Update Top Navigation Bar UI
        const roleBadge = document.getElementById('navbar-user-role');`;

if (mainJs.includes(roleCheckStr) && !mainJs.includes('parent-menu-badge-link')) {
    mainJs = mainJs.replace(roleCheckStr, roleCheckNew);
    fs.writeFileSync('main.js', mainJs, 'utf8');
    console.log('Patched main.js to hide links for parent.');
}

