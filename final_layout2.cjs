const fs = require('fs');
let code = fs.readFileSync('main.js', 'utf8');

// 1. Fix the main item flex direction using regex to ignore whitespace/newlines
code = code.replace(/item\.style\.display\s*=\s*'flex';\s*item\.style\.overflow\s*=\s*'hidden';\s*item\.style\.justifyContent\s*=\s*'space-between';\s*item\.style\.alignItems\s*=\s*'center';\s*item\.style\.padding\s*=\s*'12px 18px';/g,
`item.style.display = 'flex';
                item.style.flexDirection = 'column';
                item.style.gap = '12px';
                item.style.overflow = 'hidden';
                item.style.padding = '14px 18px';`);

fs.writeFileSync('main.js', code);
console.log("Applied final final layout fix");
