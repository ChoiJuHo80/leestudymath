const fs = require('fs');
const path = require('path');

const mainJsPath = path.join(__dirname, 'main.js');

try {
    let content = fs.readFileSync(mainJsPath, 'utf8');

    // Regex patch for HTML
    const schoolHtmlRegex = /<div class="form-group-modal"[^>]*>\s*<label[^>]*>학교 이름[^<]*<\/label>\s*<input type="text" class="child-school-input"[^>]*>\s*<\/div>/g;
    
    const newHtmlBlock = `<div class="form-group-modal-row-two" style="display: grid; grid-template-columns: 2fr 1fr; gap: 10px; margin-top: 8px;">
                <div class="form-group-modal" style="margin-bottom: 8px;">
                    <label style="font-size: 0.8rem; margin-bottom: 4px; font-weight: 700;">학교 이름 (예: 공부방초등학교)</label>
                    <input type="text" class="child-school-input" placeholder="예: 공부방초등학교" style="padding: 8px 12px; font-size: 0.85rem;">
                </div>
                <div class="form-group-modal" style="margin-bottom: 8px;">
                    <label style="font-size: 0.8rem; margin-bottom: 4px; font-weight: 700;">학년</label>
                    <input type="text" class="child-grade-input" placeholder="예: 3학년" style="padding: 8px 12px; font-size: 0.85rem;">
                </div>
            </div>`;
            
    content = content.replace(schoolHtmlRegex, newHtmlBlock);

    // Regex patch for extraction
    const extractionRegex = /const childSchool = block\.querySelector\('\.child-school-input'\) \? block\.querySelector\('\.child-school-input'\)\.value\.trim\(\) : '';\s*children\.push\(\{ name, birthdate, phone: childPhone, school: childSchool, username: childUsername, password: childPassword \}\);/g;

    const newExtraction = `const childSchool = block.querySelector('.child-school-input') ? block.querySelector('.child-school-input').value.trim() : '';
                    const childGrade = block.querySelector('.child-grade-input') ? block.querySelector('.child-grade-input').value.trim() : '';
                    children.push({ name, birthdate, phone: childPhone, school: childSchool, grade: childGrade, username: childUsername, password: childPassword });`;

    content = content.replace(extractionRegex, newExtraction);

    fs.writeFileSync(mainJsPath, content, 'utf8');
    console.log('main.js has been successfully updated via regex.');

} catch (err) {
    console.error('Failed to patch main.js:', err);
}
