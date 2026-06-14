-- ═══════════════════════════════════════════════════════════════════
-- EDHA ACADEMY — SQL COMPLETO Y SEGURO
-- Se puede ejecutar múltiples veces sin errores
-- Copia TODO este archivo y pégalo en Supabase → SQL Editor → Run
-- ═══════════════════════════════════════════════════════════════════

-- Extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pg_trgm";

-- ─────────────────────────────────────────────────
-- TABLAS PRINCIPALES (con DO $$ para ser seguro)
-- ─────────────────────────────────────────────────

-- 1. PROFILES
create table if not exists public.profiles (
  id                    uuid references auth.users on delete cascade primary key,
  role                  text not null default 'student'
                          check (role in ('student','instructor','admin')),
  full_name             text not null,
  email                 text,
  avatar_url            text,
  bio                   text,
  website               text,
  country               text default 'HT',
  preferred_language    text default 'fr' check (preferred_language in ('fr','ht','en','es')),
  institution_name      text,
  institution_verified  boolean default false,
  instructor_approved_at timestamptz,
  instructor_application jsonb,
  xp_points             integer default 0,
  streak_days           integer default 0,
  last_active_at        timestamptz,
  total_hours           numeric(8,2) default 0,
  total_courses_taught  integer default 0,
  total_students_taught integer default 0,
  is_verified           boolean default false,
  created_at            timestamptz default now(),
  updated_at            timestamptz default now()
);

-- Add missing columns to profiles safely
alter table public.profiles add column if not exists website text;
alter table public.profiles add column if not exists institution_name text;
alter table public.profiles add column if not exists instructor_application jsonb;
alter table public.profiles add column if not exists instructor_approved_at timestamptz;
alter table public.profiles add column if not exists xp_points integer default 0;
alter table public.profiles add column if not exists streak_days integer default 0;
alter table public.profiles add column if not exists last_active_at timestamptz;
alter table public.profiles add column if not exists total_hours numeric(8,2) default 0;

-- Trigger: auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, full_name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', 'Utilisateur'),
    new.email,
    coalesce(new.raw_user_meta_data->>'role', 'student')
  )
  on conflict (id) do update set
    full_name = excluded.full_name,
    email     = excluded.email;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 2. CATEGORIES
create table if not exists public.categories (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null,
  slug        text unique not null,
  description text,
  icon        text default 'BookOpen',
  color       text default '#0891b2',
  parent_id   uuid references public.categories(id),
  order_num   integer default 0,
  created_at  timestamptz default now()
);

-- Seed default categories (safe - ignores duplicates)
insert into public.categories (name, slug, icon, color) values
  ('Mathématiques',     'mathematiques',     'Calculator',  '#0891b2'),
  ('Français',          'francais',          'BookOpen',    '#8b5cf6'),
  ('Sciences',          'sciences',          'FlaskConical','#10b981'),
  ('Histoire',          'histoire',          'Landmark',    '#f59e0b'),
  ('Informatique',      'informatique',      'Code',        '#06b6d4'),
  ('Langues',           'langues',           'Globe',       '#a855f7'),
  ('Arts',              'arts',              'Palette',     '#f97316'),
  ('Business',          'business',          'TrendingUp',  '#3b82f6'),
  ('Sciences Sociales', 'sciences-sociales', 'Users',       '#ec4899'),
  ('Philosophie',       'philosophie',       'Brain',       '#14b8a6')
on conflict (slug) do nothing;

-- 3. COURSES
create table if not exists public.courses (
  id                  uuid primary key default uuid_generate_v4(),
  instructor_id       uuid references public.profiles(id) on delete cascade not null,
  category_id         uuid references public.categories(id),
  title               text not null,
  slug                text unique not null,
  subtitle            text,
  description         text not null default '',
  language            text default 'fr' check (language in ('fr','ht','en','es')),
  level               text default 'debutant' check (level in ('debutant','intermediaire','avance')),
  thumbnail_url       text,
  preview_video_url   text,
  preview_video_source text,
  pricing_model       text default 'free' check (pricing_model in ('free','paid','certificate_only')),
  price               numeric(8,2),
  price_htg           numeric(10,2),
  certificate_price   numeric(8,2),
  status              text default 'draft' check (status in ('draft','review','published','archived')),
  is_featured         boolean default false,
  tags                text[] default '{}',
  requirements        text[] default '{}',
  what_you_learn      text[] default '{}',
  admin_feedback      text,
  total_modules       integer default 0,
  total_lessons       integer default 0,
  total_duration_min  integer default 0,
  enrolled_count      integer default 0,
  rating_avg          numeric(3,2) default 0,
  rating_count        integer default 0,
  published_at        timestamptz,
  created_at          timestamptz default now(),
  updated_at          timestamptz default now()
);

