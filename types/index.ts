// ═══════════════════════════════════════════════════════
// EDHA COURSERA — Types TypeScript
// ═══════════════════════════════════════════════════════

export type UserRole = 'student' | 'instructor' | 'institution' | 'admin'
export type CourseStatus = 'draft' | 'review' | 'published' | 'archived'
export type VideoSource = 'mux' | 'youtube' | 'vimeo' | 'url'
export type PaymentProvider = 'stripe' | 'moncash' | 'paypal'
export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded'
export type EnrollmentStatus = 'active' | 'completed' | 'refunded'
export type Language = 'fr' | 'ht' | 'en' | 'es'
export type PricingModel = 'free' | 'paid' | 'certificate_only'
export type CertificateStatus = 'pending' | 'issued'
export type ProgramStatus = 'draft' | 'review' | 'published' | 'archived'

// ── Outils pratiques disponibles par discipline ──
export type PracticeToolType =
  | 'code_editor'      // Replit / CodeSandbox — programmation
  | 'notebook'         // Google Colab — data science, Python
  | 'math_tool'        // GeoGebra — maths, physique
  | 'design_tool'      // Figma — design, arts visuels
  | 'quiz_native'      // Quiz interactif natif EDHA
  | 'flashcards'       // Mémorisation — langues, droit, médecine
  | 'simulation'       // Simulation interactive (sciences)
  | 'document_editor'  // Éditeur de texte — lettres, humanités
  | 'spreadsheet'      // Tableur — comptabilité, économie
  | 'external_link'    // Lien externe personnalisé

export interface PracticeTool {
  type: PracticeToolType
  label: string        // ex: "Éditeur Python"
  url?: string         // pour external_link et embed custom
  embed?: boolean      // true = iframe dans la page, false = nouvelle fenêtre
  config?: Record<string, any>
}

// ── Profile ──
export interface Profile {
  id: string
  role: UserRole
  full_name: string
  email: string
  avatar_url?: string
  bio?: string
  website?: string
  country?: string
  preferred_language?: Language
  is_verified?: boolean
  created_at: string
  updated_at?: string
  signature_url?: string
  // Instructor-specific
  institution_name?: string
  institution_verified?: boolean
  instructor_application?: any
  instructor_approved_at?: string
  // Institution-specific
  institution_logo_url?: string
  institution_type?: string
  institution_description?: string
  institution_slug?: string
  institution_address?: string
  institution_phone?: string
  director_name?: string
  registration_number?: string
  // Gamification
  xp_points?: number
  streak_days?: number
  last_active_at?: string
  total_hours?: number
}

// ── Category ──
export interface Category {
  id: string
  name: string
  slug: string
  description?: string
  icon: string
  color: string
  parent_id?: string
  course_count?: number
  children?: Category[]
}

// ── Course ──
export interface Course {
  id: string
  instructor_id: string
  category_id: string
  title: string
  slug: string
  subtitle?: string
  description: string
  language: Language
  level: 'debutant' | 'intermediaire' | 'avance'
  thumbnail_url?: string
  preview_video_url?: string
  preview_video_source?: VideoSource
  pricing_model: PricingModel
  price?: number
  price_htg?: number
  certificate_price?: number
  status: CourseStatus
  is_featured: boolean
  tags: string[]
  requirements: string[]
  what_you_learn: string[]
  total_modules: number
  total_lessons: number
  total_duration_min: number
  enrolled_count: number
  rating_avg: number
  rating_count: number
  published_at?: string
  created_at: string
  updated_at: string
  // Outils pratiques attachés au cours
  practice_tools?: PracticeTool[]
  // Joined
  instructor?: Profile
  category?: Category
  modules?: Module[]
  user_enrollment?: Enrollment
  user_progress?: number
}

