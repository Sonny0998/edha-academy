-- ═══════════════════════════════════════════════════════════════════
-- EDHA ACADEMY — SQL FIXES (run this after EDHA_SAFE_SQL.sql)
-- Safe to run multiple times
-- ═══════════════════════════════════════════════════════════════════

-- FIX 1: Add missing institution profile columns
-- (was causing institution_type to always be undefined in dashboard)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS institution_type       text DEFAULT 'university'
  CHECK (institution_type IN ('university','college','school','training_center','other'));
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS institution_logo_url   text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS institution_website     text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS institution_description text;

-- FIX 2: Add max_points column to lessons (was reusing duration_min for points)
ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS max_points integer DEFAULT 100;

-- FIX 3: Add status + content columns to assignment_submissions 
-- (text submission was being lost — now has proper storage)
ALTER TABLE public.assignment_submissions ADD COLUMN IF NOT EXISTS content_text  text;
ALTER TABLE public.assignment_submissions ADD COLUMN IF NOT EXISTS status        text DEFAULT 'submitted'
  CHECK (status IN ('submitted','graded','returned','late'));
ALTER TABLE public.assignment_submissions ADD COLUMN IF NOT EXISTS submitted_at  timestamptz DEFAULT now();
ALTER TABLE public.assignment_submissions ADD COLUMN IF NOT EXISTS grade         numeric(5,2);
ALTER TABLE public.assignment_submissions ADD COLUMN IF NOT EXISTS teacher_feedback text;
ALTER TABLE public.assignment_submissions ADD COLUMN IF NOT EXISTS lesson_id     uuid REFERENCES public.lessons(id);

-- Add unique constraint for upsert (student can only submit once per lesson)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'assignment_submissions_student_lesson_unique'
  ) THEN
    ALTER TABLE public.assignment_submissions
      ADD CONSTRAINT assignment_submissions_student_lesson_unique
      UNIQUE (student_id, lesson_id);
  END IF;
END $$;

-- FIX 4: Enrollment trigger to auto-increment enrolled_count
-- (was only called from /api/enroll, not from direct inserts in learn page)
CREATE OR REPLACE FUNCTION public.increment_enrolled_count_trigger()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE public.courses
  SET enrolled_count = COALESCE(enrolled_count, 0) + 1
  WHERE id = NEW.course_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS auto_increment_enrolled_count ON public.enrollments;
CREATE TRIGGER auto_increment_enrolled_count
  AFTER INSERT ON public.enrollments
  FOR EACH ROW EXECUTE FUNCTION public.increment_enrolled_count_trigger();

-- FIX 5: Security — block setting role=admin via signup metadata
-- The handle_new_user trigger now always assigns 'student' regardless of metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, role)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', 'Utilisateur'),
    new.email,
    'student'  -- FIX: always 'student' — role escalation via signup metadata is now blocked
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    email     = EXCLUDED.email;
  RETURN new;
END;
$$;

-- FIX 6: enrolled_count safety — ensure it never goes negative
ALTER TABLE public.courses 
  ADD CONSTRAINT courses_enrolled_count_non_negative 
  CHECK (enrolled_count >= 0);

-- FIX 7: RLS for assignment_submissions (students see only their own)
ALTER TABLE public.assignment_submissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "student_own_submissions" ON public.assignment_submissions;
DROP POLICY IF EXISTS "instructor_view_submissions" ON public.assignment_submissions;

CREATE POLICY "student_own_submissions" ON public.assignment_submissions
  FOR ALL USING (student_id = auth.uid());

CREATE POLICY "instructor_view_submissions" ON public.assignment_submissions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.courses c
      JOIN public.lessons l ON l.course_id = c.id
      WHERE l.id = assignment_submissions.lesson_id
        AND c.instructor_id = auth.uid()
    )
  );

-- Summary
SELECT 'SQL_FIXES applied successfully' AS status;
