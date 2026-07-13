import { supabase } from '../supabase.js';
import { callGeminiVision } from './geminiApi.js';
import { getSemester } from './utils.js';

// Inject basic CSS for exams
const injectStyles = () => {
    if (document.getElementById('exam-manager-styles')) return;
    const style = document.createElement('style');
    style.id = 'exam-manager-styles';
    style.textContent = `
        .exam-section { margin-top: 20px; padding: 20px; background: #fff; border-radius: 12px; border: 1px solid var(--border-color); }
        .exam-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
        .exam-upload-btn { background: var(--primary-color); color: #fff; padding: 8px 16px; border: none; border-radius: 8px; cursor: pointer; font-weight: 700; }
        .exam-list { display: flex; flex-direction: column; gap: 12px; }
        .exam-card { display: flex; align-items: center; gap: 16px; padding: 12px; border: 1px solid #e2e8f0; border-radius: 8px; background: #f8fafc; cursor: pointer; transition: 0.2s; }
        .exam-card:hover { border-color: var(--primary-color); }
        .exam-thumb { width: 60px; height: 80px; object-fit: cover; border-radius: 4px; background: #ddd; }
        .exam-info { flex: 1; }
        .exam-title { font-weight: 700; color: var(--text-primary); margin-bottom: 4px; }
        .exam-meta { font-size: 0.8rem; color: var(--text-secondary); }
        .exam-status { padding: 4px 8px; border-radius: 50px; font-size: 0.75rem; font-weight: 700; }
        .status-ungraded { background: #fee2e2; color: #dc2626; }
        .status-graded { background: #dcfce7; color: #16a34a; }
        .score-trend.up { color: #16a34a; font-weight: bold; }
        .score-trend.down { color: #dc2626; font-weight: bold; }
        
        .exam-modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.6); z-index: 1000; display: none; align-items: center; justify-content: center; }
        .exam-modal-box { background: #fff; width: 90%; max-width: 600px; border-radius: 16px; padding: 24px; position: relative; max-height: 90vh; overflow-y: auto; }
        .exam-modal-box.admin-large { max-width: 900px; }
        .exam-modal-close { position: absolute; top: 16px; right: 16px; background: none; border: none; font-size: 1.5rem; cursor: pointer; }
        .exam-large-img { width: 100%; border-radius: 8px; margin-bottom: 16px; }
        
        .admin-exam-filters { display: flex; gap: 10px; margin-bottom: 20px; flex-wrap: wrap; }
        .admin-exam-select { padding: 8px; border-radius: 8px; border: 1px solid var(--border-color); font-size: 0.85rem; }
        .admin-exam-table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 0.85rem; }
        .admin-exam-table th, .admin-exam-table td { border: 1px solid var(--border-color); padding: 8px 12px; text-align: left; }
        .admin-exam-table th { background: #f8fafc; font-weight: 700; }
        .filter-btn-group { display: flex; gap: 8px; margin-top: 10px; margin-bottom: 10px; }
        .filter-btn { padding: 6px 12px; border-radius: 20px; border: 1px solid var(--border-color); background: #fff; cursor: pointer; font-size: 0.8rem; font-weight: 700; }
        .filter-btn.active { background: var(--primary-color); color: #fff; border-color: var(--primary-color); }
    `;
    document.head.appendChild(style);
};

// Helper: Calculate Semester based on date
const getSemester = (dateStr) => {
    const d = new Date(dateStr);
    return d.getMonth() < 7 ? 1 : 2; // Jan-Jul = 1, Aug-Dec = 2
};

// Helper: Get Mock Image URL (for testing without actual upload)
const getMockImageUrl = () => `https://picsum.photos/seed/${Math.random()}/400/600`;

