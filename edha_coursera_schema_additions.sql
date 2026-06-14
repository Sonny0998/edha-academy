-- ════════════════════════════════════════════════════════
-- EDHA COURSERA — Schema Additions (run after main schema)
-- Safe to run multiple times — uses IF NOT EXISTS + DROP IF EXISTS
-- ════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────
-- 1. LESSON NOTES (student notes per lesson)
-- ─────────────────────────────────────────────────
create table if not exists public.lesson_notes (
  id            uuid primary key default uuid_generate_v4(),
  student_id    uuid references public.profiles(id) on delete cascade not null,
  lesson_id     uuid references public.lessons(id) on delete cascade not null,
  course_id     uuid references public.courses(id) on delete cascade not null,
  content       text not null,
  timestamp_sec integer,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);
create index if not exists idx_notes_student on public.lesson_notes(student_id, course_id);
alter table public.lesson_notes enable row level security;
drop policy if exists "own_notes" on public.lesson_notes;
create policy "own_notes" on public.lesson_notes for all using (student_id = auth.uid());

-- ─────────────────────────────────────────────────
-- 2. FORUM THREADS
-- ─────────────────────────────────────────────────
create table if not exists public.forum_threads (
  id          uuid primary key default uuid_generate_v4(),
  course_id   uuid references public.courses(id) on delete cascade not null,
  lesson_id   uuid references public.lessons(id) on delete set null,
  author_id   uuid references public.profiles(id) on delete cascade not null,
  title       text not null,
  body        text not null,
  is_pinned   boolean default false,
  is_answered boolean default false,
  upvotes     integer default 0,
  reply_count integer default 0,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);
create index if not exists idx_threads_course on public.forum_threads(course_id);
alter table public.forum_threads enable row level security;

drop policy if exists "enrolled_read_threads"  on public.forum_threads;
drop policy if exists "enrolled_post_threads"  on public.forum_threads;
drop policy if exists "own_thread_update"      on public.forum_threads;
drop policy if exists "enrolled_write_threads" on public.forum_threads;

create policy "enrolled_read_threads" on public.forum_threads for select using (
  exists (select 1 from public.enrollments e where e.course_id = course_id and e.student_id = auth.uid())
  or exists (select 1 from public.courses c where c.id = course_id and c.instructor_id = auth.uid())
);
create policy "enrolled_post_threads" on public.forum_threads for insert with check (
  auth.uid() = author_id and (
    exists (select 1 from public.enrollments e where e.course_id = course_id and e.student_id = auth.uid())
    or exists (select 1 from public.courses c where c.id = course_id and c.instructor_id = auth.uid())
  )
);
create policy "own_thread_update" on public.forum_threads for update using (author_id = auth.uid());

-- ─────────────────────────────────────────────────
-- 3. FORUM REPLIES
-- ─────────────────────────────────────────────────
create table if not exists public.forum_replies (
  id          uuid primary key default uuid_generate_v4(),
  thread_id   uuid references public.forum_threads(id) on delete cascade not null,
  author_id   uuid references public.profiles(id) on delete cascade not null,
  body        text not null,
  is_answer   boolean default false,
  upvotes     integer default 0,
  created_at  timestamptz default now()
);
create index if not exists idx_replies_thread on public.forum_replies(thread_id);
alter table public.forum_replies enable row level security;

drop policy if exists "read_replies"          on public.forum_replies;
drop policy if exists "post_replies"          on public.forum_replies;
drop policy if exists "own_reply_update"      on public.forum_replies;
drop policy if exists "enrolled_read_replies" on public.forum_replies;
drop policy if exists "enrolled_write_replies"on public.forum_replies;

create policy "read_replies" on public.forum_replies for select using (
  exists (
    select 1 from public.forum_threads t
    join public.enrollments e on e.course_id = t.course_id
    where t.id = thread_id and e.student_id = auth.uid()
  )
);
create policy "post_replies" on public.forum_replies for insert with check (auth.uid() = author_id);
create policy "own_reply_update" on public.forum_replies for update using (author_id = auth.uid());

-- Auto-increment reply_count trigger
create or replace function public.update_thread_reply_count()
returns trigger language plpgsql as $$
begin
  update public.forum_threads
  set reply_count = reply_count + 1, updated_at = now()
  where id = new.thread_id;
  return new;
