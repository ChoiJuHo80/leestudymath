const fs = require('fs');

try {
    let main = fs.readFileSync('main.js', 'utf8');

    // 1. Replace the HTML inside createChildInputBlock
    const mainTarget = '<input type="text" class="child-grade-input" placeholder="예: 3학년" style="padding: 8px 12px; font-size: 0.85rem;">';
                
    const mainReplacement = `<div style="position: relative;">
                        <input type="text" class="child-grade-input child-grade-text active-grade" placeholder="숫자만 입력" maxlength="2" style="padding: 8px 12px; font-size: 0.85rem; width: 100%; border: 1px solid var(--border-color); border-radius: 6px;">
                        <select class="child-grade-input child-grade-select" style="display: none; padding: 8px 12px; font-size: 0.85rem; width: 100%; border: 1px solid var(--border-color); border-radius: 6px; outline: none; background: #ffffff;">
                        </select>
                    </div>`;
                
    if (main.includes(mainTarget)) {
        main = main.replace(mainTarget, mainReplacement);
        console.log('main.js child-grade-input HTML patched');
    } else {
        console.log('mainTarget not found in main.js');
    }

    // 2. Add event listener logic
    const eventLogic = `
    const setupGradeInputLogic = () => {
        document.addEventListener('input', (e) => {
            const t = e.target;
            
            // Handle number-only for text grade input
            if (t.classList.contains('child-grade-text')) {
                t.value = t.value.replace(/[^0-9]/g, '');
            }

            // Handle school name changes to swap input/select
            if (t.classList.contains('child-school-input')) {
                const block = t.closest('.signup-child-block');
                if (block) {
                    const textInput = block.querySelector('.child-grade-text');
                    const selectInput = block.querySelector('.child-grade-select');
                    const val = t.value.trim();
                    
                    if (val.includes('초등')) {
                        textInput.style.display = 'none';
                        textInput.classList.remove('active-grade');
                        selectInput.style.display = 'block';
                        selectInput.classList.add('active-grade');
                        selectInput.innerHTML = '<option value="">선택</option>' + 
                            [1,2,3,4,5,6].map(n => \`<option value="\${n}">\${n}</option>\`).join('');
                    } else if (val.includes('중') || val.includes('고등') || val.includes('중학')) {
                        textInput.style.display = 'none';
                        textInput.classList.remove('active-grade');
                        selectInput.style.display = 'block';
                        selectInput.classList.add('active-grade');
                        selectInput.innerHTML = '<option value="">선택</option>' + 
                            [1,2,3].map(n => \`<option value="\${n}">\${n}</option>\`).join('');
                    } else {
                        selectInput.style.display = 'none';
                        selectInput.classList.remove('active-grade');
                        textInput.style.display = 'block';
                        textInput.classList.add('active-grade');
                        selectInput.innerHTML = '';
                    }
                }
            }
        });
    };
    setupGradeInputLogic();
`;

    // Replace value getter
    const gradeGetterTarget = "const childGrade = block.querySelector('.child-grade-input') ? block.querySelector('.child-grade-input').value.trim() : '';";
    const gradeGetterReplacement = "const activeGrade = block.querySelector('.active-grade') || block.querySelector('.child-grade-text');\n                    const childGrade = activeGrade ? activeGrade.value.trim() : '';";
    
    if (main.includes(gradeGetterTarget)) {
        main = main.split(gradeGetterTarget).join(gradeGetterReplacement);
        console.log('Replaced grade getter in main.js');
    } else {
        console.log('gradeGetterTarget not found in main.js');
    }

    const insertTarget = "setupBirthdateFocus();";
    if (main.includes(insertTarget) && !main.includes('setupGradeInputLogic')) {
        main = main.replace(insertTarget, insertTarget + '\n' + eventLogic);
        console.log('main.js eventLogic patched');
    } else {
        console.log('insertTarget not found or already patched in main.js');
    }
    
    fs.writeFileSync('main.js', main);
} catch (err) {
    console.error(err);
}