alter table public.courses add column if not exists admin_feedback text;

create index if not exists idx_courses_status     on public.courses(status);
create index if not exists idx_courses_category   on public.courses(category_id);
create index if not exists idx_courses_instructor on public.courses(instructor_id);
create index if not exists idx_courses_featured   on public.courses(is_featured) where is_featured = true;
create index if not exists idx_courses_title_search on public.courses using gin(to_tsvector('simple', title));

-- increment enrolled_count function
create or replace function public.increment_enrolled_count(course_id uuid)
returns void language sql as $$
  update public.courses set enrolled_count = enrolled_count + 1 where id = course_id;
$$;

-- 4. MODULES
create table if not exists public.modules (
  id                uuid primary key default uuid_generate_v4(),
  course_id         uuid references public.courses(id) on delete cascade not null,
  title             text not null,
  description       text,
  order_num         integer not null,
  total_lessons     integer default 0,
  total_duration_min integer default 0,
  is_free_preview   boolean default false,
  created_at        timestamptz default now()
);

create index if not exists idx_modules_course on public.modules(course_id, order_num);

-- 5. LESSONS
create table if not exists public.lessons (
  id               uuid primary key default uuid_generate_v4(),
  module_id        uuid references public.modules(id) on delete cascade not null,
  course_id        uuid references public.courses(id) on delete cascade not null,
  title            text not null,
  description      text,
  order_num        integer not null,
  duration_min     integer,
  content_type     text default 'video'
                     check (content_type in ('video','text','quiz','assignment','resource')),
  video_source     text,
  video_url        text,
  mux_asset_id     text,
  mux_playback_id  text,
  content_body     text,
  resources        jsonb default '[]',
  -- Schedule fields
  opens_at         timestamptz,
  due_at           timestamptz,
  closes_at        timestamptz,
  time_limit_min   integer,
  max_attempts     integer default 1,
  grading_method   text default 'highest' check (grading_method in ('highest','latest','average')),
  shuffle_questions boolean default false,
  show_answers_after boolean default true,
  password         text,
  quiz_passing_score integer default 70,
  is_free_preview  boolean default false,
  is_published     boolean default false,
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);

alter table public.lessons add column if not exists opens_at timestamptz;
alter table public.lessons add column if not exists due_at timestamptz;
alter table public.lessons add column if not exists closes_at timestamptz;
alter table public.lessons add column if not exists time_limit_min integer;
alter table public.lessons add column if not exists max_attempts integer default 1;
alter table public.lessons add column if not exists password text;
alter table public.lessons add column if not exists quiz_passing_score integer default 70;

create index if not exists idx_lessons_module on public.lessons(module_id, order_num);
create index if not exists idx_lessons_course on public.lessons(course_id);

-- 6. QUIZ QUESTIONS
create table if not exists public.quiz_questions (
  id          uuid primary key default uuid_generate_v4(),
  lesson_id   uuid references public.lessons(id) on delete cascade not null,
  question    text not null,
  type        text default 'single' check (type in ('single','multiple','true_false','fill_blank')),
  options     jsonb not null default '[]',
  explanation text,
  points      integer default 1,
  order_num   integer not null,
  created_at  timestamptz default now()
);

-- 7. ENROLLMENTS
create table if not exists public.enrollments (
  id             uuid primary key default uuid_generate_v4(),
  student_id     uuid references public.profiles(id) on delete cascade not null,
  course_id      uuid references public.courses(id) on delete cascade not null,
  status         text default 'active' check (status in ('active','completed','refunded')),
  payment_id     text,
  progress_pct   integer default 0 check (progress_pct between 0 and 100),
  last_lesson_id uuid references public.lessons(id),
  enrolled_at    timestamptz default now(),
  completed_at   timestamptz,
  unique(student_id, course_id)
);