end;
$$;
drop trigger if exists tg_reply_count on public.forum_replies;
create trigger tg_reply_count after insert on public.forum_replies
  for each row execute function public.update_thread_reply_count();

-- ─────────────────────────────────────────────────
-- 4. PROFILE & COURSE COLUMNS (safe — IF NOT EXISTS)
-- ─────────────────────────────────────────────────
alter table public.profiles
  add column if not exists instructor_application jsonb,
  add column if not exists instructor_approved_at timestamptz;

alter table public.courses
  add column if not exists admin_feedback text;

-- ─────────────────────────────────────────────────
-- 5. PLATFORM STATS VIEW (updated with pending_instructors)
-- ─────────────────────────────────────────────────
drop view if exists public.platform_stats;
create view public.platform_stats as
  select
    (select count(*) from public.courses)                               as total_courses,
    (select count(*) from public.courses where status = 'published')    as published_courses,
    (select count(*) from public.profiles where role = 'student')       as total_students,
    (select count(*) from public.profiles where role = 'instructor')    as total_instructors,
    (select coalesce(sum(amount), 0) from public.payments where status = 'completed') as total_revenue,
    (select count(*) from public.enrollments where enrolled_at > now() - interval '30 days') as monthly_enrollments,
    (select count(*) from public.courses where status = 'review')       as pending_review,
    (select count(*) from public.profiles
     where instructor_application is not null
       and role = 'student')                                             as pending_instructors;

-- ════════════════════════════════════════════════════
-- SUPER ADMIN SETUP — run once after creating account
-- Replace the email below with your real admin email
-- ════════════════════════════════════════════════════
-- UPDATE auth.users
--   SET raw_user_meta_data = jsonb_set(coalesce(raw_user_meta_data,'{}'), '{role}', '"admin"')
--   WHERE email = 'YOUR-ADMIN-EMAIL';
-- UPDATE public.profiles SET role = 'admin' WHERE email = 'YOUR-ADMIN-EMAIL';

-- ─────────────────────────────────────────────────
-- 6. Q&A (questions per lesson from students)
-- ─────────────────────────────────────────────────
create table if not exists public.lesson_qa (
  id          uuid primary key default uuid_generate_v4(),
  lesson_id   uuid references public.lessons(id) on delete cascade not null,
  course_id   uuid references public.courses(id) on delete cascade not null,
  student_id  uuid references public.profiles(id) on delete cascade not null,
  question    text not null,
  answer      text,
  answered_by uuid references public.profiles(id),
  answered_at timestamptz,
  upvotes     integer default 0,
  is_featured boolean default false,
  created_at  timestamptz default now()
);
create index if not exists idx_qa_lesson on public.lesson_qa(lesson_id);
create index if not exists idx_qa_course on public.lesson_qa(course_id);
alter table public.lesson_qa enable row level security;
drop policy if exists "read_qa" on public.lesson_qa;
drop policy if exists "post_qa" on public.lesson_qa;
drop policy if exists "answer_qa" on public.lesson_qa;
create policy "read_qa" on public.lesson_qa for select using (
  exists(select 1 from public.enrollments e where e.course_id = course_id and e.student_id = auth.uid())
  or exists(select 1 from public.courses c where c.id = course_id and c.instructor_id = auth.uid())
  or (select role from public.profiles where id = auth.uid()) = 'admin'
);
create policy "post_qa" on public.lesson_qa for insert with check (student_id = auth.uid());
create policy "answer_qa" on public.lesson_qa for update using (
  exists(select 1 from public.courses c where c.id = course_id and c.instructor_id = auth.uid())
  or (select role from public.profiles where id = auth.uid()) = 'admin'
);