// ── Program (Parcours / Carrera) ──
export interface Program {
  id: string
  institution_id: string
  title: string
  slug: string
  subtitle?: string
  description: string
  language: Language
  level: 'debutant' | 'intermediaire' | 'avance'
  thumbnail_url?: string
  category_id?: string
  pricing_model: PricingModel
  price?: number
  price_htg?: number
  status: ProgramStatus
  is_featured: boolean
  tags: string[]
  what_you_learn: string[]
  requirements: string[]
  total_courses: number
  total_duration_min: number
  enrolled_count: number
  certificate_title?: string
  created_at: string
  updated_at: string
  // Joined
  institution?: Profile
  category?: Category
  courses?: ProgramCourse[]
  user_enrollment?: ProgramEnrollment
}

// ── Cours dans un programme (ordre important) ──
export interface ProgramCourse {
  id: string
  program_id: string
  course_id: string
  order_num: number
  is_required: boolean
  created_at: string
  // Joined
  course?: Course
}

// ── Inscription à un programme ──
export interface ProgramEnrollment {
  id: string
  student_id: string
  program_id: string
  status: EnrollmentStatus
  payment_id?: string
  enrolled_at: string
  completed_at?: string
  progress_pct: number
  // Joined
  program?: Program
}

// ── Certificat de programme ──
export interface ProgramCertificate {
  id: string
  student_id: string
  program_id: string
  enrollment_id?: string
  certificate_number: string
  issued_at: string
  status: CertificateStatus
  // Joined
  student?: Profile
  program?: Program
}

// ── Module ──
export interface Module {
  id: string
  course_id: string
  title: string
  description?: string
  order_num: number
  total_lessons: number
  total_duration_min: number
  is_free_preview: boolean
  created_at: string
  lessons?: Lesson[]
}

// ── Lesson ──
export interface Lesson {
  id: string
  module_id: string
  course_id: string
  title: string
  description?: string
  order_num: number
  duration_min?: number
  content_type: 'video' | 'text' | 'quiz' | 'assignment' | 'resource' | 'practice'
  video_source?: VideoSource
  video_url?: string
  mux_asset_id?: string
  mux_playback_id?: string
  content_body?: string
  resources?: { name: string; url: string; type: string }[]
  // Outil pratique de cette leçon
  practice_tool?: PracticeTool
  is_free_preview: boolean
  is_published: boolean
  created_at: string
  updated_at: string
  progress?: LessonProgress
}

// ── Enrollment ──
export interface Enrollment {
  id: string
  student_id: string
  course_id: string
  status: EnrollmentStatus
  payment_id?: string
  enrolled_at: string
  completed_at?: string
  progress_pct: number
  last_lesson_id?: string
  course?: Course
}

// ── LessonProgress ──
export interface LessonProgress {
  id: string
  student_id: string
  lesson_id: string
  course_id: string
  is_completed: boolean
  watch_time_sec: number
  completed_at?: string
  last_watched_at: string
}

// ── Quiz ──
export interface QuizQuestion {
  id: string
  lesson_id: string
  question: string
  type: 'single' | 'multiple' | 'true_false'
  options: { text: string; is_correct: boolean }[]
  explanation?: string
  points: number
  order_num: number
}

export interface QuizAttempt {
  id: string
  student_id: string
  lesson_id: string
  answers: Record<string, string[]>
  score: number
  passed: boolean
  submitted_at: string
}

// ── Review ──
export interface Review {
  id: string
  course_id: string
  student_id: string
  rating: number
  comment?: string
  is_verified_purchase: boolean
  helpful_count: number
  created_at: string
  student?: Profile
}

// ── Payment ──
export interface Payment {
  id: string
  student_id: string
  course_id?: string
  amount: number
  currency: 'USD' | 'HTG'
  provider: PaymentProvider
  provider_payment_id?: string
  status: PaymentStatus
  receipt_url?: string
  created_at: string
  course?: Course
  student?: Profile
}

// ── Certificate ──
export interface Certificate {
  id: string
  student_id: string
  course_id: string
  enrollment_id: string
  certificate_number: string
  issued_at: string
  pdf_url?: string
  verify_url: string
  status: CertificateStatus
  student?: Profile
  course?: Course
}

// ── Coupon ──
export interface Coupon {
  id: string
  code: string
  discount_type: 'percent' | 'fixed'
  discount_value: number
  max_uses?: number
  used_count: number
  course_id?: string
  expires_at?: string
  is_active: boolean
  created_at: string
}

