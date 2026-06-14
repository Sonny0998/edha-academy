-- ═══════════════════════════════════════════════════════════════════
-- EDHA COURSERA — Supabase SQL Schema
-- Plateforme d'apprentissage en ligne type Coursera pour Haïti
-- ═══════════════════════════════════════════════════════════════════
-- ORDRE D'EXÉCUTION:
--   1. Coller ce fichier dans Supabase → SQL Editor → Run
--   2. Configurer les variables dans .env.local
-- ═══════════════════════════════════════════════════════════════════

create extension if not exists "uuid-ossp";
create extension if not exists "pg_trgm"; -- for full-text search

-- ─────────────────────────────────────────────────
-- 1. PROFILES (extends auth.users)
-- ─────────────────────────────────────────────────
create table public.profiles (
  id                    uuid references auth.users on delete cascade primary key,
  role                  text not null default 'student'
                          check (role in ('student','instructor','admin')),
  full_name             text not null,
  email                 text,
  avatar_url            text,
  bio                   text,
  website               text,
  country               text default 'HT',
  preferred_language    text default 'fr' check (preferred_language in ('fr','ht','en')),
  -- Instructor-specific
  institution_name      text,
  institution_verified  boolean default false,
  instructor_approved_at timestamptz,
  -- Stats
  total_courses_taught  integer default 0,
  total_students_taught integer default 0,
  is_verified           boolean default false,
  created_at            timestamptz default now(),
  updated_at            timestamptz default now()
);

-- Auto-create profile on signup
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

-- ─────────────────────────────────────────────────
-- 2. CATEGORIES
-- ─────────────────────────────────────────────────
create table public.categories (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null,
  slug        text unique not null,
  description text,
  icon        text default 'BookOpen',
  color       text default '#4f6ef7',
  parent_id   uuid references public.categories(id),
  order_num   integer default 0,
  created_at  timestamptz default now()
);

-- Seed default categories
insert into public.categories (name, slug, icon, color) values
  ('Mathématiques',     'mathematiques',     'Calculator',      '#4f6ef7'),
  ('Français',          'francais',          'BookOpen',        '#a855f7'),
  ('Sciences',          'sciences',          'Flask',           '#22c55e'),
  ('Histoire',          'histoire',          'Landmark',        '#f59e0b'),
  ('Philosophie',       'philosophie',       'Brain',           '#ec4899'),
  ('Informatique',      'informatique',      'Code',            '#06b6d4'),
  ('Langues',           'langues',           'Globe',           '#8b5cf6'),
  ('Arts',              'arts',              'Palette',         '#f97316'),
  ('Sciences Sociales', 'sciences-sociales', 'Users',           '#10b981'),
  ('Business',          'business',          'TrendingUp',      '#3b82f6');

-- ─────────────────────────────────────────────────
-- 3. COURSES
-- ─────────────────────────────────────────────────
create table public.courses (
  id                  uuid primary key default uuid_generate_v4(),
  instructor_id       uuid references public.profiles(id) on delete cascade not null,
  category_id         uuid references public.categories(id),
  title               text not null,
  slug                text unique not null,
  subtitle            text,
  description         text not null default '',
  language            text default 'fr' check (language in ('fr','ht','en')),
  level               text default 'debutant' check (level in ('debutant','intermediaire','avance')),
  thumbnail_url       text,
  preview_video_url   text,
  preview_video_source text check (preview_video_source in ('mux','youtube','vimeo','url')),
  -- Pricing
  pricing_model       text default 'free' check (pricing_model in ('free','paid','certificate_only')),
  price               numeric(8,2),
  price_htg           numeric(10,2),    -- Gourdes haïtiennes
  certificate_price   numeric(8,2),
  -- Metadata
  status              text default 'draft' check (status in ('draft','review','published','archived')),
  is_featured         boolean default false,
  tags                text[] default '{}',
  requirements        text[] default '{}',
  what_you_learn      text[] default '{}',
  -- Computed stats
  total_modules       integer default 0,
  total_lessons       integer default 0,
  total_duration_min  integer default 0,
  enrolled_count      integer default 0,
  rating_avg          numeric(3,2) default 0,
  rating_count        integer default 0,
  -- Search
  search_vector       tsvector,
  published_at        timestamptz,
  created_at          timestamptz default now(),
  updated_at          timestamptz default now()
);