-- ─────────────────────────────────────────────────
-- 7. Announcements (instructor → enrolled students)
-- ─────────────────────────────────────────────────
create table if not exists public.announcements (
  id           uuid primary key default uuid_generate_v4(),
  course_id    uuid references public.courses(id) on delete cascade not null,
  instructor_id uuid references public.profiles(id) on delete cascade not null,
  title        text not null,
  body         text not null,
  created_at   timestamptz default now()
);
create index if not exists idx_announcements_course on public.announcements(course_id);
alter table public.announcements enable row level security;
drop policy if exists "read_announcements" on public.announcements;
drop policy if exists "write_announcements" on public.announcements;
create policy "read_announcements" on public.announcements for select using (
  exists(select 1 from public.enrollments e where e.course_id = course_id and e.student_id = auth.uid())
  or exists(select 1 from public.courses c where c.id = course_id and c.instructor_id = auth.uid())
);
create policy "write_announcements" on public.announcements for insert with check (
  instructor_id = auth.uid() and
  exists(select 1 from public.courses c where c.id = course_id and c.instructor_id = auth.uid())
);

-- ─────────────────────────────────────────────────
-- 8. CALENDAR / SCHEDULING (como Moodle)
-- ─────────────────────────────────────────────────

-- Columnas de programación en lessons (quiz y tareas)
alter table public.lessons
  add column if not exists opens_at           timestamptz,   -- fecha/hora apertura
  add column if not exists closes_at          timestamptz,   -- fecha/hora cierre (cut-off)
  add column if not exists due_at             timestamptz,   -- fecha límite (submissions after = late)
  add column if not exists time_limit_min     integer,       -- tiempo máximo en minutos (null = sin límite)
  add column if not exists max_attempts       integer default 1,  -- intentos permitidos
  add column if not exists grading_method     text default 'highest' check (grading_method in ('highest','average','first','last')),
  add column if not exists shuffle_questions  boolean default false,
  add column if not exists show_answers_after boolean default true,  -- mostrar respuestas correctas después
  add column if not exists password           text;          -- contraseña opcional para acceder

-- Tabla de intentos de quiz (extendida)
alter table public.quiz_attempts
  add column if not exists started_at      timestamptz,
  add column if not exists time_spent_sec  integer,
  add column if not exists attempt_num     integer default 1,
  add column if not exists is_late         boolean default false;

-- Tabla de tareas (assignments) - como Moodle Assignment activity
create table if not exists public.assignments (
  id              uuid primary key default uuid_generate_v4(),
  lesson_id       uuid references public.lessons(id) on delete cascade not null,
  course_id       uuid references public.courses(id) on delete cascade not null,
  title           text not null,
  instructions    text not null,
  submission_type text default 'text' check (submission_type in ('text','file','both')),
  opens_at        timestamptz,
  due_at          timestamptz,        -- entrega ideal (después = marcado late)
  closes_at       timestamptz,        -- corte total (no se acepta nada después)
  time_limit_min  integer,
  max_file_size_mb integer default 10,
  allowed_types   text[] default array['pdf','doc','docx','txt','jpg','png','zip'],
  max_grade       numeric(5,2) default 100,
  created_at      timestamptz default now()
);
alter table public.assignments enable row level security;
drop policy if exists "instructor_manage_assignments" on public.assignments;
drop policy if exists "enrolled_read_assignments"     on public.assignments;
create policy "instructor_manage_assignments" on public.assignments for all using (
  exists(select 1 from public.courses c where c.id = course_id and c.instructor_id = auth.uid())
  or (select role from public.profiles where id = auth.uid()) = 'admin'
);
create policy "enrolled_read_assignments" on public.assignments for select using (
  exists(select 1 from public.enrollments e where e.course_id = course_id and e.student_id = auth.uid())
);

-- Entregas de tareas por estudiante
create table if not exists public.assignment_submissions (
  id              uuid primary key default uuid_generate_v4(),
  assignment_id   uuid references public.assignments(id) on delete cascade not null,
  student_id      uuid references public.profiles(id) on delete cascade not null,
  content_text    text,
  file_url        text,
  file_name       text,
  status          text default 'draft' check (status in ('draft','submitted','graded','late')),
  grade           numeric(5,2),
  feedback        text,
  submitted_at    timestamptz,
  graded_at       timestamptz,
  graded_by       uuid references public.profiles(id),
  is_late         boolean default false,
  unique(assignment_id, student_id)
);
alter table public.assignment_submissions enable row level security;
drop policy if exists "own_submission"        on public.assignment_submissions;
drop policy if exists "instructor_view_subs"  on public.assignment_submissions;
drop policy if exists "instructor_grade_subs" on public.assignment_submissions;
create policy "own_submission" on public.assignment_submissions for all using (student_id = auth.uid());
create policy "instructor_view_subs" on public.assignment_submissions for select using (
  exists(select 1 from public.assignments a join public.courses c on c.id = a.course_id
    where a.id = assignment_id and c.instructor_id = auth.uid())
);
create policy "instructor_grade_subs" on public.assignment_submissions for update using (
  exists(select 1 from public.assignments a join public.courses c on c.id = a.course_id
    where a.id = assignment_id and c.instructor_id = auth.uid())
);