export const initStudentExamView = async (studentId, containerSelector = '#myclass') => {
    injectStyles();
    const container = document.querySelector(containerSelector);
    if (!container) return;

    // Remove existing if any
    const existing = document.getElementById('student-exam-section');
    if (existing) existing.remove();

    const section = document.createElement('div');
    section.id = 'student-exam-section';
    section.className = 'exam-section';
    
    section.innerHTML = `
        <div class="exam-header">
            <h3><i data-lucide="file-text" style="width:18px;height:18px;vertical-align:middle;margin-right:6px;"></i>내 시험지함</h3>
            <input type="file" id="exam-upload-input" accept="image/*" multiple style="display:none;" />
            <button id="btn-upload-exam" class="exam-upload-btn">시험지 업로드</button>
        </div>
        <div id="student-exam-list" class="exam-list">로딩 중...</div>
    `;
    container.appendChild(section);
    if (window.lucide) window.lucide.createIcons();

    const loadExams = async () => {
        const { data: exams, error } = await supabase
            .from('exams')
            .select('*')
            .eq('student_id', studentId)
            .order('upload_date', { ascending: true });

        const listContainer = document.getElementById('student-exam-list');
        if (error) {
            listContainer.innerHTML = '<p>시험지 기록을 불러오지 못했습니다.</p>';
            return;
        }

        if (!exams || exams.length === 0) {
            listContainer.innerHTML = '<p style="color:var(--text-secondary); font-size:0.9rem;">업로드된 시험지가 없습니다.</p>';
            return;
        }

        listContainer.innerHTML = '';
        let previousScore = null;

        exams.forEach(ex => {
            const isGraded = ex.status === '채점완료';
            let trendHtml = '';
            if (isGraded && previousScore !== null) {
                const diff = ex.final_score - previousScore;
                if (diff > 0) trendHtml = `<span class="score-trend up">▲ +${diff}점</span>`;
                else if (diff < 0) trendHtml = `<span class="score-trend down">▼ ${diff}점</span>`;
                else trendHtml = `<span style="color: gray;">- (동일)</span>`;
            }
            if (isGraded) previousScore = ex.final_score;

            let urls = [];
            try {
                urls = JSON.parse(ex.image_url);
                if (!Array.isArray(urls)) urls = [ex.image_url];
            } catch (e) {
                urls = [ex.image_url];
            }
            const firstImg = urls[0];
            const extraCount = urls.length > 1 ? urls.length - 1 : 0;
            const badgeHtml = extraCount > 0 ? `<div style="position:absolute; top:5px; left:5px; background:rgba(0,0,0,0.7); color:#fff; font-size:11px; padding:2px 6px; border-radius:10px; font-weight:bold;">+${extraCount}장</div>` : '';

            const card = document.createElement('div');
            card.className = 'exam-card';
            card.innerHTML = `
                <div style="position:relative; width:60px; height:60px; flex-shrink:0;">
                    <img src="${firstImg}" class="exam-thumb" alt="시험지" style="width:100%; height:100%; object-fit:cover;">
                    ${badgeHtml}
                </div>
                <div class="exam-info">
                    <div class="exam-title">${ex.semester}학기 ${ex.sequence}번째 시험지</div>
                    <div class="exam-meta">업로드: ${new Date(ex.upload_date).toLocaleDateString()}</div>
                    ${isGraded ? `<div style="font-weight:700; margin-top:4px;">점수: ${ex.final_score}점 ${trendHtml}</div>` : ''}
                </div>
                <div>
                    <span class="exam-status ${isGraded ? 'status-graded' : 'status-ungraded'}">${ex.status}</span>
                </div>
            `;
            listContainer.appendChild(card);
        });
    };

    await loadExams();

    const uploadInput = document.getElementById('exam-upload-input');
    const uploadBtn = document.getElementById('btn-upload-exam');

    uploadBtn.addEventListener('click', () => {
        uploadInput.click();
    });

    uploadInput.addEventListener('change', async (e) => {
        let files = Array.from(e.target.files);
        if (!files || files.length === 0) return;

        if (files.length > 6) {
            alert('사진은 한 번에 최대 6장까지만 업로드할 수 있습니다.');
            uploadInput.value = ''; // Reset
            return;
        }

        uploadBtn.disabled = true;
        uploadBtn.textContent = '업로드 중...';

        try {
            const uploadedUrls = [];
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                const fileExt = file.name.split('.').pop();
                const fileName = `${studentId}_${Date.now()}_${i}.${fileExt}`;
                const { error: uploadError } = await supabase.storage
                    .from('exam-papers')
                    .upload(fileName, file);
                
                if (uploadError) throw uploadError;

                const { data: publicUrlData } = supabase.storage
                    .from('exam-papers')
                    .getPublicUrl(fileName);
                
                uploadedUrls.push(publicUrlData.publicUrl);
            }

            const imageUrlString = JSON.stringify(uploadedUrls);

            // Calculate next sequence
            const { data: existingExams } = await supabase.from('exams').select('semester, sequence').eq('student_id', studentId);
            const currentSem = getSemester(new Date().toISOString());
            const semExams = (existingExams || []).filter(ex => ex.semester === currentSem);
            const nextSeq = semExams.length + 1;

            // Insert into exams table
            const { error: dbError } = await supabase.from('exams').insert([{
                student_id: studentId,
                image_url: imageUrlString,
                semester: currentSem,
                sequence: nextSeq,
                status: '미채점'
            }]);

            if (dbError) throw dbError;

            if (typeof showToast === 'function') showToast('시험지가 성공적으로 업로드되었습니다.');
            else alert('시험지 업로드 완료!');
            
            await loadExams();
        } catch (error) {
            console.error('Upload error:', error);
            alert('업로드 중 오류가 발생했습니다: ' + error.message);
        } finally {
            uploadBtn.disabled = false;
            uploadBtn.textContent = '시험지 업로드';
            uploadInput.value = ''; // Reset
        }
    });
};

