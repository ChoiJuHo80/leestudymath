const fs = require('fs');
let code = fs.readFileSync('main.js', 'utf8');

const targetStr = `                    alert('저장 중 오류가 발생했습니다.');
                }
            });
        }
});`;

const newLogic = `                    alert('저장 중 오류가 발생했습니다.');
                }
            });
        }
        
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
                    if (typeof saveHomework === 'function') await saveHomework();
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
                    if (typeof saveHomework === 'function') await saveHomework();
                    if (typeof renderMyClass === 'function') renderMyClass();
                }
            } catch (err) {
                console.error('Parent confirm error:', err);
                e.target.checked = !isConfirmed;
                alert('학부모 확인 업데이트에 실패했습니다.');
            }
        }
    });

});`;

if (code.includes("alert('저장 중 오류가 발생했습니다.');")) {
    code = code.replace(targetStr, newLogic);
    
    // Clean up any old appended listeners at the very bottom
    const bottomMarker = "document.addEventListener('DOMContentLoaded', () => {\\n    const hwList = document.getElementById('myclass-homework-list');";
    const bottomIndex = code.indexOf("document.addEventListener('DOMContentLoaded', () => {\n    const hwList = document.getElementById('myclass-homework-list');");
    if (bottomIndex !== -1) {
        code = code.substring(0, bottomIndex);
    }
    
    fs.writeFileSync('main.js', code, 'utf8');
    console.log('Successfully inserted the delegated listener inside the first DOMContentLoaded block.');
} else {
    console.log('Could not find target string.');
}
