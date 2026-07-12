const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', 'main.js');
let content = fs.readFileSync(file, 'utf8');
let patchCount = 0;

function patch(id, oldStr, newStr) {
    if (content.includes(oldStr)) {
        content = content.replace(oldStr, newStr);
        console.log('PATCH ' + id + ' OK');
        patchCount++;
    } else {
        console.log('PATCH ' + id + ' NOT FOUND');
    }
}

// 1. Child login: Fetch parent data from Supabase directly
patch('CHILD_LOGIN_PARENT_FETCH',
    `                        foundParent = mockUsers.find(u => u.phone === directStudent.parentPhone) || {\r\n                            id: 'parent-' + directStudent.id,\r\n                            status: 'approved',\r\n                            phone: directStudent.parentPhone || '010-0000-0000',\r\n                            address: directStudent.address || ''\r\n                        };`,
    `                        let parentData = null;
                        if (directStudent.parentEmail) {
                            const { data: dbParents } = await supabase.from('sb_mock_users').select('*').eq('email', directStudent.parentEmail);
                            if (dbParents && dbParents.length > 0) parentData = mapMockUserFromDb(dbParents[0]);
                        }
                        if (!parentData && directStudent.parentPhone) {
                            const { data: dbParents2 } = await supabase.from('sb_mock_users').select('*').eq('phone', directStudent.parentPhone);
                            if (dbParents2 && dbParents2.length > 0) parentData = mapMockUserFromDb(dbParents2[0]);
                        }
                        foundParent = parentData || mockUsers.find(u => u.phone === directStudent.parentPhone) || {
                            id: 'parent-' + directStudent.id,
                            status: 'approved',
                            phone: directStudent.parentPhone || '010-0000-0000',
                            email: directStudent.parentEmail || '',
                            address: directStudent.address || ''
                        };`
);

// 2. Parent Social Login Matcher: fallback to checking Supabase for existsInMockUsers
patch('PARENT_SOCIAL_MATCH_1',
    `                const existsInMockUsers = mockUsers.some(u => {\r\n                    if (u.id === session.user.id) return true;\r\n                    const uEmail = String(u.email || '').toLowerCase();\r\n                    const uPhone = normalizePhone(u.phone);\r\n                    return (userEmail && uEmail === userEmail.toLowerCase()) || (sessionPhone && uPhone && uPhone === sessionPhone);\r\n                });`,
    `                let existsInMockUsers = mockUsers.some(u => {
                    if (u.id === session.user.id) return true;
                    const uEmail = String(u.email || '').toLowerCase();
                    const uPhone = normalizePhone(u.phone);
                    return (userEmail && uEmail === userEmail.toLowerCase()) || (sessionPhone && uPhone && uPhone === sessionPhone);
                });
                
                if (!existsInMockUsers && typeof supabase !== 'undefined' && supabase && !isMock) {
                    if (userEmail) {
                        const { data } = await supabase.from('sb_mock_users').select('*').eq('email', userEmail);
                        if (data && data.length > 0) existsInMockUsers = true;
                    }
                    if (!existsInMockUsers && sessionPhone) {
                        const { data } = await supabase.from('sb_mock_users').select('*').eq('phone', sessionPhone);
                        if (data && data.length > 0) existsInMockUsers = true;
                    }
                }`
);

// 3. Prevent saveStudents from upserting local cache to Supabase if local is incomplete
// Actually, saveStudents already does `students.filter(s => changedIds.includes(...))` which is safe.
// But the issue was syncTable migrating data.
// Let's modify syncTable to NOT migrate empty localData if Supabase is empty (to prevent accidental wipe if they just started mobile).
// Actually, syncTable says `const dataToMigrate = localData.length > 0 ? localData : defaultData;` and inserts it.
// If it's a new mobile device, localData is empty, so it inserts defaultData. But wait! If they are a new mobile device, Supabase IS NOT EMPTY!
// So data.length > 0, and it fetches from Supabase. It doesn't overwrite!
// So why does data get twisted? 
// Because Kakao login creates a pending user in local mockUsers and saves it!
patch('SAVE_PENDING_USER_SYNC',
    `                                // Push and save\r\n                                mockUsers.push(localPendingUser);\r\n                                saveMockUsers(mockUsers);`,
    `                                // Push and save
                                mockUsers.push(localPendingUser);
                                if (typeof supabase !== 'undefined' && supabase && !isMock) {
                                    await supabase.from('sb_mock_users').upsert(mapMockUserToDb(localPendingUser));
                                } else {
                                    saveMockUsers(mockUsers);
                                }`
);

fs.writeFileSync(file, content, 'utf8');
console.log('main.js patched successfully. ' + patchCount + ' patches applied.');
