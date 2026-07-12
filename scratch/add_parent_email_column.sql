-- sb_students 테이블에 parent_email 컬럼 추가
-- Supabase SQL Editor 에서 실행하세요

ALTER TABLE sb_students
  ADD COLUMN IF NOT EXISTS parent_email TEXT DEFAULT '';

-- 인덱스 추가 (부모-자녀 조회 성능 향상)
CREATE INDEX IF NOT EXISTS idx_sb_students_parent_email
  ON sb_students (parent_email);

-- 기존 데이터에서 parent_phone 기반으로 parent_email 채우기 (선택사항)
-- sb_mock_users 테이블에 phone과 email이 있다면 아래 쿼리로 업데이트 가능
-- UPDATE sb_students s
--   SET parent_email = mu.email
--   FROM sb_mock_users mu
--   WHERE mu.phone = s.parent_phone
--     AND s.parent_email = '';