-- Vista: próximas fechas límite para los estudiantes (calendario)
drop view if exists public.student_calendar;
create view public.student_calendar as
  select
    l.id           as lesson_id,
    l.title        as lesson_title,
    l.content_type,
    l.opens_at,
    l.due_at,
    l.closes_at,
    l.time_limit_min,
    l.max_attempts,
    c.id           as course_id,
    c.title        as course_title,
    c.slug         as course_slug
  from public.lessons l
  join public.courses c on c.id = l.course_id
  where (l.due_at is not null or l.closes_at is not null)
    and l.is_published = true
    and c.status = 'published';

-- ─────────────────────────────────────────────────
-- 9. GAMIFICATION (XP, badges, streaks)
-- ─────────────────────────────────────────────────
alter table public.profiles
  add column if not exists xp_points       integer default 0,
  add column if not exists streak_days     integer default 0,
  add column if not exists last_active_at  timestamptz,
  add column if not exists total_hours     numeric(8,2) default 0,
  add column if not exists avatar_url      text,
  add column if not exists website         text,
  add column if not exists institution_name text,
  add column if not exists instructor_application jsonb,
  add column if not exists instructor_approved_at timestamptz;

create table if not exists public.badges (
  id          uuid primary key default uuid_generate_v4(),
  code        text unique not null,
  name        text not null,
  description text,
  icon        text not null,
  color       text default '#0891b2',
  xp_reward   integer default 0,
  condition   text,
  created_at  timestamptz default now()
);

create table if not exists public.user_badges (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid references public.profiles(id) on delete cascade not null,
  badge_id   uuid references public.badges(id) on delete cascade not null,
  earned_at  timestamptz default now(),
  unique(user_id, badge_id)
);
alter table public.user_badges enable row level security;
create policy "own_badges" on public.user_badges for select using (user_id = auth.uid());

-- Default badges
insert into public.badges (code, name, description, icon, color, xp_reward) values
  ('first_lesson',   'Premier pas',       'Compléter sa première leçon',     '🎯', '#0891b2', 10),
  ('first_course',   'Premier cours',     'Terminer son premier cours',       '🎓', '#10b981', 50),
  ('quiz_ace',       'As du quiz',        'Score parfait à un quiz',          '⭐', '#d97706', 30),
  ('streak_7',       'Semaine parfaite',  '7 jours consécutifs de connexion', '🔥', '#ef4444', 70),
  ('streak_30',      'Mois de feu',       '30 jours consécutifs',             '🏆', '#8b5cf6', 200),
  ('first_cert',     'Certifié',          'Obtenir son premier certificat',   '📜', '#06b6d4', 100),
  ('five_courses',   'Passionné',         'Terminer 5 cours',                 '💡', '#f97316', 150)
on conflict (code) do nothing;

-- ─────────────────────────────────────────────────
-- 10. PROFILE PHOTO UPLOAD (Supabase Storage)
-- ─────────────────────────────────────────────────

-- Storage bucket for avatars (create via Supabase dashboard)
-- Bucket name: course-resources (already exists)
-- Policy: authenticated users can upload to avatars/{user_id}/

-- ─────────────────────────────────────────────────
-- 11. INSTRUCTOR APPLICATION COLUMN
-- ─────────────────────────────────────────────────
alter table public.profiles
  add column if not exists instructor_application    jsonb,
  add column if not exists instructor_approved_at    timestamptz,
  add column if not exists institution_name          text,
  add column if not exists website                   text,
  add column if not exists xp_points                 integer default 0,
  add column if not exists streak_days               integer default 0,
  add column if not exists last_active_at            timestamptz,
  add column if not exists total_hours               numeric(8,2) default 0;