export const initTeacherExamView = (studentContainer, student) => {
    // Append a button to the student card
    const btn = document.createElement('button');
    btn.className = 'btn-secondary';
    btn.style.marginTop = '10px';
    btn.style.width = '100%';
    btn.innerHTML = '<i data-lucide="check-square" style="width:14px;height:14px;"></i> 시험지 채점 및 관리';
    
    btn.addEventListener('click', () => {
        openTeacherExamModal(student);
    });

    studentContainer.appendChild(btn);
    if (window.lucide) window.lucide.createIcons();
};

const openTeacherExamModal = async (student) => {
    let modal = document.getElementById('teacher-exam-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'teacher-exam-modal';
        modal.className = 'exam-modal-overlay';
        document.body.appendChild(modal);
    }

    modal.innerHTML = `
        <div class="exam-modal-box">
            <button class="exam-modal-close" onclick="document.getElementById('teacher-exam-modal').style.display='none'">&times;</button>
            <h2 style="margin-bottom:16px;">${student.name} 학생의 시험지 목록</h2>
            <div id="teacher-exam-list" class="exam-list">로딩 중...</div>
            <div id="teacher-exam-detail" style="display:none; margin-top: 20px; border-top: 1px solid #ddd; padding-top:20px;">
                <h3 id="detail-title"></h3>
                <div id="detail-img-container" style="display:flex; flex-direction:column; gap:10px; max-height: 50vh; overflow-y:auto; border: 1px solid #ddd; padding: 10px; border-radius: 8px;"></div>
                
                <div id="ai-grading-container" style="display:none; margin-top:15px; padding:15px; background:#f8fafc; border-radius:8px; border:1px solid #e2e8f0;">
                    <h4 style="margin-bottom:10px;">가채점 결과 (수정 가능)</h4>
                    <table class="admin-table" style="width:100%; text-align:center;">
                        <thead>
                            <tr>
                                <th>문제</th>
                                <th>AI 도출 정답</th>
                                <th>학생 답안</th>
                                <th>채점결과</th>
                            </tr>
                        </thead>
                        <tbody id="ai-result-tbody"></tbody>
                    </table>
                    <div style="text-align:right; margin-top:10px; font-weight:bold; font-size:1.1em;" id="ai-total-score"></div>
                </div>

                <div style="display:flex; gap:10px; margin-top:15px;">
                    <button id="btn-auto-grade" class="btn-primary" style="flex:1;">AI 가채점 시작</button>
                    <button id="btn-manual-score" class="btn-secondary" style="flex:1; display:none;">최종 채점 적용 (저장)</button>
                </div>
            </div>
        </div>
    `;
    modal.style.display = 'flex';

    const loadTeacherExams = async () => {
        const { data: exams, error } = await supabase.from('exams').select('*').eq('student_id', student.id).order('upload_date', { ascending: true });
        const listEl = document.getElementById('teacher-exam-list');
        
        if (error || !exams || exams.length === 0) {
            listEl.innerHTML = '<p>제출된 시험지가 없습니다.</p>';
            return;
        }

        listEl.innerHTML = '';
        exams.forEach(ex => {
            const isGraded = ex.status === '채점완료';
            const card = document.createElement('div');
            card.className = 'exam-card';
            card.innerHTML = `
                <div class="exam-info">
                    <div class="exam-title">${ex.semester}학기 ${ex.sequence}번째</div>
                    <div class="exam-meta">제출일: ${new Date(ex.upload_date).toLocaleDateString()}</div>
                </div>
                <span class="exam-status ${isGraded ? 'status-graded' : 'status-ungraded'}">${ex.status} ${isGraded ? ex.final_score+'점' : ''}</span>
            `;
            card.addEventListener('click', () => showExamDetail(ex));
            listEl.appendChild(card);
        });
    };

    const showExamDetail = (ex) => {
        document.getElementById('teacher-exam-detail').style.display = 'block';
        document.getElementById('detail-title').textContent = `${ex.semester}학기 ${ex.sequence}번째 시험지`;
        const imgContainer = document.getElementById('detail-img-container');
        imgContainer.innerHTML = '';
        
        let urls = [];
        try {
            urls = JSON.parse(ex.image_url);
            if (!Array.isArray(urls)) urls = [ex.image_url];
        } catch (e) {
            urls = [ex.image_url];
        }
        
        urls.forEach(url => {
            const img = document.createElement('img');
            img.className = 'exam-large-img';
            img.src = url;
            img.style.width = '100%';
            img.style.objectFit = 'contain';
            imgContainer.appendChild(img);
        });

        // If it was already graded by AI or manual, we could display it here
        if (ex.ai_result) {
            document.getElementById('ai-grading-container').style.display = 'block';
            document.getElementById('btn-manual-score').style.display = 'inline-block';
            document.getElementById('btn-auto-grade').textContent = 'AI 가채점 재시도';
            window.currentAiResult = ex.ai_result;
            renderAiResult(window.currentAiResult);
        } else {
            document.getElementById('ai-grading-container').style.display = 'none';
            document.getElementById('btn-manual-score').style.display = 'none';
            document.getElementById('btn-auto-grade').textContent = 'AI 가채점 시작';
            window.currentAiResult = null;
        }

        const renderAiResult = (resultData) => {
            const tbody = document.getElementById('ai-result-tbody');
            tbody.innerHTML = '';
            
            let correctCount = 0;
            
            resultData.forEach((row, i) => {
                const isCorrect = String(row.correct) === String(row.student);
                if (isCorrect) correctCount++;
                
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${row.q}</td>
                    <td><input type="text" value="${row.correct}" data-index="${i}" class="edit-correct" style="width:60px; text-align:center; padding:4px; border:1px solid #cbd5e1; border-radius:4px;"></td>
                    <td>${row.student}</td>
                    <td id="res-${i}" style="color: ${isCorrect ? '#10b981' : '#ef4444'}; font-weight:bold;">${isCorrect ? 'O' : 'X'}</td>
                `;
                tbody.appendChild(tr);
            });
            
            const totalScore = Math.round((correctCount / resultData.length) * 100) || 0;
            document.getElementById('ai-total-score').textContent = `예상 점수: ${totalScore}점`;
            
            document.querySelectorAll('.edit-correct').forEach(inp => {
                inp.addEventListener('input', (e) => {
                    const idx = e.target.getAttribute('data-index');
                    resultData[idx].correct = e.target.value;
                    renderAiResult(resultData);
                });
            });
        };

        document.getElementById('btn-auto-grade').onclick = async () => {
            const btn = document.getElementById('btn-auto-grade');
            btn.disabled = true;
            btn.textContent = 'AI 분석 중... (최대 1분 소요)';
            
            try {
                const result = await callGeminiVision(ex.image_url);
                window.currentAiResult = result;
                
                document.getElementById('ai-grading-container').style.display = 'block';
                document.getElementById('btn-manual-score').style.display = 'inline-block';
                
                renderAiResult(window.currentAiResult);
            } catch (err) {
                alert('AI 채점 중 오류 발생: ' + err.message);
            } finally {
                btn.disabled = false;
                btn.textContent = 'AI 가채점 재시도';
            }
        };

        document.getElementById('btn-manual-score').onclick = async () => {
            if (!window.currentAiResult) return;
            
            let correctCount = 0;
            window.currentAiResult.forEach(row => {
                if (String(row.correct) === String(row.student)) correctCount++;
            });
            const score = Math.round((correctCount / window.currentAiResult.length) * 100) || 0;
            
            const { error } = await supabase.from('exams').update({ 
                status: '채점완료', 
                final_score: score,
                ai_result: window.currentAiResult,
                final_result: window.currentAiResult
            }).eq('id', ex.id);
            
            if (error) {
                alert('저장 실패: ' + error.message);
                return;
            }
            alert(`최종 점수 ${score}점으로 확정되었습니다.`);
            document.getElementById('teacher-exam-detail').style.display = 'none';
            loadTeacherExams();
        };
    };

    await loadTeacherExams();
};

export const initAdminExamDashboard = () => {
    let modal = document.getElementById('admin-exam-dashboard-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'admin-exam-dashboard-modal';
        modal.className = 'exam-modal-overlay';
        document.body.appendChild(modal);
    }

    const studentsRaw = localStorage.getItem('gongbubang_students');
    const students = studentsRaw ? JSON.parse(studentsRaw) : [];
    
    // Extract unique grades
    const grades = [...new Set(students.map(s => s.grade).filter(Boolean))].sort();

    modal.innerHTML = `
        <div class="exam-modal-box admin-large">
            <button class="exam-modal-close" onclick="document.getElementById('admin-exam-dashboard-modal').style.display='none'">&times;</button>
            <h2 style="margin-bottom:16px;"><i data-lucide="bar-chart-2" style="vertical-align:middle; width:22px; height:22px; margin-right:6px;"></i>전체 시험 성적 통계</h2>
            
            <div class="admin-exam-filters">
                <select id="admin-filter-grade" class="admin-exam-select">
                    <option value="">전체 학년</option>
                    ${grades.map(g => `<option value="${g}">${g}</option>`).join('')}
                </select>
                <select id="admin-filter-sem" class="admin-exam-select">
                    <option value="1">1학기</option>
                    <option value="2">2학기</option>
                </select>
                <select id="admin-filter-seq" class="admin-exam-select">
                    <option value="1">1번째 시험</option>
                    <option value="2">2번째 시험</option>
                    <option value="3">3번째 시험</option>
                    <option value="4">4번째 시험</option>
                    <option value="5">5번째 시험</option>
                </select>
                <button id="btn-admin-search-exams" class="exam-upload-btn">조회하기</button>
            </div>

            <div class="filter-btn-group">
                <button class="filter-btn active" data-filter="all">전체 보기</button>
                <button class="filter-btn" data-filter="up">📈 성적 향상 (+)</button>
                <button class="filter-btn" data-filter="down">📉 성적 하락 (-)</button>
            </div>

            <div style="overflow-x: auto;">
                <table class="admin-exam-table">
                    <thead>
                        <tr>
                            <th>학교</th>
                            <th>학년</th>
                            <th>이름</th>
                            <th>점수</th>
                            <th>향상도 (이전 순번 대비)</th>
                            <th>상태</th>
                        </tr>
                    </thead>
                    <tbody id="admin-exam-tbody">
                        <tr><td colspan="6" style="text-align:center; padding: 20px; color:#888;">조건을 선택하고 조회하세요.</td></tr>
                    </tbody>
                </table>
            </div>
        </div>
    `;
    modal.style.display = 'flex';
    if (window.lucide) window.lucide.createIcons();

    let currentRowsData = [];

    const loadDashboardData = async () => {
        const gradeVal = document.getElementById('admin-filter-grade').value;
        const semVal = parseInt(document.getElementById('admin-filter-sem').value);
        const seqVal = parseInt(document.getElementById('admin-filter-seq').value);

        const tbody = document.getElementById('admin-exam-tbody');
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">데이터를 불러오는 중...</td></tr>';

        // Get target exams
        let { data: currentExams, error } = await supabase
            .from('exams')
            .select('*')
            .eq('semester', semVal)
            .eq('sequence', seqVal)
            .eq('status', '채점완료');

        if (error || !currentExams) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:red;">데이터 불러오기 실패</td></tr>';
            return;
        }

        // Get previous exams for trend calculation (if seq > 1)
        let previousExams = [];
        if (seqVal > 1) {
            const { data: prev } = await supabase
                .from('exams')
                .select('*')
                .eq('semester', semVal)
                .eq('sequence', seqVal - 1)
                .eq('status', '채점완료');
            if (prev) previousExams = prev;
        } else if (semVal === 2) {
             // If 2nd semester 1st exam, compare with 1st semester last exam? 
             // Simplification: only compare within same semester for now.
        }

        currentRowsData = [];

        currentExams.forEach(ex => {
            const st = students.find(s => s.id === ex.student_id);
            if (!st) return;
            if (gradeVal && st.grade !== gradeVal) return; // Filter by grade

            const prevEx = previousExams.find(p => p.student_id === ex.student_id);
            let diff = null;
            if (prevEx) {
                diff = ex.final_score - prevEx.final_score;
            }

            let trendType = 'same';
            if (diff > 0) trendType = 'up';
            else if (diff < 0) trendType = 'down';
            else if (diff === null) trendType = 'none';

            currentRowsData.push({
                school: st.school || '-',
                grade: st.grade || '-',
                name: st.name,
                score: ex.final_score,
                diff,
                trendType
            });
        });

        renderRows('all');
    };

    const renderRows = (filterMode) => {
        const tbody = document.getElementById('admin-exam-tbody');
        tbody.innerHTML = '';

        const filtered = currentRowsData.filter(row => {
            if (filterMode === 'up') return row.trendType === 'up';
            if (filterMode === 'down') return row.trendType === 'down';
            return true;
        });

        if (filtered.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">조건에 맞는 결과가 없습니다.</td></tr>';
            return;
        }

        filtered.forEach(row => {
            let trendHtml = '-';
            if (row.trendType === 'up') trendHtml = `<span class="score-trend up">▲ +${row.diff}</span>`;
            else if (row.trendType === 'down') trendHtml = `<span class="score-trend down">▼ ${row.diff}</span>`;
            else if (row.diff === 0) trendHtml = '동일';

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${row.school}</td>
                <td>${row.grade}</td>
                <td><strong>${row.name}</strong></td>
                <td>${row.score}점</td>
                <td>${trendHtml}</td>
                <td><span class="exam-status status-graded">채점완료</span></td>
            `;
            tbody.appendChild(tr);
        });
    };

    document.getElementById('btn-admin-search-exams').addEventListener('click', loadDashboardData);

    const filterBtns = modal.querySelectorAll('.filter-btn');
    filterBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            filterBtns.forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            renderRows(e.target.dataset.filter);
        });
    });
};
