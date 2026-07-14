const fs = require('fs');
let code = fs.readFileSync('main.js', 'utf8');

// 1. Profile widget
const pStartStr = '        // Profile widget render\r\n        if (infoWidget) {';
let pStart = code.indexOf(pStartStr);
if (pStart === -1) pStart = code.indexOf('        // Profile widget render\n        if (infoWidget) {');

if (pStart !== -1) {
    let open = 0;
    let pEnd = -1;
    for (let i = pStart + pStartStr.length - 1; i < code.length; i++) {
        if (code[i] === '{') open++;
        if (code[i] === '}') {
            open--;
            if (open === 0) {
                pEnd = i + 1;
                break;
            }
        }
    }
    
    let newProfileCode = `        // Profile widget render
        if (infoWidget) {
            const targets = (isParentRole && parentChildren && parentChildren.length > 0) ? parentChildren : [student];
            let allProfilesHtml = '';

            targets.forEach(targetStudent => {
                const studentProgressList = progressList
                    .filter(p => p.studentId === targetStudent.id)
                    .sort((a, b) => new Date(b.date) - new Date(a.date));
                let progressListHtml = '';
                studentProgressList.forEach(prog => {
                    progressListHtml += \`
                        <div style="margin-top: 6px; border-bottom: 1px dashed var(--border-color); padding-bottom: 6px;">
                            <span style="font-size: 0.72rem; font-weight: 700; color: var(--mascot-green-bg); background: rgba(39, 39, 42, 0.08); padding: 1px 5px; border-radius: 4px; display: inline-block; margin-bottom: 2px;">\${prog.date}</span>
                            <div style="font-size: 0.8rem; color: var(--text-secondary); line-height: 1.4; white-space: pre-wrap;">\${prog.content}</div>
                        </div>
                    \`;
                });
                if (studentProgressList.length === 0) {
                    progressListHtml = '<div style="color: var(--text-muted); font-size: 0.8rem;">진도 기록이 없습니다.</div>';
                }

                const studentFeedbacks = feedbacks
                    .filter(f => f.studentId === targetStudent.id)
                    .sort((a, b) => new Date(b.date) - new Date(a.date));
                let feedbacksHtml = '';
                studentFeedbacks.forEach(fb => {
                    feedbacksHtml += \`
                        <div class="myclass-feedback-item" style="margin-top: 6px; border-bottom: 1px dashed var(--border-color); padding-bottom: 6px;">
                            <span style="font-size: 0.72rem; font-weight: 700; color: var(--mascot-purple-bg); background: rgba(142, 68, 173, 0.08); padding: 1px 5px; border-radius: 4px; display: inline-block; margin-bottom: 2px;">\${fb.date}</span>
                            <div style="font-size: 0.8rem; color: var(--text-secondary); line-height: 1.4; white-space: pre-wrap;">\${fb.content}</div>
                        </div>
                    \`;
                });
                if (studentFeedbacks.length === 0) {
                    feedbacksHtml = '<div style="color: var(--text-muted); font-size: 0.8rem;">피드백 기록이 없습니다.</div>';
                }

                allProfilesHtml += \`
                    <div style="border-bottom: 2px solid var(--border-color); margin-bottom: 20px; padding-bottom: 20px;">
                        <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 1px dashed var(--border-color); padding-bottom: 12px; margin-bottom: 14px;">
                            <div>
                                <h2 style="font-family: var(--ff-logo); font-size: 1.4rem; color: var(--text-primary); display: inline-block; margin-right: 8px; margin-bottom: 0;">\${targetStudent.name}</h2>
                                <span style="font-size: 0.85rem; color: var(--text-secondary); font-weight: 500;">\${targetStudent.age}세 &middot; \${targetStudent.school}</span>
                            </div>
                            <span class="student-sibling-tag" style="background: var(--primary-light); color: var(--primary-color); border: 1px solid var(--border-color); font-size: 0.7rem; padding: 4px 8px; border-radius: 6px; font-weight: 700;">자녀 연동 완료</span>
                        </div>
                        <div style="display: flex; flex-direction: column; gap: 8px; font-size: 0.85rem; margin-bottom: 16px; color: var(--text-secondary);">
                            <div><strong style="color: var(--text-primary);">대표 교재 / 과정:</strong> <span style="font-weight: 700; color: var(--primary-color);">\${targetStudent.progress}</span></div>
                            
                            <div style="margin-top: 6px; border-top: 1px dashed var(--border-color); padding-top: 10px;">
                                <strong style="color: var(--text-primary); display: block; margin-bottom: 6px;">학습 진도 기록 히스토리:</strong>
                                <div style="max-height: 120px; overflow-y: auto; padding-right: 4px;">
                                    \${progressListHtml}
                                </div>
                            </div>
                            
                            \${userRole === 'student' ? '' : \`
                            <div style="margin-top: 6px; border-top: 1px dashed var(--border-color); padding-top: 10px;">
                                <strong style="color: var(--text-primary); display: block; margin-bottom: 6px;">선생님 지도 피드백 기록:</strong>
                                <div class="myclass-feedback-list" style="max-height: 120px; overflow-y: auto; padding-right: 4px;">
                                    \${feedbacksHtml}
                                </div>
                            </div>
                            \`}
                        </div>
                    </div>
                \`;
            });
            
            infoWidget.innerHTML = allProfilesHtml;
            
            // Render parent calendar (view only)
            if (myClassCalYear === null || myClassCalMonth === null) {
                const today = new Date();
                myClassCalYear = today.getFullYear();
                myClassCalMonth = today.getMonth();
            }
            const calTarget = window.currentCalStudentId || student.id;
            renderCalendar(calTarget, myClassCalYear, myClassCalMonth, 'myclass-calendar-grid-days', false);
        }`;
    
    code = code.slice(0, pStart) + newProfileCode + code.slice(pEnd);
}

