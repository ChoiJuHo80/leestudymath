const fs = require('fs');

let code = fs.readFileSync('main.js', 'utf8');

const pStart = code.indexOf('        // Profile widget render');
if (pStart === -1) { console.error('Profile widget render not found'); process.exit(1); }
const pEnd = code.indexOf('        // Homework list render', pStart);

let newProfileCode = `        // Profile widget render
        if (infoWidget) {
            const targets = (isParentRole && parentChildren.length > 0) ? parentChildren : [student];
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
            
            // Render parent calendar (view only) - Use current child selector state
            if (myClassCalYear === null || myClassCalMonth === null) {
                const today = new Date();
                myClassCalYear = today.getFullYear();
                myClassCalMonth = today.getMonth();
            }
            const calTarget = window.currentCalStudentId || student.id;
            renderCalendar(calTarget, myClassCalYear, myClassCalMonth, 'myclass-calendar-grid-days', false);
        }

`;
code = code.slice(0, pStart) + newProfileCode + code.slice(pEnd);

// 2. Homework widget render
const hwStart = code.indexOf('        // Homework list render');
const hwEnd = code.indexOf('        // Handle Homework filter and pagination', hwStart);

let newHwCode = `        // Homework list render
        if (homeworkList) {
            homeworkList.innerHTML = '';
            const targets = (isParentRole && parentChildren.length > 0) ? parentChildren : [student];
            
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
            
            // Remove pagination for parent dashboard to keep it simple, or just hide the pagination UI
            const hwPagination = document.getElementById('myclass-homework-pagination');
            if (hwPagination) hwPagination.style.display = 'none';
        }

`;
code = code.slice(0, hwStart) + newHwCode + code.slice(hwEnd);

fs.writeFileSync('main.js', code, 'utf8');
console.log('main.js patched part 1');
