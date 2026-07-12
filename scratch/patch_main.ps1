$file = 'c:\Users\Administrator\Documents\WORK\main.js'
$content = [System.IO.File]::ReadAllText($file, [System.Text.Encoding]::UTF8)

# ============================================================
# PATCH 1: mapStudentFromDb - parent_email 필드 추가
# ============================================================
$old = "            isTerminated: dbStudent.is_terminated,`r`n            terminationDate: dbStudent.termination_date`r`n        };`r`n    };"
$new = "            isTerminated: dbStudent.is_terminated,`r`n            terminationDate: dbStudent.termination_date,`r`n            parentEmail: dbStudent.parent_email || ''`r`n        };`r`n    };"
if ($content.Contains($old)) { $content = $content.Replace($old, $new); Write-Host 'PATCH1 OK - mapStudentFromDb parent_email' }
else { Write-Host 'PATCH1 NOT FOUND' }

# ============================================================
# PATCH 2: mapStudentToDb - parent_email 컬럼 추가
# ============================================================
$old = "            is_terminated: jsStudent.isTerminated || false,`r`n            termination_date: jsStudent.terminationDate || null`r`n        };`r`n    };"
$new = "            is_terminated: jsStudent.isTerminated || false,`r`n            termination_date: jsStudent.terminationDate || null,`r`n            parent_email: jsStudent.parentEmail || ''`r`n        };`r`n    };"
if ($content.Contains($old)) { $content = $content.Replace($old, $new); Write-Host 'PATCH2 OK - mapStudentToDb parent_email' }
else { Write-Host 'PATCH2 NOT FOUND' }