create index if not exists idx_enrollments_student on public.enrollments(student_id);
create index if not exists idx_enrollments_course  on public.enrollments(course_id);

-- 8. LESSON PROGRESS
create table if not exists public.lesson_progress (
  id              uuid primary key default uuid_generate_v4(),
  student_id      uuid references public.profiles(id) on delete cascade not null,
  lesson_id       uuid references public.lessons(id) on delete cascade not null,
  course_id       uuid references public.courses(id) on delete cascade not null,
  is_completed    boolean default false,
  watch_time_sec  integer default 0,
  completed_at    timestamptz,
  last_watched_at timestamptz default now(),
  unique(student_id, lesson_id)
);

create index if not exists idx_progress_student on public.lesson_progress(student_id, course_id);

-- 9. REVIEWS
create table if not exists public.reviews (
  id                  uuid primary key default uuid_generate_v4(),
  course_id           uuid references public.courses(id) on delete cascade not null,
  student_id          uuid references public.profiles(id) on delete cascade not null,
  rating              integer not null check (rating between 1 and 5),
  comment             text,
  is_verified_purchase boolean default false,
  helpful_count       integer default 0,
  created_at          timestamptz default now(),
  unique(course_id, student_id)
);

-- Auto-update course rating trigger
create or replace function public.recalculate_course_rating(p_course_id uuid)
returns void language plpgsql security definer as $$
begin
  update public.courses
  set rating_avg   = coalesce((select round(avg(rating)::numeric,2) from public.reviews where course_id = p_course_id), 0),
      rating_count = (select count(*) from public.reviews where course_id = p_course_id)
  where id = p_course_id;
end;
$$;

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

-- 10. PAYMENTS
create table if not exists public.payments (
  id                  uuid primary key default uuid_generate_v4(),
  student_id          uuid references public.profiles(id) not null,
  course_id           uuid references public.courses(id),
  amount              numeric(10,2) not null,
  currency            text default 'USD' check (currency in ('USD','HTG')),
  provider            text not null check (provider in ('stripe','moncash','paypal')),
  provider_payment_id text,
  status              text default 'pending' check (status in ('pending','completed','failed','refunded')),
  receipt_url         text,
  created_at          timestamptz default now()
);

-- 11. CERTIFICATES
create table if not exists public.certificates (
  id                 uuid primary key default uuid_generate_v4(),
  student_id         uuid references public.profiles(id) on delete cascade not null,
  course_id          uuid references public.courses(id) on delete cascade not null,
  enrollment_id      uuid references public.enrollments(id),
  certificate_number text unique not null,
  issued_at          timestamptz default now(),
  pdf_url            text,
  verify_url         text not null,
  status             text default 'issued' check (status in ('pending','issued')),
  unique(student_id, course_id)
);

create index if not exists idx_certs_student on public.certificates(student_id);
create index if not exists idx_certs_number  on public.certificates(certificate_number);

-- 12. WISHLIST
create table if not exists public.wishlist (
  id          uuid primary key default uuid_generate_v4(),
  student_id  uuid references public.profiles(id) on delete cascade not null,
  course_id   uuid references public.courses(id) on delete cascade not null,
  added_at    timestamptz default now(),
  unique(student_id, course_id)
);

-- 13. COUPONS
create table if not exists public.coupons (
  id              uuid primary key default uuid_generate_v4(),
  code            text unique not null,
  discount_type   text not null check (discount_type in ('percent','fixed')),
  discount_value  numeric(8,2) not null,
  max_uses        integer,
  used_count      integer default 0,
  course_id       uuid references public.courses(id),
  expires_at      timestamptz,
  is_active       boolean default true,
  created_at      timestamptz default now()
);

