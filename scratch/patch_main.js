const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', 'main.js');
let content = fs.readFileSync(file, 'utf8');
let patchCount = 0;

function patch(id, oldStr, newStr) {
    if (content.includes(oldStr)) {
        content = content.replace(oldStr, newStr);
        console.log('PATCH' + id + ' OK');
        patchCount++;
    } else {
        console.log('PATCH' + id + ' NOT FOUND');
    }
}

// ============================================================
// PATCH 1: mapStudentFromDb - parent_email 필드 추가
// ============================================================
patch(1,
    `            isTerminated: dbStudent.is_terminated,\r\n            terminationDate: dbStudent.termination_date\r\n        };\r\n    };`,
    `            isTerminated: dbStudent.is_terminated,\r\n            terminationDate: dbStudent.termination_date,\r\n            parentEmail: dbStudent.parent_email || ''\r\n        };\r\n    };`
);

// ============================================================
// PATCH 2: mapStudentToDb - parent_email 컬럼 추가
// ============================================================
patch(2,
    `            is_terminated: jsStudent.isTerminated || false,\r\n            termination_date: jsStudent.terminationDate || null\r\n        };\r\n    };`,
    `            is_terminated: jsStudent.isTerminated || false,\r\n            termination_date: jsStudent.terminationDate || null,\r\n            parent_email: jsStudent.parentEmail || ''\r\n        };\r\n    };`
);

// ============================================================
// PATCH 3: child block HTML - 학교 입력 필드 추가
// ============================================================
patch(3,
    `                </div>\r\n            </div>\r\n            <div class="form-group-modal-row-two" style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 8px;">`,
    `                </div>\r\n            </div>\r\n            <div class="form-group-modal" style="margin-bottom: 8px; margin-top: 8px;">\r\n                <label style="font-size: 0.8rem; margin-bottom: 4px; font-weight: 700;">\ud559\uad50 \uc774\ub984 (\uc608: \uacf5\ubd80\ubc29\ucd08\ub4f1\ud559\uad50)</label>\r\n                <input type="text" class="child-school-input" placeholder="\uc608: \uacf5\ubd80\ubc29\ucd08\ub4f1\ud559\uad50" style="padding: 8px 12px; font-size: 0.85rem;">\r\n            </div>\r\n            <div class="form-group-modal-row-two" style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 8px;">`
);

// ============================================================
// PATCH 4: 자녀 데이터 수집 시 school 필드 포함
// ============================================================
patch(4,
    `                    children.push({ name, birthdate, phone: childPhone, username: childUsername, password: childPassword });`,
    `                    const childSchool = block.querySelector('.child-school-input') ? block.querySelector('.child-school-input').value.trim() : '';\r\n                    children.push({ name, birthdate, phone: childPhone, school: childSchool, username: childUsername, password: childPassword });`
);

// ============================================================
// PATCH 5: 승인 핸들러 async 변환
// ============================================================
patch(5,
    `                    tr.querySelector('.btn-approve').addEventListener('click', () => {`,
    `                    tr.querySelector('.btn-approve').addEventListener('click', async () => {`
);

