const fs = require('fs');
let code = fs.readFileSync('main.js', 'utf8');

// 1. Hide Badge Shelf for Parents
const parentBadgeTarget = `        if (isParentRole && parentChildren.length > 1 && childSelectContainer && childSelect) {`;
const parentBadgeReplacement = `        const badgeShelfWidget = document.getElementById('myclass-badge-shelf-widget');
        if (badgeShelfWidget) {
            badgeShelfWidget.style.display = isParentRole ? 'none' : 'flex';
        }
        
        if (isParentRole && parentChildren.length > 1 && childSelectContainer && childSelect) {`;
code = code.replace(parentBadgeTarget, parentBadgeReplacement);

// 2. Limit history to 3 items
const historyTarget = `const studentProgressList = progressList
                    .filter(p => p.studentId === targetStudent.id)
                    .sort((a, b) => new Date(b.date) - new Date(a.date));`;
const historyReplacement = `const studentProgressList = progressList
                    .filter(p => p.studentId === targetStudent.id)
                    .sort((a, b) => new Date(b.date) - new Date(a.date))
                    .slice(0, 3);`;
code = code.replace(historyTarget, historyReplacement);


// 3 & 4. Homework logic replacement
const hwStartMarker = `        // Homework list render\n        if (homeworkList) {\n            homeworkList.innerHTML = '';\n            const targets = (isParentRole && parentChildren && parentChildren.length > 0) ? parentChildren : [student];\n            \n            targets.forEach(targetStudent => {\n                const studentHomework = homework.filter(h => String(h.studentId) === String(targetStudent.id));\n                const pending = studentHomework.filter(h => !h.isCompleted);\n                const completed = studentHomework.filter(h => h.isCompleted);`;

// We need to replace a large chunk. 
// The chunk starts at `        // Homework list render` and ends around `homeworkList.innerHTML += targetHwHtml;\n            });\n            \n            const hwPagination = document.getElementById('myclass-homework-pagination');`

// Let's use string manipulation to find the bounds.
let startIndex = code.indexOf(`        // Homework list render\n        if (homeworkList) {`);
let endIndex = code.indexOf(`            const hwPagination = document.getElementById('myclass-homework-pagination');`);