-- 14. LESSON Q&A
create table if not exists public.lesson_qa (
  id          uuid primary key default uuid_generate_v4(),
  lesson_id   uuid references public.lessons(id) on delete cascade not null,
  course_id   uuid references public.courses(id) on delete cascade not null,
  student_id  uuid references public.profiles(id) on delete cascade not null,
  question    text not null,
  answer      text,
  answered_by uuid references public.profiles(id),
  answered_at timestamptz,
  is_featured boolean default false,
  created_at  timestamptz default now()
);
create index if not exists idx_qa_course on public.lesson_qa(course_id);
create index if not exists idx_qa_lesson on public.lesson_qa(lesson_id);

-- 15. ANNOUNCEMENTS
create table if not exists public.announcements (
  id            uuid primary key default uuid_generate_v4(),
  course_id     uuid references public.courses(id) on delete cascade not null,
  instructor_id uuid references public.profiles(id) on delete cascade not null,
  title         text not null,
  body          text not null,
  created_at    timestamptz default now()
);

-- 16. ASSIGNMENTS
create table if not exists public.assignments (
  id          uuid primary key default uuid_generate_v4(),
  course_id   uuid references public.courses(id) on delete cascade not null,
  lesson_id   uuid references public.lessons(id) on delete set null,
  title       text not null,
  description text,
  due_date    timestamptz,
  max_points  integer default 100,
  created_at  timestamptz default now()
);

create table if not exists public.assignment_submissions (
  id            uuid primary key default uuid_generate_v4(),
  assignment_id uuid references public.assignments(id) on delete cascade not null,
  student_id    uuid references public.profiles(id) on delete cascade not null,
  file_url      text,
  file_name     text,
  submitted_at  timestamptz default now(),
  grade         integer,
  feedback      text,
  status        text default 'submitted' check (status in ('submitted','graded','returned')),
  unique(assignment_id, student_id)
);

-- 17. LESSON NOTES
create table if not exists public.lesson_notes (
  id            uuid primary key default uuid_generate_v4(),
  student_id    uuid references public.profiles(id) on delete cascade not null,
  lesson_id     uuid references public.lessons(id) on delete cascade not null,
  course_id     uuid references public.courses(id) on delete cascade not null,
  content       text not null,
  timestamp_sec integer,
  created_at    timestamptz default now()
);
create index if not exists idx_notes_student on public.lesson_notes(student_id, course_id);

-- 18. BADGES & GAMIFICATION
create table if not exists public.badges (
  id          uuid primary key default uuid_generate_v4(),
  code        text unique not null,
  name        text not null,
  description text,
  icon        text not null,
  color       text default '#0891b2',
  xp_reward   integer default 0,
  created_at  timestamptz default now()
);

create table if not exists public.user_badges (
  id        uuid primary key default uuid_generate_v4(),
  user_id   uuid references public.profiles(id) on delete cascade not null,
  badge_id  uuid references public.badges(id) on delete cascade not null,
  earned_at timestamptz default now(),
  unique(user_id, badge_id)
);

-- Seed default badges
insert into public.badges (code, name, description, icon, color, xp_reward) values
  ('first_lesson',   'Premier pas',       'Compléter sa première leçon',   '🎯', '#0891b2', 10),
  ('first_course',   'Premier cours',     'Terminer son premier cours',     '🎓', '#10b981', 50),
  ('quiz_ace',       'As du quiz',        'Score parfait à un quiz',        '⭐', '#d97706', 30),
  ('streak_7',       'Semaine parfaite',  '7 jours consécutifs',           '🔥', '#ef4444', 70),
  ('streak_30',      'Mois de feu',       '30 jours consécutifs',          '🏆', '#8b5cf6', 200),
  ('first_cert',     'Certifié EDHA',     'Obtenir son premier certificat','📜', '#06b6d4', 100),
  ('five_courses',   'Passionné',         'Terminer 5 cours',              '💡', '#f97316', 150)
on conflict (code) do nothing;

-- 19. EMAIL LOGS
create table if not exists public.email_logs (
  id       uuid primary key default uuid_generate_v4(),
  user_id  uuid references public.profiles(id) on delete cascade,
  email    text not null,
  type     text not null,
  subject  text not null,
  sent_at  timestamptz default now()
);