// 2. Homework widget
const hStartStr = '        // Homework list render\r\n        if (homeworkList) {';
let hStart = code.indexOf(hStartStr);
if (hStart === -1) hStart = code.indexOf('        // Homework list render\n        if (homeworkList) {');

if (hStart !== -1) {
    let open = 0;
    let hEnd = -1;
    for (let i = hStart + hStartStr.length - 1; i < code.length; i++) {
        if (code[i] === '{') open++;
        if (code[i] === '}') {
            open--;
            if (open === 0) {
                hEnd = i + 1;
                break;
            }
        }
    }
    
    let newHwCode = `        // Homework list render
        if (homeworkList) {
            homeworkList.innerHTML = '';
            const targets = (isParentRole && parentChildren && parentChildren.length > 0) ? parentChildren : [student];
            
            targets.forEach(targetStudent => {
                const studentHomework = homework.filter(h => String(h.studentId) === String(targetStudent.id));
                const pending = studentHomework.filter(h => !h.isCompleted);
                const completed = studentHomework.filter(h => h.isCompleted);
                
                let targetHwHtml = \`
                    <div style="margin-bottom: 24px;">
                        <h4 style="margin: 0 0 10px 0; font-size: 1.1rem; color: var(--text-primary); border-bottom: 2px solid var(--primary-light); padding-bottom: 4px; display: inline-block;">
                            \${targetStudent.name}의 과제
                        </h4>
                \`;
                
                if (studentHomework.length === 0) {
                    targetHwHtml += '<div style="color: var(--text-muted); font-size: 0.85rem; padding: 12px 0;">등록된 과제가 없습니다.</div>';
                } else {
                    if (pending.length > 0) {
                        targetHwHtml += pending.map(hw => \`
                            <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px 14px; background: #fff; border: 1px solid var(--border-color); border-radius: 12px; margin-bottom: 8px;">
                                <div>
                                    <div style="font-weight: 700; color: var(--text-primary); font-size: 0.9rem;">\${hw.title}</div>
                                    <div style="font-size: 0.75rem; color: var(--text-secondary); margin-top: 4px;">마감일: <span style="font-weight: 600; color: #ef4444;">\${hw.dueDate}</span></div>
                                </div>
                                <span style="font-size: 0.75rem; font-weight: 700; color: #ef4444; background: #fee2e2; padding: 4px 10px; border-radius: 20px;">대기 중</span>
                            </div>\`).join('');
                    }
                    if (completed.length > 0) {
                        targetHwHtml += completed.map(hw => \`
                            <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px 14px; background: #f8fafc; border: 1px solid var(--border-color); border-radius: 12px; margin-bottom: 8px;">
                                <div>
                                    <div style="font-weight: 700; color: var(--text-muted); font-size: 0.9rem; text-decoration: line-through;">\${hw.title}</div>
                                </div>
                                <span style="font-size: 0.75rem; font-weight: 700; color: #10b981; background: #d1fae5; padding: 4px 10px; border-radius: 20px;">완료</span>
                            </div>\`).join('');
                    }
                }
                
                targetHwHtml += '</div>';
                homeworkList.innerHTML += targetHwHtml;
            });
            
            const hwPagination = document.getElementById('myclass-homework-pagination');
            if (hwPagination) hwPagination.style.display = 'none';
        }
        
        // --- Parent Dashboard Enhancements ---
        if (isParentRole && parentChildren && parentChildren.length > 1) {
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
                        if (typeof renderDailyHabits === 'function') {
                            renderDailyHabits(child.id);
                        }
                        renderMyClass(); 
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
            
            const targetStudents = (parentChildren && parentChildren.length > 0) ? parentChildren : [student];
            let allGraded = [];
            targetStudents.forEach(child => {
                const childExams = (window.exams || []).filter(e => e.studentId === child.id && e.status === 'graded');
                childExams.forEach(e => allGraded.push({...e, childName: child.name}));
            });
            
            allGraded.sort((a, b) => new Date(b.date) - new Date(a.date));
            
            const gradeFilter = document.getElementById('parent-exam-grade-filter');
            const semesterFilter = document.getElementById('parent-exam-semester-filter');
            const gVal = gradeFilter ? gradeFilter.value : 'all';
            const sVal = semesterFilter ? semesterFilter.value : 'all';
            
            let filteredExams = allGraded;
            if (gVal !== 'all') filteredExams = filteredExams.filter(e => e.grade === gVal);
            if (sVal !== 'all') {
                filteredExams = filteredExams.filter(e => {
                    const month = new Date(e.date).getMonth() + 1;
                    const sem = month <= 7 ? '1학기' : '2학기';
                    return sem === sVal;
                });
            }
            
            if (filteredExams.length === 0) {
                if(examsList) examsList.innerHTML = '<div style="text-align:center;color:var(--text-muted);font-size:0.85rem;padding:20px 0;">채점된 시험지가 없습니다.</div>';
            } else {
                if(examsList) examsList.innerHTML = filteredExams.map(e => {
                    const prevExams = (window.exams || []).filter(pe => pe.studentId === e.studentId && pe.status === 'graded' && pe.subject === e.subject && new Date(pe.date) < new Date(e.date));
                    prevExams.sort((a, b) => new Date(b.date) - new Date(a.date));
                    let progressHtml = '';
                    if (prevExams.length > 0) {
                        const prevScore = prevExams[0].score || 0;
                        const diff = (e.score || 0) - prevScore;
                        if (diff > 0) progressHtml = \`<span style="font-size:0.75rem; color:#16a34a; background:#dcfce7; padding:2px 6px; border-radius:12px; font-weight:700;">▲ \${diff}점</span>\`;
                        else if (diff < 0) progressHtml = \`<span style="font-size:0.75rem; color:#dc2626; background:#fee2e2; padding:2px 6px; border-radius:12px; font-weight:700;">▼ \${Math.abs(diff)}점</span>\`;
                        else progressHtml = \`<span style="font-size:0.75rem; color:var(--text-secondary); background:#f1f5f9; padding:2px 6px; border-radius:12px; font-weight:700;">- 유지</span>\`;
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
                        </div>\`;
                }).join('');
            }
        }`;
    
    code = code.slice(0, hStart) + newHwCode + code.slice(hEnd);
}

fs.writeFileSync('main.js', code, 'utf8');
console.log('main.js patched with bracket matching');
