-- ==============================================================================
-- 1. 시험 성적 저장 테이블 (sb_graded_tests)
-- ==============================================================================
CREATE TABLE sb_graded_tests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL,          -- 학생 ID
    school VARCHAR(100) NOT NULL,      -- 학교 이름
    grade VARCHAR(20) NOT NULL,        -- 학년
    semester VARCHAR(20) NOT NULL,     -- 학기 (예: '1학기', '2학기', '1학기 중간')
    exam_name VARCHAR(100) NOT NULL,   -- 시험명 (예: '수학 단원평가')
    score INTEGER NOT NULL,            -- 점수
    date TIMESTAMP WITH TIME ZONE DEFAULT NOW(), -- 채점 날짜
    image_url TEXT,                    -- 학생이 업로드한 시험지 이미지 주소
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스 추가 (조회 성능 최적화)
CREATE INDEX idx_graded_tests_student ON sb_graded_tests(student_id);
CREATE INDEX idx_graded_tests_exam ON sb_graded_tests(school, grade, semester, exam_name);

-- ==============================================================================
-- 2. 관리자용 답안지 테이블 (sb_exam_answer_sheets)
-- ==============================================================================
CREATE TABLE sb_exam_answer_sheets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school VARCHAR(100) NOT NULL,      -- 학교 이름
    grade VARCHAR(20) NOT NULL,        -- 학년
    semester VARCHAR(20) NOT NULL,     -- 학기
    exam_name VARCHAR(100) NOT NULL,   -- 시험명
    answer_data JSONB NOT NULL,        -- 답안지 정보 (문항 번호별 정답, 배점 등)
                                       -- 예: { "1": { "answer": "3", "score": 4 }, "2": { "answer": "주관식답", "score": 5 } }
    image_url TEXT,                    -- (선택) 관리자가 찍어 올린 원본 답안지 이미지
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- 학교, 학년, 학기, 시험명 조합은 유일해야 함
    UNIQUE(school, grade, semester, exam_name)
);

-- ==============================================================================
-- 3. RLS (Row Level Security) 설정 예시
-- ==============================================================================
-- 성적 테이블: 읽기는 누구나, 쓰기/수정은 인증된 사용자(또는 백엔드 함수)만 가능하게 설정
ALTER TABLE sb_graded_tests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for authenticated users" 
ON sb_graded_tests FOR SELECT 
TO authenticated 
USING (true); 

CREATE POLICY "Enable insert for authenticated users" 
ON sb_graded_tests FOR INSERT 
TO authenticated 
WITH CHECK (true);

-- 답안지 테이블: 읽기는 인증된 누구나 가능 (자동 채점 시 필요), 쓰기는 선생님(관리자)만 가능
ALTER TABLE sb_exam_answer_sheets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all users" 
ON sb_exam_answer_sheets FOR SELECT 
TO authenticated 
USING (true);

-- (참고) 실제 운영 시 선생님 권한 검증 로직을 추가해야 합니다.
CREATE POLICY "Enable all access for admin users" 
ON sb_exam_answer_sheets FOR ALL 
TO authenticated 
USING (true); 