-- 20. AUDIT LOGS
create table if not exists public.audit_logs (
  id         uuid primary key default uuid_generate_v4(),
  admin_id   uuid references public.profiles(id),
  action     text not null,
  entity     text not null,
  entity_id  uuid,
  details    jsonb,
  created_at timestamptz default now()
);

-- 21. PLATFORM SETTINGS
create table if not exists public.platform_settings (
  id         uuid primary key default uuid_generate_v4(),
  key        text unique not null,
  value      jsonb not null,
  updated_at timestamptz default now(),
  updated_by uuid references public.profiles(id)
);

insert into public.platform_settings (key, value) values
  ('general', '{"platform_name":"EDHA Academy","allow_registrations":true,"maintenance_mode":false}'::jsonb),
  ('pricing',  '{"platform_free":true,"subscription_enabled":false,"subscription_price":null,"certificate_price":null}'::jsonb)
on conflict (key) do nothing;

-- 22. QUIZ ATTEMPTS
create table if not exists public.quiz_attempts (
  id           uuid primary key default uuid_generate_v4(),
  student_id   uuid references public.profiles(id) on delete cascade not null,
  lesson_id    uuid references public.lessons(id) on delete cascade not null,
  answers      jsonb not null default '{}',
  score        integer,
  passed       boolean,
  submitted_at timestamptz default now()
);

-- ─────────────────────────────────────────────────
-- PLATFORM_STATS VIEW
-- ─────────────────────────────────────────────────
drop view if exists public.platform_stats;
create view public.platform_stats as
  select
    (select count(*) from public.courses)                              as total_courses,
    (select count(*) from public.courses where status='published')     as published_courses,
    (select count(*) from public.profiles where role='student')        as total_students,
    (select count(*) from public.profiles where role='instructor')     as total_instructors,
    (select coalesce(sum(amount),0) from public.payments where status='completed') as total_revenue,
    (select count(*) from public.enrollments where enrolled_at > now() - interval '30 days') as monthly_enrollments,
    (select count(*) from public.courses where status='review')        as pending_review;

-- ─────────────────────────────────────────────────
-- AUTO-UPDATE TIMESTAMPS
-- ─────────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

drop trigger if exists set_updated_at_profiles on public.profiles;
drop trigger if exists set_updated_at_courses  on public.courses;
drop trigger if exists set_updated_at_lessons  on public.lessons;
create trigger set_updated_at_profiles before update on public.profiles for each row execute function public.set_updated_at();
create trigger set_updated_at_courses  before update on public.courses  for each row execute function public.set_updated_at();
create trigger set_updated_at_lessons  before update on public.lessons  for each row execute function public.set_updated_at();

-- ─────────────────────────────────────────────────
-- ROW LEVEL SECURITY
-- ─────────────────────────────────────────────────
alter table public.profiles            enable row level security;
alter table public.categories          enable row level security;
alter table public.courses             enable row level security;
alter table public.modules             enable row level security;
alter table public.lessons             enable row level security;
alter table public.enrollments         enable row level security;
alter table public.lesson_progress     enable row level security;
alter table public.quiz_attempts       enable row level security;
alter table public.reviews             enable row level security;
alter table public.payments            enable row level security;
alter table public.certificates        enable row level security;
alter table public.wishlist            enable row level security;
alter table public.coupons             enable row level security;
alter table public.quiz_questions      enable row level security;
alter table public.lesson_qa           enable row level security;
alter table public.announcements       enable row level security;
alter table public.assignments         enable row level security;
alter table public.assignment_submissions enable row level security;
alter table public.lesson_notes        enable row level security;
alter table public.badges              enable row level security;
alter table public.user_badges         enable row level security;
alter table public.email_logs          enable row level security;
alter table public.audit_logs          enable row level security;
alter table public.platform_settings   enable row level security;

-- Helper function
create or replace function public.user_role() returns text language sql stable as $$
  select coalesce(
    (select role from public.profiles where id = auth.uid()),
    'anonymous'
  )
$$;

-- PROFILES policies
drop policy if exists "public_read_profiles"  on public.profiles;
drop policy if exists "own_profile_update"    on public.profiles;
drop policy if exists "admin_all_profiles"    on public.profiles;
create policy "public_read_profiles"  on public.profiles for select using (true);
create policy "own_profile_update"    on public.profiles for update using (id = auth.uid());
create policy "admin_all_profiles"    on public.profiles for all using (public.user_role() = 'admin');