# ============================================================
# PATCH 3: 자녀 입력 폼에 학교 필드 추가
# ============================================================
$old = "            <div class=`"form-group-modal`" style=`"margin-bottom: 8px;`">`r`n                    <label style=`"font-size: 0.8rem; margin-bottom: 4px; font-weight: 700;`">연락처 (선택)</label>`r`n                    <input type=`"text`" class=`"child-phone-input`" placeholder=`"010-0000-0000`" style=`"padding: 8px 12px; font-size: 0.85rem;`">`r`n                </div>`r`n            </div>`r`n            <div class=`"form-group-modal-row-two`" style=`"display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 8px;`">"
$new = "            <div class=`"form-group-modal`" style=`"margin-bottom: 8px;`">`r`n                    <label style=`"font-size: 0.8rem; margin-bottom: 4px; font-weight: 700;`">연락처 (선택)</label>`r`n                    <input type=`"text`" class=`"child-phone-input`" placeholder=`"010-0000-0000`" style=`"padding: 8px 12px; font-size: 0.85rem;`">`r`n                </div>`r`n            </div>`r`n            <div class=`"form-group-modal`" style=`"margin-bottom: 8px; margin-top: 8px;`">`r`n                <label style=`"font-size: 0.8rem; margin-bottom: 4px; font-weight: 700;`">학교 이름 (예: 공부방초등학교)</label>`r`n                <input type=`"text`" class=`"child-school-input`" placeholder=`"예: 공부방초등학교`" style=`"padding: 8px 12px; font-size: 0.85rem;`">`r`n            </div>`r`n            <div class=`"form-group-modal-row-two`" style=`"display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 8px;`">"
if ($content.Contains($old)) { $content = $content.Replace($old, $new); Write-Host 'PATCH3 OK - 학교 필드 추가' }
else { Write-Host 'PATCH3 NOT FOUND' }

# ============================================================
# PATCH 4: 자녀 데이터 수집 시 school 필드 포함
# ============================================================
$old = "                    children.push({ name, birthdate, phone: childPhone, username: childUsername, password: childPassword });"
$new = "                    const childSchool = block.querySelector('.child-school-input') ? block.querySelector('.child-school-input').value.trim() : '';" + "`r`n" + "                    children.push({ name, birthdate, phone: childPhone, school: childSchool, username: childUsername, password: childPassword });"
if ($content.Contains($old)) { $content = $content.Replace($old, $new); Write-Host 'PATCH4 OK - children.push school' }
else { Write-Host 'PATCH4 NOT FOUND' }

# ============================================================
# PATCH 5: 승인 시 id=username, parent_email, school, birthdate, await saveStudents
# ============================================================
$old = @"
                            const childrenData = u.user_metadata?.children || [];
                            childrenData.forEach((c, idx) => {
                                let exist = students.find(s => 
                                    (s.name === c.name && s.birthdate && s.birthdate === c.birthdate) ||
                                    (s.name === c.name && (s.parentPhone === u.phone || s.phone === c.phone))
                                );
                                let age = 10;
                                if (c.birthdate) {
                                    const birthYear = new Date(c.birthdate).getFullYear();
                                    age = new Date().getFullYear() - birthYear + 1;
                                }
                                if (!exist) {
                                    students.unshift({
                                        id: `${u.id}-${idx}`,
                                        name: c.name,
                                        age,
                                        school: '공부방 초등학교',
                                        phone: c.phone || '',
                                        parentPhone: u.phone,
                                        sibling: childrenData.length > 1 ? `${childrenData.length - 1}명의 형제자매` : '없음',
                                        schedule: { mon: '', tue: '', wed: '', thu: '', fri: '' },
                                        progress: '개념 완성 과정 등록 대기 중',
                                        remarks: '신규 가입 자녀입니다. 스케줄을 설정해 주세요.',
                                        username: c.username,
                                        password: c.password,
                                        address: u.address
                                    });
                                } else {
                                    exist.username = c.username;
                                    exist.password = c.password;
                                    exist.address = u.address;
                                    exist.id = `${u.id}-${idx}`;
                                }
                            });
                            
                            saveMockUsers(mockUsers);
                            saveStudents();
                            renderApprovalList();
"@
$new = @"
                            const childrenData = u.user_metadata?.children || [];
                            const parentEmail = u.email || '';
                            childrenData.forEach((c, idx) => {
                                const studentId = c.username || `${u.id}-${idx}`;
                                let exist = students.find(s =>
                                    String(s.id) === String(studentId) ||
                                    (s.name === c.name && s.birthdate && s.birthdate === c.birthdate) ||
                                    (s.name === c.name && (s.parentPhone === u.phone || s.phone === c.phone))
                                );
                                let age = 10;
                                if (c.birthdate) {
                                    const birthYear = new Date(c.birthdate).getFullYear();
                                    age = new Date().getFullYear() - birthYear + 1;
                                }
                                if (!exist) {
                                    students.unshift({
                                        id: studentId,
                                        name: c.name,
                                        age,
                                        birthdate: c.birthdate || '',
                                        school: c.school || '',
                                        phone: c.phone || '',
                                        parentPhone: u.phone,
                                        parentEmail: parentEmail,
                                        sibling: childrenData.length > 1 ? `${childrenData.length - 1}명의 형제자매` : '없음',
                                        schedule: { mon: '', tue: '', wed: '', thu: '', fri: '' },
                                        progress: '개념 완성 과정 등록 대기 중',
                                        remarks: '신규 가입 자녀입니다. 스케줄을 설정해 주세요.',
                                        username: c.username,
                                        password: c.password,
                                        address: u.address
                                    });
                                } else {
                                    exist.username = c.username;
                                    exist.password = c.password;
                                    exist.address = u.address;
                                    exist.birthdate = exist.birthdate || c.birthdate || '';
                                    exist.school = exist.school || c.school || '';
                                    exist.parentEmail = exist.parentEmail || parentEmail;
                                    exist.id = studentId;
                                }
                            });
                            
                            saveMockUsers(mockUsers);
                            await saveStudents();
                            renderApprovalList();
"@
if ($content.Contains($old)) { $content = $content.Replace($old, $new); Write-Host 'PATCH5 OK - 승인 로직 수정' }
else { Write-Host 'PATCH5 NOT FOUND' }

# ============================================================
# PATCH 6: 로그인 시 자녀 매칭 - parentEmail 기반 추가
# ============================================================
$old = @"
                // Match parent's children by either ID startsWith or parentPhone (avoid re-assigning IDs to prevent collisions)
                let parentChildren = students.filter(s => 
                    String(s.id).startsWith(session.user.id) || 
                    (parentPhone && s.parentPhone === parentPhone)
                );
"@
$new = @"
                // Match parent's children by username(=id), parentEmail, startsWith, or parentPhone
                const parentEmail = session.user.email || '';
                const childUsernames = childrenData.map(c => c.username).filter(Boolean);
                let parentChildren = students.filter(s =>
                    (childUsernames.length > 0 && childUsernames.includes(String(s.id))) ||
                    (parentEmail && s.parentEmail && s.parentEmail.toLowerCase() === parentEmail.toLowerCase()) ||
                    String(s.id).startsWith(session.user.id) ||
                    (parentPhone && s.parentPhone === parentPhone)
                );
"@
if ($content.Contains($old)) { $content = $content.Replace($old, $new); Write-Host 'PATCH6 OK - 로그인 자녀 매칭' }
else { Write-Host 'PATCH6 NOT FOUND' }

# ============================================================
# PATCH 7: 로그인 시 자녀 자동생성 - username=id, parentEmail, school, birthdate, await
# ============================================================
$old = @"
                if (parentChildren.length === 0 && childrenData.length > 0) {
                    childrenData.forEach((c, idx) => {
                        let age = 10;
                        if (c.birthdate) {
                            const birthYear = new Date(c.birthdate).getFullYear();
                            age = new Date().getFullYear() - birthYear + 1;
                        }
                        students.unshift({
                            id: `${session.user.id}-${idx}`,
                            name: c.name,
                            age,
                            school: '공부방 초등학교',
                            phone: c.phone || '',
                            parentPhone: parentPhone,
                            sibling: childrenData.length > 1 ? `${childrenData.length - 1}명의 형제자매` : '없음',
                            schedule: { mon: '', tue: '', wed: '', thu: '', fri: '' },
                            progress: '개념 완성 과정 등록 대기 중',
                            remarks: 'Supabase로 가입된 자녀입니다. 스케줄을 설정해 주세요.'
                        });
                    });
                    saveStudents();
                    parentChildren = students.filter(s => 
                        String(s.id).startsWith(session.user.id) || 
                        (parentPhone && s.parentPhone === parentPhone)
                    );
                }
"@
$new = @"
                if (parentChildren.length === 0 && childrenData.length > 0) {
                    childrenData.forEach((c, idx) => {
                        const studentId = c.username || `${session.user.id}-${idx}`;
                        if (students.some(s => String(s.id) === String(studentId))) return;
                        let age = 10;
                        if (c.birthdate) {
                            const birthYear = new Date(c.birthdate).getFullYear();
                            age = new Date().getFullYear() - birthYear + 1;
                        }
                        students.unshift({
                            id: studentId,
                            name: c.name,
                            age,
                            birthdate: c.birthdate || '',
                            school: c.school || '',
                            phone: c.phone || '',
                            parentPhone: parentPhone,
                            parentEmail: parentEmail,
                            sibling: childrenData.length > 1 ? `${childrenData.length - 1}명의 형제자매` : '없음',
                            schedule: { mon: '', tue: '', wed: '', thu: '', fri: '' },
                            progress: '개념 완성 과정 등록 대기 중',
                            remarks: 'Supabase로 가입된 자녀입니다. 스케줄을 설정해 주세요.',
                            username: c.username,
                            password: c.password,
                            address: u ? u.address : ''
                        });
                    });
                    await saveStudents();
                    parentChildren = students.filter(s =>
                        (childUsernames.length > 0 && childUsernames.includes(String(s.id))) ||
                        (parentEmail && s.parentEmail && s.parentEmail.toLowerCase() === parentEmail.toLowerCase()) ||
                        String(s.id).startsWith(session.user.id) ||
                        (parentPhone && s.parentPhone === parentPhone)
                    );
                }
"@
if ($content.Contains($old)) { $content = $content.Replace($old, $new); Write-Host 'PATCH7 OK - 로그인 자녀 자동생성' }
else { Write-Host 'PATCH7 NOT FOUND' }

# ============================================================
# PATCH 8: 승인 btn-approve 핸들러를 async로
# ============================================================
$old = "                    tr.querySelector('.btn-approve').addEventListener('click', () => {"
$new = "                    tr.querySelector('.btn-approve').addEventListener('click', async () => {"
if ($content.Contains($old)) { $content = $content.Replace($old, $new); Write-Host 'PATCH8 OK - async approve handler' }
else { Write-Host 'PATCH8 NOT FOUND' }

# ============================================================
# 파일 저장
# ============================================================
[System.IO.File]::WriteAllText($file, $content, [System.Text.Encoding]::UTF8)
Write-Host 'FILE SAVED'
