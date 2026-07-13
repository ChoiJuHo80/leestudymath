const fs = require('fs');
let code = fs.readFileSync('main.js', 'utf8');

// Replace flex direction
code = code.replace(`                item.style.display = 'flex';
                item.style.overflow = 'hidden';
                item.style.justifyContent = 'space-between';
                item.style.alignItems = 'center';
                item.style.padding = '12px 18px';`, 
`                item.style.display = 'flex';
                item.style.flexDirection = 'column';
                item.style.gap = '12px';
                item.style.overflow = 'hidden';
                item.style.padding = '14px 18px';`);

// Allow title to wrap
code = code.replace(/white-space:\s*nowrap;\s*overflow:\s*hidden;\s*text-overflow:\s*ellipsis;\s*min-width:\s*0;\s*flex:\s*1;/g, 
'word-break: keep-all; line-height: 1.4; flex: 1;');

// Wrap the two action areas
let count = 0;
code = code.replace(/class="vocab-action-area"/g, () => {
    count++;
    if (count <= 2) { // The first two match the student vocab sets
        return 'style="flex-wrap: wrap; width: 100%;" class="vocab-action-area"';
    }
    return 'class="vocab-action-area"';
});

// Also fix the flex direction of the first div so it aligns properly
let divCount = 0;
code = code.replace(/<div style="display: flex; align-items: center; gap: 8px; min-width: 0; flex: 1; overflow: hidden;">/g, () => {
    divCount++;
    if (divCount <= 2) {
        return '<div style="display: flex; align-items: flex-start; gap: 8px; width: 100%; min-width: 0;">';
    }
    return '<div style="display: flex; align-items: center; gap: 8px; min-width: 0; flex: 1; overflow: hidden;">';
});

fs.writeFileSync('main.js', code);
console.log("Fixed layout!");