-- CATEGORIES policies
drop policy if exists "public_read_categories"  on public.categories;
drop policy if exists "admin_manage_categories" on public.categories;
create policy "public_read_categories"  on public.categories for select using (true);
create policy "admin_manage_categories" on public.categories for all using (public.user_role() = 'admin');

-- COURSES policies
drop policy if exists "public_read_published"  on public.courses;
drop policy if exists "instructor_own_courses" on public.courses;
drop policy if exists "admin_all_courses"      on public.courses;
create policy "public_read_published"  on public.courses for select using (status = 'published' or instructor_id = auth.uid() or public.user_role() = 'admin');
create policy "instructor_own_courses" on public.courses for all using (instructor_id = auth.uid());
create policy "admin_all_courses"      on public.courses for all using (public.user_role() = 'admin');

-- MODULES
drop policy if exists "public_read_modules"    on public.modules;
drop policy if exists "instructor_own_modules" on public.modules;
create policy "public_read_modules"    on public.modules for select using (true);
create policy "instructor_own_modules" on public.modules for all using (
  exists (select 1 from public.courses c where c.id = course_id and c.instructor_id = auth.uid())
);

-- LESSONS
drop policy if exists "public_free_preview"   on public.lessons;
drop policy if exists "enrolled_read_lessons" on public.lessons;
drop policy if exists "instructor_own_lessons"on public.lessons;
drop policy if exists "admin_all_lessons"     on public.lessons;
create policy "public_free_preview"    on public.lessons for select using (is_free_preview = true and is_published = true);
create policy "enrolled_read_lessons"  on public.lessons for select using (
  is_published = true and (
    exists (select 1 from public.enrollments e where e.course_id = course_id and e.student_id = auth.uid())
    or exists (select 1 from public.courses c where c.id = course_id and c.instructor_id = auth.uid())
    or public.user_role() = 'admin'
  )
);
create policy "instructor_own_lessons" on public.lessons for all using (
  exists (select 1 from public.courses c where c.id = course_id and c.instructor_id = auth.uid())
);
create policy "admin_all_lessons"      on public.lessons for all using (public.user_role() = 'admin');

-- ENROLLMENTS
drop policy if exists "own_enrollments"          on public.enrollments;
drop policy if exists "instructor_course_enroll" on public.enrollments;
drop policy if exists "admin_all_enrollments"    on public.enrollments;
create policy "own_enrollments"          on public.enrollments for all using (student_id = auth.uid());
create policy "instructor_course_enroll" on public.enrollments for select using (
  exists (select 1 from public.courses c where c.id = course_id and c.instructor_id = auth.uid())
);
create policy "admin_all_enrollments"    on public.enrollments for all using (public.user_role() = 'admin');

-- LESSON PROGRESS
drop policy if exists "own_progress" on public.lesson_progress;
create policy "own_progress" on public.lesson_progress for all using (student_id = auth.uid());

-- REVIEWS
drop policy if exists "public_read_reviews" on public.reviews;
drop policy if exists "own_review"          on public.reviews;
drop policy if exists "admin_all_reviews"   on public.reviews;
create policy "public_read_reviews" on public.reviews for select using (true);
create policy "own_review"          on public.reviews for all using (student_id = auth.uid());
create policy "admin_all_reviews"   on public.reviews for all using (public.user_role() = 'admin');

-- PAYMENTS
drop policy if exists "own_payments"       on public.payments;
drop policy if exists "admin_all_payments" on public.payments;
create policy "own_payments"       on public.payments for select using (student_id = auth.uid());
create policy "admin_all_payments" on public.payments for all using (public.user_role() = 'admin');

-- CERTIFICATES
drop policy if exists "public_verify_cert" on public.certificates;
drop policy if exists "own_certificates"   on public.certificates;
drop policy if exists "admin_all_certs"    on public.certificates;
create policy "public_verify_cert" on public.certificates for select using (true);
create policy "own_certificates"   on public.certificates for all using (student_id = auth.uid());
create policy "admin_all_certs"    on public.certificates for all using (public.user_role() = 'admin');

