const fs = require('fs');
let code = fs.readFileSync('main.js', 'utf8');

const oldListener = `hwList.addEventListener('change', async (e) => {
            if (e.target.classList.contains('homework-checkbox')) {
                const hwId = e.target.dataset.hwId;
                const isCompleted = e.target.checked;
                try {
                    const { error } = await supabase
                        .from('sb_homework')
                        .update({ status: isCompleted ? 'completed' : 'pending', submission_date: isCompleted ? new Date().toISOString() : null })
                        .eq('id', hwId);
                    if (error) throw error;
                    
                    const hwIndex = homework.findIndex(h => String(h.id) === String(hwId));
                    if (hwIndex !== -1) {
                        homework[hwIndex].isCompleted = isCompleted;
                        homework[hwIndex].completedAt = isCompleted ? new Date().toISOString() : null;
                        renderDashboard();
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
                    const { error } = await supabase
                        .from('sb_homework')
                        .update({ parent_confirmed: isConfirmed })
                        .eq('id', hwId);
                    if (error) throw error;
                    
                    const hwIndex = homework.findIndex(h => String(h.id) === String(hwId));
                    if (hwIndex !== -1) {
                        homework[hwIndex].parentConfirmed = isConfirmed;
                        renderDashboard();
                    }
                } catch (err) {
                    console.error('Parent confirm error:', err);
                    e.target.checked = !isConfirmed;
                    alert('학부모 확인 업데이트에 실패했습니다.');
                }
            }
        });`;

const newListener = `hwList.addEventListener('change', async (e) => {
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
        });`;

if (code.includes('await supabase')) {
    code = code.replace(oldListener, newListener);
    fs.writeFileSync('main.js', code, 'utf8');
    console.log('Fixed homework event listener to use saveHomework.');
} else {
    console.log('Could not find old listener to replace.');
}
