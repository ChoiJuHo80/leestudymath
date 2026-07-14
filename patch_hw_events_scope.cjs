const fs = require('fs');
let code = fs.readFileSync('main.js', 'utf8');

const appendedBlock = `
document.addEventListener('DOMContentLoaded', () => {
    const hwList = document.getElementById('myclass-homework-list');
    if (hwList) {
        hwList.addEventListener('change', async (e) => {
            if (e.target.classList.contains('homework-checkbox')) {
                const hwId = e.target.dataset.hwId;
                const isCompleted = e.target.checked;
                try {
                    const hwIndex = homework.findIndex(h => String(h.id) === String(hwId));
                    if (hwIndex !== -1) {
                        homework[hwIndex].isCompleted = isCompleted;
                        homework[hwIndex].completedAt = isCompleted ? new Date().toISOString() : null;
                        if (typeof saveHomework === 'function') await saveHomework();
                        if (typeof renderMyClass === 'function') renderMyClass();
                        else if (typeof renderDashboard === 'function') renderDashboard();
                    }
                } catch (err) {
                    console.error('HW update error:', err);
                    e.target.checked = !isCompleted;
                    alert('과제 상태 업데이트에 실패했습니다.');
                }
            } else if (e.target.classList.contains('parent-confirm-checkbox')) {
                const hwId = e.target.dataset.hwId;
                const isConfirmed = e.target.checked;
                try {
                    const hwIndex = homework.findIndex(h => String(h.id) === String(hwId));
                    if (hwIndex !== -1) {
                        homework[hwIndex].parentConfirmed = isConfirmed;
                        if (typeof saveHomework === 'function') await saveHomework();
                        if (typeof renderMyClass === 'function') renderMyClass();
                        else if (typeof renderDashboard === 'function') renderDashboard();
                    }
                } catch (err) {
                    console.error('Parent confirm error:', err);
                    e.target.checked = !isConfirmed;
                    alert('학부모 확인 업데이트에 실패했습니다.');
                }
            }
        });
    }
});`;

// Remove the appended block at the bottom
let index = code.lastIndexOf("document.addEventListener('DOMContentLoaded'");
if (index > -1) {
    // Only remove if it matches our block approximately
    const tail = code.substring(index);
    if (tail.includes('myclass-homework-list') && tail.includes('homework-checkbox')) {
        code = code.substring(0, index);
    }
}

// Now insert the listener properly inside the first DOMContentLoaded block, which ends with:
//                     alert('저장 중 오류가 발생했습니다.');
//                 }
//             });
//         }
// });

const newLogic = `
    // Homework checkbox logic (delegated)
    document.body.addEventListener('change', async (e) => {
        if (e.target.classList.contains('homework-checkbox')) {
            const hwId = e.target.dataset.hwId;
            const isCompleted = e.target.checked;
            try {
                const hwIndex = homework.findIndex(h => String(h.id) === String(hwId));
                if (hwIndex !== -1) {
                    homework[hwIndex].isCompleted = isCompleted;
                    homework[hwIndex].completedAt = isCompleted ? new Date().toISOString() : null;
                    await saveHomework();
                    if (typeof renderMyClass === 'function') renderMyClass();
                }
            } catch (err) {
                console.error('HW update error:', err);
                e.target.checked = !isCompleted;
                alert('과제 상태 업데이트에 실패했습니다.');
            }
        } else if (e.target.classList.contains('parent-confirm-checkbox')) {
            const hwId = e.target.dataset.hwId;
            const isConfirmed = e.target.checked;
            try {
                const hwIndex = homework.findIndex(h => String(h.id) === String(hwId));
                if (hwIndex !== -1) {
                    homework[hwIndex].parentConfirmed = isConfirmed;
                    await saveHomework();
                    if (typeof renderMyClass === 'function') renderMyClass();
                }
            } catch (err) {
                console.error('Parent confirm error:', err);
                e.target.checked = !isConfirmed;
                alert('학부모 확인 업데이트에 실패했습니다.');
            }
        }
    });
`;

const insertTarget = `                    alert('저장 중 오류가 발생했습니다.');\n                }\n            });\n        }`;
code = code.replace(insertTarget, insertTarget + '\\n' + newLogic);

fs.writeFileSync('main.js', code, 'utf8');
console.log('Fixed scoping of homework event listener.');
