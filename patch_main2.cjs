const fs = require('fs');

let code = fs.readFileSync('main.js', 'utf8');

// 3. Child selectors for calendar and habits
// At the end of renderMyClass (before `safeCreateIcons();`), we'll append some initialization logic.
const endOfRenderMyClass = code.indexOf('        const aiQueryDateList = document.getElementById(\'ai-query-date-list\');');
// We actually want to insert right before safeCreateIcons(); at the end of renderMyClass.
// But renderMyClass is huge and it has `renderMyClassAiHistory` inside it? No, wait.
// Let's just find `// Handle parent child selector display` or something similar at the top of renderMyClass, or just insert at the very end of `renderMyClass()`.
// Actually, I can just append my initialization code to the end of `renderMyClass`.
// The end of renderMyClass is where `safeCreateIcons();` is called at the end, but it might be inside a sub-function.
// Let's insert our logic right after the "Homework widget render" which we just replaced.

const hwEnd = code.indexOf('        // Handle Homework filter and pagination');
if (hwEnd !== -1) {
    const selectorCode = `
        // --- Parent Dashboard Enhancements ---
        if (isParentRole && parentChildren.length > 1) {
            const calSelector = document.getElementById('calendar-child-selector');
            if (calSelector) {
                calSelector.style.display = 'flex';
                calSelector.innerHTML = '';
                parentChildren.forEach(child => {
                    const btn = document.createElement('button');
                    btn.type = 'button';
                    btn.className = 'child-toggle-btn';
                    const isActive = String(child.id) === String(window.currentCalStudentId || student.id);
                    btn.style.cssText = isActive 
                        ? 'padding: 4px 10px; border-radius: 12px; font-size: 0.8rem; font-weight: 700; cursor: pointer; transition: all 0.2s; background: var(--primary-color); color: #fff; border: 1px solid var(--primary-color);'
                        : 'padding: 4px 10px; border-radius: 12px; font-size: 0.8rem; font-weight: 700; cursor: pointer; transition: all 0.2s; background: #fff; color: var(--text-secondary); border: 1px solid var(--border-color);';
                    btn.innerHTML = child.name;
                    btn.onclick = () => {
                        window.currentCalStudentId = child.id;
                        renderCalendar(child.id, myClassCalYear, myClassCalMonth, 'myclass-calendar-grid-days', false);
                        renderMyClass(); // re-render to update active state of buttons
                    };
                    calSelector.appendChild(btn);
                });
            }
            
            const habitSelector = document.getElementById('habit-child-selector');
            if (habitSelector) {
                habitSelector.style.display = 'flex';
                habitSelector.innerHTML = '';
                parentChildren.forEach(child => {
                    const btn = document.createElement('button');
                    btn.type = 'button';
                    btn.className = 'child-toggle-btn';
                    const isActive = String(child.id) === String(window.currentHabitStudentId || student.id);
                    btn.style.cssText = isActive 
                        ? 'padding: 4px 10px; border-radius: 12px; font-size: 0.8rem; font-weight: 700; cursor: pointer; transition: all 0.2s; background: var(--mascot-green-bg); color: #fff; border: 1px solid var(--mascot-green-bg);'
                        : 'padding: 4px 10px; border-radius: 12px; font-size: 0.8rem; font-weight: 700; cursor: pointer; transition: all 0.2s; background: #fff; color: var(--text-secondary); border: 1px solid var(--border-color);';
                    btn.innerHTML = child.name;
                    btn.onclick = () => {
                        window.currentHabitStudentId = child.id;
                        // Assuming renderHabitData exists or we can just trigger a re-render
                        // In main.js habit render relies on loggedInStudentId.
                        // We will need to intercept habit render if possible. But for now let's just set the variable and re-render the class.
                        // Wait, renderMyClass doesn't render habits. Habits are handled by renderDailyHabits.
                        if (typeof renderDailyHabits === 'function') {
                            renderDailyHabits(child.id);
                        }
                        renderMyClass(); // update active state
                    };
                    habitSelector.appendChild(btn);
                });
            }
        }
        
        // --- Graded Exams Widget ---
        const gradedExamsWidget = document.getElementById('parent-graded-exams-widget');
        if (gradedExamsWidget && isParentRole) {
            gradedExamsWidget.style.display = 'flex';
            const examsList = document.getElementById('parent-graded-exams-list');
            
            // Collect all graded exams for parentChildren
            const targetStudents = parentChildren.length > 0 ? parentChildren : [student];
            let allGraded = [];
            targetStudents.forEach(child => {
                const childExams = (window.exams || []).filter(e => e.studentId === child.id && e.status === 'graded');
                childExams.forEach(e => allGraded.push({...e, childName: child.name}));
            });
            
            // Sort by date descending
            allGraded.sort((a, b) => new Date(b.date) - new Date(a.date));
            
            // Filters
            const gradeFilter = document.getElementById('parent-exam-grade-filter').value;
            const semesterFilter = document.getElementById('parent-exam-semester-filter').value;
            
            let filteredExams = allGraded;
            if (gradeFilter !== 'all') {
                filteredExams = filteredExams.filter(e => e.grade === gradeFilter);
            }
            if (semesterFilter !== 'all') {
                // assume e.semester exists or calculate it
                filteredExams = filteredExams.filter(e => {
                    const month = new Date(e.date).getMonth() + 1;
                    const sem = month <= 7 ? '1학기' : '2학기';
                    return sem === semesterFilter;
                });
            }
            
            if (filteredExams.length === 0) {
                examsList.innerHTML = '<div style="text-align:center;color:var(--text-muted);font-size:0.85rem;padding:20px 0;">채점된 시험지가 없습니다.</div>';
            } else {
                examsList.innerHTML = filteredExams.map(e => {
                    // Calculate progress (+ or -)
                    // Find previous exam for this child in the same subject
                    const prevExams = (window.exams || []).filter(pe => pe.studentId === e.studentId && pe.status === 'graded' && pe.subject === e.subject && new Date(pe.date) < new Date(e.date));
                    prevExams.sort((a, b) => new Date(b.date) - new Date(a.date));
                    let progressHtml = '';
                    if (prevExams.length > 0) {
                        const prevScore = prevExams[0].score || 0;
                        const diff = (e.score || 0) - prevScore;
                        if (diff > 0) {
                            progressHtml = \`<span style="font-size:0.75rem; color:#16a34a; background:#dcfce7; padding:2px 6px; border-radius:12px; font-weight:700;">▲ \${diff}점</span>\`;
                        } else if (diff < 0) {
                            progressHtml = \`<span style="font-size:0.75rem; color:#dc2626; background:#fee2e2; padding:2px 6px; border-radius:12px; font-weight:700;">▼ \${Math.abs(diff)}점</span>\`;
                        } else {
                            progressHtml = \`<span style="font-size:0.75rem; color:var(--text-secondary); background:#f1f5f9; padding:2px 6px; border-radius:12px; font-weight:700;">- 유지</span>\`;
                        }
                    }
                
                    return \`
                        <div style="display:flex; justify-content:space-between; align-items:center; border:1px solid var(--border-color); border-radius:12px; padding:12px; background:#fff; cursor:pointer; transition:0.2s;" onmouseover="this.style.borderColor='var(--primary-color)';" onmouseout="this.style.borderColor='var(--border-color)';">
                            <div>
                                <div style="display:flex; align-items:center; gap:6px; margin-bottom:4px;">
                                    <span style="font-size:0.75rem; font-weight:700; color:var(--primary-color); background:var(--primary-light); padding:2px 8px; border-radius:12px;">\${e.childName}</span>
                                    <span style="font-size:0.75rem; color:var(--text-secondary);">\${e.grade} \${e.subject}</span>
                                </div>
                                <div style="font-weight:700; font-size:0.9rem; color:var(--text-primary);">\${e.title}</div>
                                <div style="font-size:0.75rem; color:var(--text-muted); margin-top:2px;">\${new Date(e.date).toLocaleDateString()}</div>
                            </div>
                            <div style="text-align:right;">
                                <div style="font-size:1.1rem; font-weight:800; color:var(--text-primary); margin-bottom:4px;">\${e.score || 0}점</div>
                                \${progressHtml}
                            </div>
                        </div>
                    \`;
                }).join('');
            }
        }
        // ----------------------------------------
        
`;
    code = code.slice(0, hwEnd) + selectorCode + code.slice(hwEnd);
}

fs.writeFileSync('main.js', code, 'utf8');
console.log('main.js patched part 2');