-- ─────────────────────────────────────────────────
-- 12. GAMIFICATION TABLES
-- ─────────────────────────────────────────────────

-- ─────────────────────────────────────────────────
-- 13. EMAIL LOGS (track sent emails)
-- ─────────────────────────────────────────────────
create table if not exists public.email_logs (
  id       uuid primary key default uuid_generate_v4(),
  user_id  uuid references public.profiles(id) on delete cascade,
  email    text not null,
  type     text not null,
  subject  text not null,
  sent_at  timestamptz default now()
);
alter table public.email_logs enable row level security;
drop policy if exists "admin_email_logs" on public.email_logs;
create policy "admin_email_logs" on public.email_logs for all using (
  (select role from public.profiles where id = auth.uid()) = 'admin'
);

-- ─────────────────────────────────────────────────
-- 14. AUDIT LOG (track admin actions)
-- ─────────────────────────────────────────────────
create table if not exists public.audit_logs (
  id         uuid primary key default uuid_generate_v4(),
  admin_id   uuid references public.profiles(id),
  action     text not null,
  entity     text not null,
  entity_id  uuid,
  details    jsonb,
  created_at timestamptz default now()
);
alter table public.audit_logs enable row level security;
drop policy if exists "admin_audit" on public.audit_logs;
create policy "admin_audit" on public.audit_logs for all using (
  (select role from public.profiles where id = auth.uid()) = 'admin'
);

-- ─────────────────────────────────────────────────
-- 15. PLATFORM SETTINGS (replaces localStorage)
-- ─────────────────────────────────────────────────
create table if not exists public.platform_settings (
  id          uuid primary key default uuid_generate_v4(),
  key         text unique not null,
  value       jsonb not null,
  updated_at  timestamptz default now(),
  updated_by  uuid references public.profiles(id)
);
alter table public.platform_settings enable row level security;
drop policy if exists "admin_settings" on public.platform_settings;
create policy "admin_settings" on public.platform_settings for all using (
  (select role from public.profiles where id = auth.uid()) = 'admin'
);

-- Default settings
insert into public.platform_settings (key, value) values
  ('general', '{"platform_name":"EDHA Academy","allow_registrations":true,"maintenance_mode":false}'::jsonb),
  ('pricing', '{"platform_free":true,"subscription_enabled":false,"subscription_price":null,"certificate_price":null}'::jsonb)
on conflict (key) do nothing;

-- ─────────────────────────────────────────────────
-- 16. MISSING SQL FUNCTIONS
-- ─────────────────────────────────────────────────

-- Function to safely increment enrolled count
create or replace function public.increment_enrolled_count(course_id uuid)
returns void language plpgsql security definer as $$
begin
  update public.courses
  set enrolled_count = enrolled_count + 1
  where id = course_id;
end;
$$;

-- Function to recalculate course rating
create or replace function public.recalculate_course_rating(p_course_id uuid)
returns void language plpgsql security definer as $$
declare
  v_avg numeric;
  v_count integer;
begin
  select avg(rating)::numeric(3,2), count(*)
  into v_avg, v_count
  from public.reviews
  where course_id = p_course_id;

  update public.courses
  set rating_avg = coalesce(v_avg, 0),
      rating_count = coalesce(v_count, 0)
  where id = p_course_id;
end;
$$;

-- Trigger to auto-update rating after review insert/update
create or replace function public.trigger_update_course_rating()
returns trigger language plpgsql as $$
begin
  perform public.recalculate_course_rating(
    case when TG_OP = 'DELETE' then OLD.course_id else NEW.course_id end
  );
  return coalesce(NEW, OLD);
end;
$$;

drop trigger if exists update_course_rating on public.reviews;
create trigger update_course_rating
  after insert or update or delete on public.reviews
  for each row execute function public.trigger_update_course_rating();

-- Index for course search performance
create index if not exists idx_courses_title_search on public.courses using gin(to_tsvector('simple', title));
create index if not exists idx_courses_status on public.courses(status);
create index if not exists idx_courses_category on public.courses(category_id);
create index if not exists idx_enrollments_student on public.enrollments(student_id);
create index if not exists idx_lesson_progress_student_course on public.lesson_progress(student_id, course_id);