-- Full-text search
create index idx_courses_search on public.courses using gin(search_vector);
create index idx_courses_status  on public.courses(status);
create index idx_courses_category on public.courses(category_id);
create index idx_courses_instructor on public.courses(instructor_id);
create index idx_courses_featured on public.courses(is_featured) where is_featured = true;

create or replace function public.update_course_search()
returns trigger language plpgsql as $$
begin
  new.search_vector := to_tsvector('french',
    coalesce(new.title,'') || ' ' ||
    coalesce(new.subtitle,'') || ' ' ||
    coalesce(new.description,'')
  );
  return new;
end;
$$;

create trigger courses_search_update
  before insert or update on public.courses
  for each row execute function public.update_course_search();

-- Increment enrolled_count function (called from API)
create or replace function public.increment_enrolled_count(course_id uuid)
returns void language sql as $$
  update public.courses set enrolled_count = enrolled_count + 1 where id = course_id;
$$;

-- ─────────────────────────────────────────────────
-- 4. MODULES
-- ─────────────────────────────────────────────────
create table public.modules (
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

create index idx_modules_course on public.modules(course_id, order_num);

-- ─────────────────────────────────────────────────
-- 5. LESSONS
-- ─────────────────────────────────────────────────
create table public.lessons (
  id               uuid primary key default uuid_generate_v4(),
  module_id        uuid references public.modules(id) on delete cascade not null,
  course_id        uuid references public.courses(id) on delete cascade not null,
  title            text not null,
  description      text,
  order_num        integer not null,
  duration_min     integer,
  content_type     text default 'video'
                     check (content_type in ('video','text','quiz','assignment','resource')),
  -- Video
  video_source     text check (video_source in ('mux','youtube','vimeo','url')),
  video_url        text,
  mux_asset_id     text,
  mux_playback_id  text,
  mux_upload_id    text,
  -- Text
  content_body     text,
  -- Resources
  resources        jsonb default '[]',
  is_free_preview  boolean default false,
  is_published     boolean default false,
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);

create index idx_lessons_module on public.lessons(module_id, order_num);
create index idx_lessons_course on public.lessons(course_id);

-- ─────────────────────────────────────────────────
-- 6. QUIZ QUESTIONS
-- ─────────────────────────────────────────────────
create table public.quiz_questions (
  id          uuid primary key default uuid_generate_v4(),
  lesson_id   uuid references public.lessons(id) on delete cascade not null,
  question    text not null,
  type        text default 'single' check (type in ('single','multiple','true_false')),
  options     jsonb not null default '[]',   -- [{text, is_correct}]
  explanation text,
  points      integer default 1,
  order_num   integer not null,
  created_at  timestamptz default now()
);

-- ─────────────────────────────────────────────────
-- 7. ENROLLMENTS
-- ─────────────────────────────────────────────────
create table public.enrollments (
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

create index idx_enrollments_student on public.enrollments(student_id);
create index idx_enrollments_course  on public.enrollments(course_id);

-- ─────────────────────────────────────────────────
-- 8. LESSON PROGRESS
-- ─────────────────────────────────────────────────
create table public.lesson_progress (
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

create index idx_progress_student on public.lesson_progress(student_id, course_id);

-- ─────────────────────────────────────────────────
-- 9. QUIZ ATTEMPTS
-- ─────────────────────────────────────────────────
create table public.quiz_attempts (
  id           uuid primary key default uuid_generate_v4(),
  student_id   uuid references public.profiles(id) on delete cascade not null,
  lesson_id    uuid references public.lessons(id) on delete cascade not null,
  answers      jsonb not null default '{}',
  score        integer,
  passed       boolean,
  submitted_at timestamptz default now()
);

-- ─────────────────────────────────────────────────
-- 10. REVIEWS
-- ─────────────────────────────────────────────────
create table public.reviews (
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

-- Auto-update course rating
create or replace function public.update_course_rating()
returns trigger language plpgsql as $$
begin
  update public.courses
  set
    rating_avg   = (select round(avg(rating)::numeric, 2) from public.reviews where course_id = new.course_id),
    rating_count = (select count(*) from public.reviews where course_id = new.course_id)
  where id = new.course_id;
  return new;
end;
$$;

create trigger reviews_update_rating
  after insert or update or delete on public.reviews
  for each row execute function public.update_course_rating();

-- ─────────────────────────────────────────────────
-- 11. PAYMENTS
-- ─────────────────────────────────────────────────
create table public.payments (
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

create index idx_payments_student on public.payments(student_id);
create index idx_payments_status  on public.payments(status);

-- ─────────────────────────────────────────────────
-- 12. CERTIFICATES
-- ─────────────────────────────────────────────────
create table public.certificates (
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

create index idx_certs_student on public.certificates(student_id);
create index idx_certs_number  on public.certificates(certificate_number);

-- ─────────────────────────────────────────────────
-- 13. WISHLIST
-- ─────────────────────────────────────────────────
create table public.wishlist (
  id          uuid primary key default uuid_generate_v4(),
  student_id  uuid references public.profiles(id) on delete cascade not null,
  course_id   uuid references public.courses(id) on delete cascade not null,
  added_at    timestamptz default now(),
  unique(student_id, course_id)
);

-- ─────────────────────────────────────────────────
-- 14. COUPONS
-- ─────────────────────────────────────────────────
create table public.coupons (
  id              uuid primary key default uuid_generate_v4(),
  code            text unique not null,
  discount_type   text not null check (discount_type in ('percent','fixed')),
  discount_value  numeric(8,2) not null,
  max_uses        integer,
  used_count      integer default 0,
  course_id       uuid references public.courses(id),  -- null = all courses
  expires_at      timestamptz,
  is_active       boolean default true,
  created_at      timestamptz default now()
);

-- ─────────────────────────────────────────────────
-- 15. PLATFORM_STATS VIEW
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
-- 16. AUTO-UPDATE TIMESTAMPS
-- ─────────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

create trigger set_updated_at_profiles before update on public.profiles for each row execute function public.set_updated_at();
create trigger set_updated_at_courses  before update on public.courses  for each row execute function public.set_updated_at();
create trigger set_updated_at_lessons  before update on public.lessons  for each row execute function public.set_updated_at();

-- ═══════════════════════════════════════════════════════════════════
-- 17. ROW LEVEL SECURITY
-- ═══════════════════════════════════════════════════════════════════

-- Helper
create or replace function public.user_role() returns text language sql stable as $$
  select auth.jwt()->'user_metadata'->>'role'
$$;

-- PROFILES
alter table public.profiles enable row level security;
create policy "public_read_profiles"     on public.profiles for select using (true);
create policy "own_profile_update"       on public.profiles for update using (id = auth.uid());
create policy "admin_all_profiles"       on public.profiles for all using (public.user_role() = 'admin');

-- CATEGORIES
alter table public.categories enable row level security;
create policy "public_read_categories" on public.categories for select using (true);
create policy "admin_manage_categories" on public.categories for all using (public.user_role() = 'admin');

-- COURSES
alter table public.courses enable row level security;
create policy "public_read_published"   on public.courses for select using (status = 'published');
create policy "instructor_own_courses"  on public.courses for all using (instructor_id = auth.uid());
create policy "admin_all_courses"       on public.courses for all using (public.user_role() = 'admin');

-- MODULES
alter table public.modules enable row level security;
create policy "public_read_modules"     on public.modules for select using (
  exists (select 1 from public.courses c where c.id = course_id and c.status = 'published')
);
create policy "instructor_own_modules"  on public.modules for all using (
  exists (select 1 from public.courses c where c.id = course_id and c.instructor_id = auth.uid())
);

-- LESSONS
alter table public.lessons enable row level security;
create policy "public_free_preview"     on public.lessons for select using (is_free_preview = true and is_published = true);
create policy "enrolled_read_lessons"   on public.lessons for select using (
  is_published = true and
  exists (select 1 from public.enrollments e where e.course_id = course_id and e.student_id = auth.uid())
);
create policy "instructor_own_lessons"  on public.lessons for all using (
  exists (select 1 from public.courses c where c.id = course_id and c.instructor_id = auth.uid())
);
create policy "admin_all_lessons"       on public.lessons for all using (public.user_role() = 'admin');

-- ENROLLMENTS
alter table public.enrollments enable row level security;
create policy "own_enrollments"         on public.enrollments for all using (student_id = auth.uid());
create policy "instructor_course_enroll" on public.enrollments for select using (
  exists (select 1 from public.courses c where c.id = course_id and c.instructor_id = auth.uid())
);
create policy "admin_all_enrollments"   on public.enrollments for all using (public.user_role() = 'admin');

-- LESSON PROGRESS
alter table public.lesson_progress enable row level security;
create policy "own_progress"            on public.lesson_progress for all using (student_id = auth.uid());

-- QUIZ ATTEMPTS
alter table public.quiz_attempts enable row level security;
create policy "own_attempts"            on public.quiz_attempts for all using (student_id = auth.uid());

-- REVIEWS
alter table public.reviews enable row level security;
create policy "public_read_reviews"     on public.reviews for select using (true);
create policy "own_review"              on public.reviews for all using (student_id = auth.uid());
create policy "admin_all_reviews"       on public.reviews for all using (public.user_role() = 'admin');

-- PAYMENTS
alter table public.payments enable row level security;
create policy "own_payments"            on public.payments for select using (student_id = auth.uid());
create policy "admin_all_payments"      on public.payments for all using (public.user_role() = 'admin');

-- CERTIFICATES
alter table public.certificates enable row level security;
create policy "public_verify_cert"      on public.certificates for select using (true);
create policy "own_certificates"        on public.certificates for select using (student_id = auth.uid());
create policy "admin_all_certs"         on public.certificates for all using (public.user_role() = 'admin');

-- WISHLIST
alter table public.wishlist enable row level security;
create policy "own_wishlist"            on public.wishlist for all using (student_id = auth.uid());

-- COUPONS
alter table public.coupons enable row level security;
create policy "public_read_active_coupons" on public.coupons for select using (is_active = true);
create policy "admin_manage_coupons"    on public.coupons for all using (public.user_role() = 'admin');

-- QUIZ QUESTIONS
alter table public.quiz_questions enable row level security;
create policy "enrolled_read_questions" on public.quiz_questions for select using (
  exists (
    select 1 from public.lessons l
    join public.enrollments e on e.course_id = l.course_id
    where l.id = lesson_id and e.student_id = auth.uid()
  )
);
create policy "instructor_own_questions" on public.quiz_questions for all using (
  exists (
    select 1 from public.lessons l
    join public.courses c on c.id = l.course_id
    where l.id = lesson_id and c.instructor_id = auth.uid()
  )
);

-- ═══════════════════════════════════════════════════════════════════
-- 18. STORAGE BUCKETS
-- ═══════════════════════════════════════════════════════════════════
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('course-thumbnails', 'course-thumbnails', true, 5242880,
   array['image/jpeg','image/png','image/webp']),
  ('course-resources',  'course-resources',  false, 52428800,
   array['application/pdf','image/jpeg','image/png','image/webp',
         'application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document']),
  ('avatars',           'avatars',           true,  2097152,
   array['image/jpeg','image/png','image/webp']),
  ('certificates',      'certificates',      false, 5242880,
   array['application/pdf'])
on conflict (id) do nothing;

-- Storage RLS
create policy "public_read_thumbnails" on storage.objects for select using (bucket_id = 'course-thumbnails');
create policy "instructor_upload_thumbnail" on storage.objects for insert
  to authenticated with check (bucket_id = 'course-thumbnails');

create policy "enrolled_read_resources" on storage.objects for select
  to authenticated using (bucket_id = 'course-resources');
create policy "instructor_upload_resources" on storage.objects for insert
  to authenticated with check (bucket_id = 'course-resources');

create policy "public_read_avatars" on storage.objects for select using (bucket_id = 'avatars');
create policy "own_avatar_upload" on storage.objects for insert
  to authenticated with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "own_certificate_read" on storage.objects for select
  to authenticated using (bucket_id = 'certificates' and (storage.foldername(name))[1] = auth.uid()::text);

-- ═══════════════════════════════════════════════════════════════════
-- DONE!
-- Tables: 14 | Views: 1 | RLS Policies: 30+ | Triggers: 6
-- Buckets: 4 | Categories: 10
-- ═══════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────
-- MIGRATIONS: Add missing columns post-initial schema
-- Run these if you already ran the schema above
-- ─────────────────────────────────────────────────

-- Add instructor_application column to profiles (stores pending application data)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS instructor_application jsonb,
  ADD COLUMN IF NOT EXISTS instructor_approved_at timestamptz;

-- Add admin_feedback to courses (rejection reason)
ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS admin_feedback text;

-- ── Super admin setup (run once after creating your admin account) ──
-- UPDATE auth.users
-- SET raw_user_meta_data = jsonb_set(raw_user_meta_data, '{role}', '"admin"')
-- WHERE email = 'your-admin@email.com';
-- 
-- UPDATE public.profiles SET role = 'admin' WHERE email = 'your-admin@email.com';

-- ─────────────────────────────────────────────────
-- EXTRA TABLES for full Coursera parity
-- Run AFTER initial schema
-- ─────────────────────────────────────────────────

-- Notes (student notes per lesson with optional video timestamp)
create table if not exists public.notes (
  id          uuid primary key default uuid_generate_v4(),
  student_id  uuid references public.profiles(id) on delete cascade not null,
  course_id   uuid references public.courses(id) on delete cascade not null,
  lesson_id   uuid references public.lessons(id) on delete cascade not null,
  content     text not null,
  timestamp_sec integer,          -- video timestamp when note was taken
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);
alter table public.notes enable row level security;
create policy "own_notes" on public.notes for all using (student_id = auth.uid());
create index if not exists idx_notes_student_lesson on public.notes(student_id, lesson_id);

-- Forum threads per course
create table if not exists public.forum_threads (
  id          uuid primary key default uuid_generate_v4(),
  course_id   uuid references public.courses(id) on delete cascade not null,
  lesson_id   uuid references public.lessons(id) on delete set null,
  author_id   uuid references public.profiles(id) on delete cascade not null,
  title       text not null,
  body        text not null,
  is_question boolean default true,
  is_pinned   boolean default false,
  is_answered boolean default false,
  upvotes     integer default 0,
  reply_count integer default 0,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

create table if not exists public.forum_replies (
  id          uuid primary key default uuid_generate_v4(),
  thread_id   uuid references public.forum_threads(id) on delete cascade not null,
  author_id   uuid references public.profiles(id) on delete cascade not null,
  body        text not null,
  is_accepted boolean default false,  -- instructor marks as best answer
  upvotes     integer default 0,
  created_at  timestamptz default now()
);

alter table public.forum_threads enable row level security;
alter table public.forum_replies  enable row level security;
create policy "enrolled_read_threads" on public.forum_threads for select using (
  exists (select 1 from public.enrollments e where e.course_id = course_id and e.student_id = auth.uid())
  or exists (select 1 from public.courses c where c.id = course_id and c.instructor_id = auth.uid())
  or (select role from public.profiles where id = auth.uid()) = 'admin'
);
create policy "enrolled_write_threads" on public.forum_threads for insert
  with check (author_id = auth.uid());
create policy "enrolled_read_replies" on public.forum_replies for select using (
  exists (
    select 1 from public.forum_threads t
    join public.enrollments e on e.course_id = t.course_id
    where t.id = thread_id and e.student_id = auth.uid()
  )
);
create policy "enrolled_write_replies" on public.forum_replies for insert
  with check (author_id = auth.uid());

create index if not exists idx_threads_course on public.forum_threads(course_id, created_at desc);
create index if not exists idx_replies_thread on public.forum_replies(thread_id, created_at);

-- Add instructor_application to profiles if not exists
alter table public.profiles
  add column if not exists instructor_application jsonb,
  add column if not exists instructor_approved_at timestamptz;

-- Add admin_feedback to courses
alter table public.courses
  add column if not exists admin_feedback text;