// ── MuxUpload ──
export interface MuxUpload {
  upload_id: string
  upload_url: string
  asset_id?: string
  playback_id?: string
  status: 'waiting' | 'asset_created' | 'ready' | 'error'
}

// ── Wishlist ──
export interface WishlistItem {
  id: string
  student_id: string
  course_id: string
  added_at: string
  course?: Course
}

// ── Instructor Analytics ──
export interface InstructorStats {
  total_courses: number
  total_students: number
  total_revenue: number
  avg_rating: number
  monthly_revenue: { month: string; amount: number }[]
  top_courses: { course_id: string; title: string; students: number; revenue: number }[]
}

// ── Institution Analytics ──
export interface InstitutionStats {
  total_programs: number
  total_courses: number
  total_students: number
  total_revenue: number
  avg_program_completion: number
  monthly_enrollments: { month: string; count: number }[]
  top_programs: { program_id: string; title: string; students: number; completion_pct: number }[]
}

// ── Platform Stats (Admin) ──
export interface PlatformStats {
  total_courses: number
  published_courses: number
  total_students: number
  total_instructors: number
  total_institutions: number
  total_programs: number
  total_revenue: number
  monthly_enrollments: number
  pending_review: number
}

// ── Outils pratiques disponibles — catalogue ──
export const PRACTICE_TOOLS_CATALOG: {
  type: PracticeToolType
  label: string
  description: string
  icon: string
  disciplines: string[]
  embedUrl?: string
}[] = [
  {
    type: 'code_editor',
    label: 'Éditeur de code',
    description: 'Python, JavaScript, Java, C++ dans le navigateur',
    icon: 'Code',
    disciplines: ['Informatique', 'Sciences', 'Ingénierie'],
    embedUrl: 'https://replit.com',
  },
  {
    type: 'notebook',
    label: 'Notebook interactif',
    description: 'Jupyter / Google Colab pour data science et Python',
    icon: 'FileCode',
    disciplines: ['Data Science', 'Statistiques', 'IA'],
    embedUrl: 'https://colab.research.google.com',
  },
  {
    type: 'math_tool',
    label: 'Outil mathématique',
    description: 'GeoGebra — géométrie, algèbre, fonctions',
    icon: 'Calculator',
    disciplines: ['Mathématiques', 'Physique', 'Chimie'],
    embedUrl: 'https://www.geogebra.org/calculator',
  },
  {
    type: 'design_tool',
    label: 'Outil de design',
    description: 'Figma — UI/UX, art, conception graphique',
    icon: 'Palette',
    disciplines: ['Design', 'Arts', 'Architecture'],
    embedUrl: 'https://www.figma.com',
  },
  {
    type: 'quiz_native',
    label: 'Quiz interactif',
    description: 'QCM, vrai/faux, réponse courte — natif EDHA',
    icon: 'HelpCircle',
    disciplines: ['Toutes disciplines'],
  },
  {
    type: 'flashcards',
    label: 'Cartes mémoire',
    description: 'Mémorisation par répétition espacée',
    icon: 'Layers',
    disciplines: ['Langues', 'Médecine', 'Droit', 'Histoire'],
  },
  {
    type: 'simulation',
    label: 'Simulation interactive',
    description: 'Expériences virtuelles de sciences',
    icon: 'Zap',
    disciplines: ['Physique', 'Chimie', 'Biologie'],
    embedUrl: 'https://phet.colorado.edu',
  },
  {
    type: 'document_editor',
    label: 'Éditeur de documents',
    description: 'Rédaction et correction de textes',
    icon: 'FileText',
    disciplines: ['Lettres', 'Humanités', 'Droit', 'Philo'],
  },
  {
    type: 'spreadsheet',
    label: 'Tableur',
    description: 'Calculs, graphiques, modélisation financière',
    icon: 'Table',
    disciplines: ['Comptabilité', 'Économie', 'Gestion'],
  },
  {
    type: 'external_link',
    label: 'Outil externe personnalisé',
    description: 'Lien vers n\'importe quelle plateforme externe',
    icon: 'ExternalLink',
    disciplines: ['Toutes disciplines'],
  },
]