if (startIndex !== -1 && endIndex !== -1) {
    let originalChunk = code.substring(startIndex, endIndex);
    
    let newChunk = `        // Homework list render
        if (homeworkList) {
            if (typeof window.myClassHwFilterYear === 'undefined') {
                window.myClassHwFilterYear = new Date().getFullYear();
                window.myClassHwFilterMonth = new Date().getMonth() + 1;
                window.myClassHwFilterStatus = 'all';
            }
            
            let filterHtml = \`
                <div style="display: flex; gap: 8px; margin-bottom: 16px; flex-wrap: wrap; align-items: center;">
                    <select id="myclass-hw-year-filter" style="padding: 6px 12px; border-radius: 8px; border: 1px solid var(--border-color); font-size: 0.85rem; font-family: 'Pretendard', sans-serif;">
                        \${[2024, 2025, 2026, 2027].map(y => \`<option value="\${y}" \${y === window.myClassHwFilterYear ? 'selected' : ''}>\${y}년</option>\`).join('')}
                    </select>
                    <select id="myclass-hw-month-filter" style="padding: 6px 12px; border-radius: 8px; border: 1px solid var(--border-color); font-size: 0.85rem; font-family: 'Pretendard', sans-serif;">
                        \${Array.from({length: 12}, (_, i) => i + 1).map(m => \`<option value="\${m}" \${m === window.myClassHwFilterMonth ? 'selected' : ''}>\${m}월</option>\`).join('')}
                    </select>
                    <select id="myclass-hw-status-filter" style="padding: 6px 12px; border-radius: 8px; border: 1px solid var(--border-color); font-size: 0.85rem; font-family: 'Pretendard', sans-serif;">
                        <option value="all" \${window.myClassHwFilterStatus === 'all' ? 'selected' : ''}>전체 상태</option>
                        <option value="pending" \${window.myClassHwFilterStatus === 'pending' ? 'selected' : ''}>미확인</option>
                        <option value="completed" \${window.myClassHwFilterStatus === 'completed' ? 'selected' : ''}>완료됨</option>
                    </select>
                </div>
            \`;

            let listHtml = '';
            const targets = (isParentRole && parentChildren && parentChildren.length > 0) ? parentChildren : [student];
            
            targets.forEach(targetStudent => {
                let studentHomework = homework.filter(h => String(h.studentId) === String(targetStudent.id));
                
                // Apply Year/Month Filter
                studentHomework = studentHomework.filter(h => {
                    // Try to parse dueDate or fallback to createdAt
                    const d = h.dueDate ? new Date(h.dueDate) : (h.createdAt ? new Date(h.createdAt) : new Date());
                    // Sometimes dueDate is 'YYYY-MM-DD'. new Date() handles it.
                    if (isNaN(d.getTime())) return true; // fallback if invalid date
                    return d.getFullYear() === window.myClassHwFilterYear && (d.getMonth() + 1) === window.myClassHwFilterMonth;
                });
                
                const pending = studentHomework.filter(h => !h.isCompleted);
                const completed = studentHomework.filter(h => h.isCompleted);
                
                let targetHwHtml = \`
                    <div style="margin-bottom: 24px;">
                        <h4 style="margin: 0 0 10px 0; font-size: 1.1rem; color: var(--text-primary); border-bottom: 2px solid var(--primary-light); padding-bottom: 4px; display: inline-block;">
                            \${targetStudent.name}의 과제
                        </h4>
                \`;
                
                if (studentHomework.length === 0) {
                    targetHwHtml += '<div style="color: var(--text-muted); font-size: 0.85rem; padding: 12px 0;">해당 월에 등록된 과제가 없습니다.</div>';
                } else {
                    if ((window.myClassHwFilterStatus === 'all' || window.myClassHwFilterStatus === 'pending') && pending.length > 0) {
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
                                        <span style="font-size: 0.65rem; color: #ef4444; display: block; font-weight: 600;">마감: \${hw.dueDate || '-'}</span>
                                    </div>
                                </div>
                            </div>\`).join('');
                    }
                    if ((window.myClassHwFilterStatus === 'all' || window.myClassHwFilterStatus === 'completed') && completed.length > 0) {
                        targetHwHtml += completed.map(hw => {
                            const parentChecked = hw.parentConfirmed ? 'checked' : '';
                            const parentDisableAttr = isParentRole ? '' : 'disabled';
                            const teacherConfirmTag = hw.teacherConfirmed 
                                ? '<span style="font-size: 0.68rem; font-weight: 700; color: #15803d; background: #e2fbe8; border: 1px solid #bbf7d0; padding: 2px 6px; border-radius: 6px; display: inline-block;">원장선생님 확인 완료</span>'
                                : '<span style="font-size: 0.68rem; font-weight: 600; color: var(--text-muted); background: #f1f5f9; border: 1px solid var(--border-color); padding: 2px 6px; border-radius: 6px; display: inline-block;">원장선생님 확인 전</span>';
                            
                            const isFullyConfirmed = hw.teacherConfirmed;
                            const mainDisableAttr = isFullyConfirmed ? 'disabled' : '';
                            const mainCursor = isFullyConfirmed ? 'not-allowed' : 'pointer';

                            return \`
                            <div class="homework-item completed" style="display: flex; flex-direction: column; padding: 12px; border: 1px solid var(--border-color); border-radius: 12px; background: #f8fafc; margin-bottom: 8px; opacity: 0.95; box-shadow: 0 1px 3px rgba(0,0,0,0.01);">
                                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 6px;">
                                    <div style="flex-grow: 1; padding-right: 12px;">
                                        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                                            <input type="checkbox" class="homework-checkbox" data-hw-id="\${hw.id}" checked \${mainDisableAttr} style="width: 16px; height: 16px; cursor: \${mainCursor};">
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
                    }
                }
                
                targetHwHtml += '</div>';
                listHtml += targetHwHtml;
            });
            
            homeworkList.innerHTML = filterHtml + listHtml;

            // Attach event listeners for filters
            setTimeout(() => {
                document.getElementById('myclass-hw-year-filter')?.addEventListener('change', (e) => {
                    window.myClassHwFilterYear = parseInt(e.target.value);
                    if (typeof renderMyClass === 'function') renderMyClass();
                });
                document.getElementById('myclass-hw-month-filter')?.addEventListener('change', (e) => {
                    window.myClassHwFilterMonth = parseInt(e.target.value);
                    if (typeof renderMyClass === 'function') renderMyClass();
                });
                document.getElementById('myclass-hw-status-filter')?.addEventListener('change', (e) => {
                    window.myClassHwFilterStatus = e.target.value;
                    if (typeof renderMyClass === 'function') renderMyClass();
                });
            }, 0);
            \n`;
            
    code = code.substring(0, startIndex) + newChunk + code.substring(endIndex);
    fs.writeFileSync('main.js', code, 'utf8');
    console.log('Successfully patched main.js for homework enhancements.');
} else {
    console.log('Failed to find chunk bounds.');
}