// ============================================================
// PATCH 6: 승인 시 자녀 생성 로직 수정 (id=username, parent_email, school, birthdate)
// ============================================================
patch(6,
    `                            const childrenData = u.user_metadata?.children || [];\r\n                            childrenData.forEach((c, idx) => {\r\n                                let exist = students.find(s => \r\n                                    (s.name === c.name && s.birthdate && s.birthdate === c.birthdate) ||\r\n                                    (s.name === c.name && (s.parentPhone === u.phone || s.phone === c.phone))\r\n                                );\r\n                                let age = 10;\r\n                                if (c.birthdate) {\r\n                                    const birthYear = new Date(c.birthdate).getFullYear();\r\n                                    age = new Date().getFullYear() - birthYear + 1;\r\n                                }\r\n                                if (!exist) {\r\n                                    students.unshift({\r\n                                        id: \`\${u.id}-\${idx}\`,\r\n                                        name: c.name,\r\n                                        age,\r\n                                        school: '\uacf5\ubd80\ubc29 \ucd08\ub4f1\ud559\uad50',\r\n                                        phone: c.phone || '',\r\n                                        parentPhone: u.phone,\r\n                                        sibling: childrenData.length > 1 ? \`\${childrenData.length - 1}\uba85\uc758 \ud615\uc81c\uc790\ub9e4\` : '\uc5c6\uc74c',\r\n                                        schedule: { mon: '', tue: '', wed: '', thu: '', fri: '' },\r\n                                        progress: '\uac1c\ub150 \uc644\uc131 \uacfc\uc815 \ub4f1\ub85d \ub300\uae30 \uc911',\r\n                                        remarks: '\uc2e0\uaddc \uac00\uc785 \uc790\ub140\uc785\ub2c8\ub2e4. \uc2a4\ucf00\uc904\uc744 \uc124\uc815\ud574 \uc8fc\uc138\uc694.',\r\n                                        username: c.username,\r\n                                        password: c.password,\r\n                                        address: u.address\r\n                                    });\r\n                                } else {\r\n                                    exist.username = c.username;\r\n                                    exist.password = c.password;\r\n                                    exist.address = u.address;\r\n                                    exist.id = \`\${u.id}-\${idx}\`;\r\n                                }\r\n                            });\r\n                            \r\n                            saveMockUsers(mockUsers);\r\n                            saveStudents();\r\n                            renderApprovalList();`,
    `                            const childrenData = u.user_metadata?.children || [];\r\n                            const parentEmail = u.email || '';\r\n                            childrenData.forEach((c, idx) => {\r\n                                const studentId = c.username || \`\${u.id}-\${idx}\`;\r\n                                let exist = students.find(s =>\r\n                                    String(s.id) === String(studentId) ||\r\n                                    (s.name === c.name && s.birthdate && s.birthdate === c.birthdate) ||\r\n                                    (s.name === c.name && (s.parentPhone === u.phone || s.phone === c.phone))\r\n                                );\r\n                                let age = 10;\r\n                                if (c.birthdate) {\r\n                                    const birthYear = new Date(c.birthdate).getFullYear();\r\n                                    age = new Date().getFullYear() - birthYear + 1;\r\n                                }\r\n                                if (!exist) {\r\n                                    students.unshift({\r\n                                        id: studentId,\r\n                                        name: c.name,\r\n                                        age,\r\n                                        birthdate: c.birthdate || '',\r\n                                        school: c.school || '',\r\n                                        phone: c.phone || '',\r\n                                        parentPhone: u.phone,\r\n                                        parentEmail: parentEmail,\r\n                                        sibling: childrenData.length > 1 ? \`\${childrenData.length - 1}\uba85\uc758 \ud615\uc81c\uc790\ub9e4\` : '\uc5c6\uc74c',\r\n                                        schedule: { mon: '', tue: '', wed: '', thu: '', fri: '' },\r\n                                        progress: '\uac1c\ub150 \uc644\uc131 \uacfc\uc815 \ub4f1\ub85d \ub300\uae30 \uc911',\r\n                                        remarks: '\uc2e0\uaddc \uac00\uc785 \uc790\ub140\uc785\ub2c8\ub2e4. \uc2a4\ucf00\uc904\uc744 \uc124\uc815\ud574 \uc8fc\uc138\uc694.',\r\n                                        username: c.username,\r\n                                        password: c.password,\r\n                                        address: u.address\r\n                                    });\r\n                                } else {\r\n                                    exist.username = c.username;\r\n                                    exist.password = c.password;\r\n                                    exist.address = u.address;\r\n                                    exist.birthdate = exist.birthdate || c.birthdate || '';\r\n                                    exist.school = exist.school || c.school || '';\r\n                                    exist.parentEmail = exist.parentEmail || parentEmail;\r\n                                    exist.id = studentId;\r\n                                }\r\n                            });\r\n                            \r\n                            saveMockUsers(mockUsers);\r\n                            await saveStudents();\r\n                            renderApprovalList();`
);

// ============================================================
// PATCH 7: 로그인 시 자녀 매칭 - parentEmail 기반
// ============================================================
patch(7,
    `                // Match parent's children by either ID startsWith or parentPhone (avoid re-assigning IDs to prevent collisions)\r\n                let parentChildren = students.filter(s => \r\n                    String(s.id).startsWith(session.user.id) || \r\n                    (parentPhone && s.parentPhone === parentPhone)\r\n                );`,
    `                // Match parent's children by username(=id), parentEmail, or parentPhone\r\n                const parentEmail = session.user.email || '';\r\n                const childUsernames = childrenData.map(c => c.username).filter(Boolean);\r\n                let parentChildren = students.filter(s =>\r\n                    (childUsernames.length > 0 && childUsernames.includes(String(s.id))) ||\r\n                    (parentEmail && s.parentEmail && s.parentEmail.toLowerCase() === parentEmail.toLowerCase()) ||\r\n                    String(s.id).startsWith(session.user.id) ||\r\n                    (parentPhone && s.parentPhone === parentPhone)\r\n                );`
);

