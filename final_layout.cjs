const fs = require('fs');
let code = fs.readFileSync('main.js', 'utf8');

// 1. Fix the main item flex direction
const oldOuter = `                item.style.display = 'flex';
                item.style.overflow = 'hidden';
                item.style.justifyContent = 'space-between';
                item.style.alignItems = 'center';
                item.style.padding = '12px 18px';`;
const newOuter = `                item.style.display = 'flex';
                item.style.flexDirection = 'column';
                item.style.gap = '12px';
                item.style.overflow = 'hidden';
                item.style.padding = '14px 18px';`;
code = code.replace(oldOuter, newOuter);

// 2. Fix the vocab-action-area double style attribute
const oldAction = `                        <div style="display: flex; align-items: center; gap: 8px;" style="flex-wrap: wrap; width: 100%;" class="vocab-action-area">`;
const newAction = `                        <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap; width: 100%;" class="vocab-action-area">`;
code = code.replace(oldAction, newAction);
code = code.replace(oldAction, newAction); // There are 2 instances

fs.writeFileSync('main.js', code);
console.log("Applied final layout fix");
