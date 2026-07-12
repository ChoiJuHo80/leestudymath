const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', 'main.js');
let content = fs.readFileSync(file, 'utf8');

// 1. Rename safeIntegerId to safeStringId and change its implementation
content = content.replace(/const safeIntegerId = \(rawId\) => \{[\s\S]*?return num % 1000000000;\r?\n    \};/, 
`const safeStringId = (rawId) => {
        if (rawId === null || rawId === undefined) return rawId;
        return String(rawId);
    };`);

// Replace all usages of safeIntegerId with safeStringId
content = content.replace(/safeIntegerId/g, 'safeStringId');

// 2. Replace id generation using Date.now() with crypto.randomUUID()
// Match patterns like: id: Date.now(), or id: Date.now() + 1, or id: Date.now() + Math.random()
// Regex explanation:
// id:\s*                 -> matches 'id:' followed by optional whitespace
// Date\.now\(\)          -> matches 'Date.now()'
// (?:[^,}\n]*)           -> matches any characters that are not comma, closing brace, or newline (e.g. ' + 1' or ' + Math.random()')
// ([,}\n])               -> captures the terminating character (comma, brace, or newline)
content = content.replace(/id:\s*Date\.now\(\)(?:[^,}\n]*)([,}\n])/g, 'id: crypto.randomUUID()$1');

// There is also one instance in mapCompletedVocabToDb:
// id: jsItem.id || Number(String(safeStringId(jsItem.vocabSetId)) + String(jsItem.studentId).replace(/[^\d]/g, '').slice(0, 5))
// We should change this to just generate a UUID or keep it as a string concatenation
content = content.replace(/Number\(String\(safeStringId\(jsItem\.vocabSetId\)\) \+ String\(jsItem\.studentId\)\.replace\(\/\[\^\\\\d\]\/g, ''\)\.slice\(0, 5\)\)/,
    "String(jsItem.vocabSetId) + '_' + String(jsItem.studentId)");

fs.writeFileSync(file, content, 'utf8');
console.log('main.js patched successfully.');
