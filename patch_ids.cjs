const fs = require('fs');
let code = fs.readFileSync('main.js', 'utf8');

// For renderClassList time schedule 2 lines issue
const oldSched = `const schedSummary = schedList.length > 0 ? schedList.join(', ') : '지정된 수업시간 없음';`;
const newSched = `const schedSummary = schedList.length > 0 ? schedList.join('<br>') : '지정된 수업시간 없음';`;
code = code.replace(oldSched, newSched);

// Fix the student vocab meaning rendering issue directly
const insertPoint = `container.appendChild(row);
            }`;
const newInsertPoint = `container.appendChild(row);
            }
            
            // Post-render enforcement for meaning inputs
            const forcedWords = container.querySelectorAll('.student-vocab-row-word');
            const forcedMeanings = container.querySelectorAll('.student-vocab-row-meaning');
            for (let i = 0; i < vocabRowCount; i++) {
                const wVal = (wordsData && wordsData[i]) ? (wordsData[i].word || '') : (currentInputs[i]?.word || '');
                const mVal = (wordsData && wordsData[i]) ? (wordsData[i].meaning || '') : (currentInputs[i]?.meaning || '');
                if (forcedWords[i]) forcedWords[i].value = wVal;
                if (forcedMeanings[i]) forcedMeanings[i].value = mVal;
            }
`;
code = code.replace(insertPoint, newInsertPoint);

// Regex matching exactly what is in the file.
// 1. Classes:
code = code.replace(/id:\s*crypto\.randomUUID\(\),\s*name:/, 'id: getNextSequentialId(classes),\n                        name:');

// 2. Admin Word Sets:
code = code.replace(/id:\s*crypto\.randomUUID\(\),\s*classId:\s*null,/, 'id: getNextSequentialId(wordSets),\n                        classId: null,');

// 3. Admin Word Sets with classId:
code = code.replace(/id:\s*crypto\.randomUUID\(\),\s*classId:\s*classId,/, 'id: getNextSequentialId(wordSets),\n                        classId: classId,');

// 4. Student Word Sets:
code = code.replace(/id:\s*crypto\.randomUUID\(\),\s*studentId:\s*loggedInStudentId,/, 'id: getNextSequentialId(wordSets),\n                    studentId: loggedInStudentId,');

fs.writeFileSync('main.js', code);
console.log("Patched!");