-- WISHLIST
drop policy if exists "own_wishlist" on public.wishlist;
create policy "own_wishlist" on public.wishlist for all using (student_id = auth.uid());

-- COUPONS
drop policy if exists "public_read_active_coupons" on public.coupons;
drop policy if exists "admin_manage_coupons"       on public.coupons;
create policy "public_read_active_coupons" on public.coupons for select using (is_active = true);
create policy "admin_manage_coupons"       on public.coupons for all using (public.user_role() = 'admin');

-- LESSON Q&A
drop policy if exists "auth_read_qa"  on public.lesson_qa;
drop policy if exists "own_write_qa"  on public.lesson_qa;
drop policy if exists "admin_all_qa"  on public.lesson_qa;
create policy "auth_read_qa"  on public.lesson_qa for select using (auth.uid() is not null);
create policy "own_write_qa"  on public.lesson_qa for insert with check (student_id = auth.uid());
create policy "admin_all_qa"  on public.lesson_qa for all using (public.user_role() = 'admin');

-- ANNOUNCEMENTS
drop policy if exists "auth_read_announcements" on public.announcements;
drop policy if exists "instructor_write_ann"    on public.announcements;
create policy "auth_read_announcements" on public.announcements for select using (auth.uid() is not null);
create policy "instructor_write_ann"    on public.announcements for insert with check (instructor_id = auth.uid());

-- ASSIGNMENTS
drop policy if exists "enrolled_read_assignments" on public.assignments;
drop policy if exists "instructor_write_assign"   on public.assignments;
create policy "enrolled_read_assignments" on public.assignments for select using (auth.uid() is not null);
create policy "instructor_write_assign"   on public.assignments for all using (
  exists (select 1 from public.courses c where c.id = course_id and c.instructor_id = auth.uid())
  or public.user_role() = 'admin'
);

-- ASSIGNMENT SUBMISSIONS
drop policy if exists "own_submissions" on public.assignment_submissions;
create policy "own_submissions" on public.assignment_submissions for all using (student_id = auth.uid());

-- LESSON NOTES
drop policy if exists "own_notes" on public.lesson_notes;
create policy "own_notes" on public.lesson_notes for all using (student_id = auth.uid());

-- BADGES
drop policy if exists "public_read_badges" on public.badges;
create policy "public_read_badges" on public.badges for select using (true);

-- USER BADGES
drop policy if exists "own_badges" on public.user_badges;
create policy "own_badges" on public.user_badges for select using (user_id = auth.uid());

-- EMAIL LOGS
drop policy if exists "admin_email_logs" on public.email_logs;
create policy "admin_email_logs" on public.email_logs for all using (public.user_role() = 'admin');

-- AUDIT LOGS
drop policy if exists "admin_audit" on public.audit_logs;
create policy "admin_audit" on public.audit_logs for all using (public.user_role() = 'admin');

-- PLATFORM SETTINGS
drop policy if exists "admin_settings" on public.platform_settings;
create policy "admin_settings" on public.platform_settings for all using (public.user_role() = 'admin');

-- ─────────────────────────────────────────────────
-- STORAGE BUCKETS
-- ─────────────────────────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('course-thumbnails', 'course-thumbnails', true, 5242880,
   array['image/jpeg','image/png','image/webp']),
  ('course-resources', 'course-resources', true, 52428800,
   array['application/pdf','image/jpeg','image/png','image/webp',
         'application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document',
         'application/zip','text/plain']),
  ('avatars', 'avatars', true, 2097152,
   array['image/jpeg','image/png','image/webp']),
  ('certificates', 'certificates', false, 5242880,
   array['application/pdf'])
on conflict (id) do nothing;

-- ─────────────────────────────────────────────────
-- HACER ADMIN (descomenta y pon tu email)
-- ─────────────────────────────────────────────────
-- UPDATE public.profiles SET role = 'admin' WHERE email = 'TU-EMAIL@aqui.com';

-- ═══════════════════════════════════════════════════════════════════
-- LISTO — 22 tablas, 100% seguro para ejecutar múltiples veces
-- ═══════════════════════════════════════════════════════════════════