// ============================================================
// PATCH 8: 로그인 시 자녀 자동생성 수정
// ============================================================
patch(8,
    `                if (parentChildren.length === 0 && childrenData.length > 0) {\r\n                    childrenData.forEach((c, idx) => {\r\n                        let age = 10;\r\n                        if (c.birthdate) {\r\n                            const birthYear = new Date(c.birthdate).getFullYear();\r\n                            age = new Date().getFullYear() - birthYear + 1;\r\n                        }\r\n                        students.unshift({\r\n                            id: \`\${session.user.id}-\${idx}\`,\r\n                            name: c.name,\r\n                            age,\r\n                            school: '\uacf5\ubd80\ubc29 \ucd08\ub4f1\ud559\uad50',\r\n                            phone: c.phone || '',\r\n                            parentPhone: parentPhone,\r\n                            sibling: childrenData.length > 1 ? \`\${childrenData.length - 1}\uba85\uc758 \ud615\uc81c\uc790\ub9e4\` : '\uc5c6\uc74c',\r\n                            schedule: { mon: '', tue: '', wed: '', thu: '', fri: '' },\r\n                            progress: '\uac1c\ub150 \uc644\uc131 \uacfc\uc815 \ub4f1\ub85d \ub300\uae30 \uc911',\r\n                            remarks: 'Supabase\ub85c \uac00\uc785\ub41c \uc790\ub140\uc785\ub2c8\ub2e4. \uc2a4\ucf00\uc904\uc744 \uc124\uc815\ud574 \uc8fc\uc138\uc694.'\r\n                        });\r\n                    });\r\n                    saveStudents();\r\n                    parentChildren = students.filter(s => \r\n                        String(s.id).startsWith(session.user.id) || \r\n                        (parentPhone && s.parentPhone === parentPhone)\r\n                    );\r\n                }`,
    `                if (parentChildren.length === 0 && childrenData.length > 0) {\r\n                    childrenData.forEach((c, idx) => {\r\n                        const studentId = c.username || \`\${session.user.id}-\${idx}\`;\r\n                        if (students.some(s => String(s.id) === String(studentId))) return;\r\n                        let age = 10;\r\n                        if (c.birthdate) {\r\n                            const birthYear = new Date(c.birthdate).getFullYear();\r\n                            age = new Date().getFullYear() - birthYear + 1;\r\n                        }\r\n                        students.unshift({\r\n                            id: studentId,\r\n                            name: c.name,\r\n                            age,\r\n                            birthdate: c.birthdate || '',\r\n                            school: c.school || '',\r\n                            phone: c.phone || '',\r\n                            parentPhone: parentPhone,\r\n                            parentEmail: parentEmail,\r\n                            sibling: childrenData.length > 1 ? \`\${childrenData.length - 1}\uba85\uc758 \ud615\uc81c\uc790\ub9e4\` : '\uc5c6\uc74c',\r\n                            schedule: { mon: '', tue: '', wed: '', thu: '', fri: '' },\r\n                            progress: '\uac1c\ub150 \uc644\uc131 \uacfc\uc815 \ub4f1\ub85d \ub300\uae30 \uc911',\r\n                            remarks: 'Supabase\ub85c \uac00\uc785\ub41c \uc790\ub140\uc785\ub2c8\ub2e4. \uc2a4\ucf00\uc904\uc744 \uc124\uc815\ud574 \uc8fc\uc138\uc694.',\r\n                            username: c.username,\r\n                            password: c.password\r\n                        });\r\n                    });\r\n                    await saveStudents();\r\n                    parentChildren = students.filter(s =>\r\n                        (childUsernames.length > 0 && childUsernames.includes(String(s.id))) ||\r\n                        (parentEmail && s.parentEmail && s.parentEmail.toLowerCase() === parentEmail.toLowerCase()) ||\r\n                        String(s.id).startsWith(session.user.id) ||\r\n                        (parentPhone && s.parentPhone === parentPhone)\r\n                    );\r\n                }`
);

fs.writeFileSync(file, content, 'utf8');
console.log('DONE - ' + patchCount + ' patches applied');
