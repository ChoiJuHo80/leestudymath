const fs = require('fs');
const path = require('path');

const mainJsPath = path.join(__dirname, 'main.js');

try {
    let content = fs.readFileSync(mainJsPath, 'utf8');

    // Patch 1: HTML block
    const targetBlock = `<div class="form-group-modal" style="margin-bottom: 8px; margin-top: 8px;">
                <label style="font-size: 0.8rem; margin-bottom: 4px; font-weight: 700;">학교 이름 (예: 공부방초등학교)</label>
                <input type="text" class="child-school-input" placeholder="예: 공부방초등학교" style="padding: 8px 12px; font-size: 0.85rem;">
            </div>`;
            
    const newBlock = `<div class="form-group-modal-row-two" style="display: grid; grid-template-columns: 2fr 1fr; gap: 10px; margin-top: 8px;">
                <div class="form-group-modal" style="margin-bottom: 8px;">
                    <label style="font-size: 0.8rem; margin-bottom: 4px; font-weight: 700;">학교 이름 (예: 공부방초등학교)</label>
                    <input type="text" class="child-school-input" placeholder="예: 공부방초등학교" style="padding: 8px 12px; font-size: 0.85rem;">
                </div>
                <div class="form-group-modal" style="margin-bottom: 8px;">
                    <label style="font-size: 0.8rem; margin-bottom: 4px; font-weight: 700;">학년</label>
                    <input type="text" class="child-grade-input" placeholder="예: 3학년" style="padding: 8px 12px; font-size: 0.85rem;">
                </div>
            </div>`;

    if (content.includes(targetBlock)) {
        content = content.replace(targetBlock, newBlock);
        console.log('Successfully patched the HTML block.');
    } else {
        console.log('Target HTML block not found. It might already be patched.');
    }

    // Patch 2: Data extraction
    const targetExtraction = `const childSchool = block.querySelector('.child-school-input') ? block.querySelector('.child-school-input').value.trim() : '';
                    children.push({ name, birthdate, phone: childPhone, school: childSchool, username: childUsername, password: childPassword });`;
                    
    const newExtraction = `const childSchool = block.querySelector('.child-school-input') ? block.querySelector('.child-school-input').value.trim() : '';
                    const childGrade = block.querySelector('.child-grade-input') ? block.querySelector('.child-grade-input').value.trim() : '';
                    children.push({ name, birthdate, phone: childPhone, school: childSchool, grade: childGrade, username: childUsername, password: childPassword });`;

    if (content.includes(targetExtraction)) {
        content = content.replace(targetExtraction, newExtraction);
        console.log('Successfully patched the data extraction logic.');
    } else {
        console.log('Target extraction logic not found. It might already be patched.');
    }

    fs.writeFileSync(mainJsPath, content, 'utf8');
    console.log('main.js has been successfully updated.');

} catch (err) {
    console.error('Failed to patch main.js:', err);
}
