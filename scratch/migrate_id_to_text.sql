-- 1. 외래키 제약조건 제거 (있는 경우에 한해 실행되지만, 에러가 날 수 있으므로 수동 처리가 안전할 수 있습니다)
-- 여기서는 제약조건 이름이 일관되지 않을 수 있으므로, TYPE 변경에 CASCADE 옵션을 추가하거나
-- 가장 안전한 TEXT 캐스팅 방식을 사용합니다.

-- 클래스 테이블 ID 타입 변경
ALTER TABLE sb_classes ALTER COLUMN id TYPE TEXT USING id::TEXT;

-- 학생 테이블의 class_id 타입 변경
ALTER TABLE sb_students ALTER COLUMN class_id TYPE TEXT USING class_id::TEXT;

-- 클래스 포뮬라 테이블의 class_id, id 타입 변경
ALTER TABLE sb_class_formulas ALTER COLUMN id TYPE TEXT USING id::TEXT;
ALTER TABLE sb_class_formulas ALTER COLUMN class_id TYPE TEXT USING class_id::TEXT;

-- 공지사항 테이블 ID 타입 변경
ALTER TABLE sb_notices ALTER COLUMN id TYPE TEXT USING id::TEXT;

-- 자료실 테이블 ID 타입 변경
ALTER TABLE sb_resources ALTER COLUMN id TYPE TEXT USING id::TEXT;

-- 과제 테이블 ID 타입 변경
ALTER TABLE sb_homework ALTER COLUMN id TYPE TEXT USING id::TEXT;

-- 메시지 테이블 ID 타입 변경
ALTER TABLE sb_messages ALTER COLUMN id TYPE TEXT USING id::TEXT;

-- 피드백 테이블 ID 타입 변경
ALTER TABLE sb_feedbacks ALTER COLUMN id TYPE TEXT USING id::TEXT;

-- 진도 테이블 ID 타입 변경
ALTER TABLE sb_progress ALTER COLUMN id TYPE TEXT USING id::TEXT;

-- 출석 테이블 ID 타입 변경
ALTER TABLE sb_attendance ALTER COLUMN id TYPE TEXT USING id::TEXT;

-- 상담 테이블 ID 타입 변경
ALTER TABLE sb_consultations ALTER COLUMN id TYPE TEXT USING id::TEXT;

-- 커리큘럼 테이블 ID 타입 변경
ALTER TABLE sb_curriculums ALTER COLUMN id TYPE TEXT USING id::TEXT;

-- AI 질의응답 테이블 ID 타입 변경
ALTER TABLE sb_ai_queries ALTER COLUMN id TYPE TEXT USING id::TEXT;

-- 교재 신청 테이블 ID 타입 변경
ALTER TABLE sb_textbook_requests ALTER COLUMN id TYPE TEXT USING id::TEXT;

-- 학생 뱃지 테이블 ID 타입 변경
ALTER TABLE sb_student_badges ALTER COLUMN id TYPE TEXT USING id::TEXT;

-- 단어장 테이블 ID 타입 변경
ALTER TABLE sb_word_sets ALTER COLUMN id TYPE TEXT USING id::TEXT;

-- 완료된 단어장 테이블 ID 타입 변경
ALTER TABLE sb_completed_vocab_sets ALTER COLUMN id TYPE TEXT USING id::TEXT;

-- 과제 학생 ID 등 기타 참조 키 확인 후 변경
ALTER TABLE sb_homework ALTER COLUMN student_id TYPE TEXT USING student_id::TEXT;
ALTER TABLE sb_progress ALTER COLUMN student_id TYPE TEXT USING student_id::TEXT;
ALTER TABLE sb_attendance ALTER COLUMN student_id TYPE TEXT USING student_id::TEXT;
ALTER TABLE sb_student_badges ALTER COLUMN student_id TYPE TEXT USING student_id::TEXT;
ALTER TABLE sb_completed_vocab_sets ALTER COLUMN student_id TYPE TEXT USING student_id::TEXT;
