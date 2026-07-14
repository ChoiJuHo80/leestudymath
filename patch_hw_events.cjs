const fs = require('fs');

const eventListenerCode = `

document.addEventListener('DOMContentLoaded', () => {
    const hwList = document.getElementById('myclass-homework-list');
    if (hwList) {
        hwList.addEventListener('change', async (e) => {
            if (e.target.classList.contains('homework-checkbox')) {
                const hwId = e.target.dataset.hwId;
                const isCompleted = e.target.checked;
                try {
                    const { error } = await supabase
                        .from('homework')
                        .update({ is_completed: isCompleted })
                        .eq('id', hwId);
                    if (error) throw error;
                    
                    const hwIndex = homework.findIndex(h => String(h.id) === String(hwId));
                    if (hwIndex !== -1) {
                        homework[hwIndex].isCompleted = isCompleted;
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
                        .from('homework')
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
        });
    }
});
`;

let mainJs = fs.readFileSync('main.js', 'utf8');

if (!mainJs.includes("e.target.classList.contains('homework-checkbox')")) {
    mainJs += eventListenerCode;
    fs.writeFileSync('main.js', mainJs, 'utf8');
    console.log('Appended event listener code to main.js');
} else {
    console.log('Event listener already exists in main.js');
}
