const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', 'main.js');
let content = fs.readFileSync(file, 'utf8');

// syncTable에서 data.length === 0 일 때 로컬 데이터를 강제로 다시 업로드하는 (마이그레이션) 로직을 제거하고,
// 무조건 Supabase의 상태(빈 상태면 빈 상태)를 우선하도록 수정합니다.
// 단, 시스템 구동에 필수적인 defaultData(예: 기본 공지사항, 기본 클래스 등)는 남겨둡니다.

const oldSyncTableLogic = `                    if (data.length === 0) {
                        const dataToMigrate = localData.length > 0 ? localData : defaultData;
                        if (dataToMigrate && dataToMigrate.length > 0) {
                            console.log(\`[Database Debug] Migrating \${dataToMigrate.length} rows to \${tableName}...\`);
                            const mappedRows = dataToMigrate.map(mapperToDb);
                            const { error: insertErr } = await supabase.from(tableName).insert(mappedRows);
                            if (insertErr) {
                                console.error(\`[Database Debug] Migration insert error for \${tableName}:\`, insertErr.message);
                            } else {
                                console.log(\`[Database Debug] Migration to \${tableName} succeeded.\`);
                            }
                        }
                        return dataToMigrate;
                    } else {
                        const fetchedData = data.map(mapperFromDb);
                        localStorage.setItem(localKey, JSON.stringify(fetchedData));
                        return fetchedData;
                    }`;

const newSyncTableLogic = `                    if (data.length === 0) {
                        // Supabase가 비어있다면, 로컬 캐시를 비우고 기본 데이터만 반환 (Single Source of Truth)
                        localStorage.setItem(localKey, JSON.stringify(defaultData || []));
                        return defaultData || [];
                    } else {
                        const fetchedData = data.map(mapperFromDb);
                        localStorage.setItem(localKey, JSON.stringify(fetchedData));
                        return fetchedData;
                    }`;

if (content.includes(oldSyncTableLogic)) {
    content = content.replace(oldSyncTableLogic, newSyncTableLogic);
    fs.writeFileSync(file, content, 'utf8');
    console.log('syncTable logic patched successfully.');
} else {
    console.log('oldSyncTableLogic not found in main.js');
}
