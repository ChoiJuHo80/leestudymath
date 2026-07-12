const fs = require('fs');

let main = fs.readFileSync('main.js', 'utf8');

// Target 1: <input type="date" class="child-birth-input"...>
const mainTarget = '<input type="date" class="child-birth-input" required style="padding: 7px 12px; font-size: 0.85rem;">';
const mainReplacement = `<div style="display: flex; gap: 4px;">
                        <input type="text" class="child-birth-y" placeholder="YYYY" maxlength="4" required style="padding: 7px 4px; font-size: 0.85rem; width: 45px; text-align: center; border: 1px solid var(--border-color); border-radius: 6px;">
                        <span style="display: flex; align-items: center; color: var(--text-secondary); font-weight: bold;">-</span>
                        <input type="text" class="child-birth-m" placeholder="MM" maxlength="2" required style="padding: 7px 4px; font-size: 0.85rem; width: 35px; text-align: center; border: 1px solid var(--border-color); border-radius: 6px;">
                        <span style="display: flex; align-items: center; color: var(--text-secondary); font-weight: bold;">-</span>
                        <input type="text" class="child-birth-d" placeholder="DD" maxlength="2" required style="padding: 7px 4px; font-size: 0.85rem; width: 35px; text-align: center; border: 1px solid var(--border-color); border-radius: 6px;">
                    </div>
                    <input type="hidden" class="child-birth-input">`;

if (main.includes(mainTarget)) {
    main = main.replace(mainTarget, mainReplacement);
    console.log('main.js child-birth-input HTML patched');
} else {
    console.log('mainTarget not found in main.js');
}

// Inject logic
const eventLogic = `
    const setupBirthdateFocus = () => {
        document.addEventListener('input', (e) => {
            const t = e.target;
            if (t.classList.contains('child-birth-y')) {
                t.value = t.value.replace(/[^0-9]/g, '');
                if (t.value.length === 4) {
                    const block = t.closest('.signup-child-block');
                    if (block) block.querySelector('.child-birth-m').focus();
                }
                updateHiddenBirth(t);
            } else if (t.classList.contains('child-birth-m')) {
                t.value = t.value.replace(/[^0-9]/g, '');
                if (t.value.length === 2) {
                    const block = t.closest('.signup-child-block');
                    if (block) block.querySelector('.child-birth-d').focus();
                }
                updateHiddenBirth(t);
            } else if (t.classList.contains('child-birth-d')) {
                t.value = t.value.replace(/[^0-9]/g, '');
                if (t.value.length === 2) {
                    const block = t.closest('.signup-child-block');
                    if (block) block.querySelector('.child-phone-input').focus();
                }
                updateHiddenBirth(t);
            }
        });

        const updateHiddenBirth = (target) => {
            const block = target.closest('.signup-child-block');
            if (block) {
                const y = block.querySelector('.child-birth-y').value;
                const m = block.querySelector('.child-birth-m').value;
                const d = block.querySelector('.child-birth-d').value;
                if (y && m && d) {
                    block.querySelector('.child-birth-input').value = \`\${y}-\${m.padStart(2,'0')}-\${d.padStart(2,'0')}\`;
                } else {
                    block.querySelector('.child-birth-input').value = '';
                }
            }
        };

        const py = document.getElementById('parent-child-birth-y');
        const pm = document.getElementById('parent-child-birth-m');
        const pd = document.getElementById('parent-child-birth-d');
        const hidden = document.getElementById('parent-child-birthdate-input');
        
        const updateParentHidden = () => {
            if (py.value && pm.value && pd.value) {
                hidden.value = \`\${py.value}-\${pm.value.padStart(2,'0')}-\${pd.value.padStart(2,'0')}\`;
            } else {
                hidden.value = '';
            }
        };

        if (py && pm && pd) {
            py.addEventListener('input', () => {
                py.value = py.value.replace(/[^0-9]/g, '');
                if (py.value.length === 4) pm.focus();
                updateParentHidden();
            });
            pm.addEventListener('input', () => {
                pm.value = pm.value.replace(/[^0-9]/g, '');
                if (pm.value.length === 2) pd.focus();
                updateParentHidden();
            });
            pd.addEventListener('input', () => {
                pd.value = pd.value.replace(/[^0-9]/g, '');
                if (pd.value.length === 2) {
                    const nextInput = document.getElementById('parent-child-username-input');
                    if (nextInput) nextInput.focus();
                }
                updateParentHidden();
            });
        }
    };
    setupBirthdateFocus();
`;

const insertTarget = "staticPhoneFields.forEach(id => {";
if (main.includes(insertTarget) && !main.includes('setupBirthdateFocus')) {
    main = main.replace(insertTarget, eventLogic + '\n    ' + insertTarget);
    console.log('main.js eventLogic patched');
} else {
    console.log('insertTarget not found or already patched in main.js');
}

fs.writeFileSync('main.js', main);
