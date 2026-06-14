'use client'

import Link from 'next/link'
import { useLang } from '@/lib/LangContext'
import { CourseCard } from '@/components/course/CourseCard'
import { useEffect, useRef, useState } from 'react'
import {
  BookOpen, Users, Award, ArrowRight, Star, Play,
  CheckCircle, Globe, Shield, Zap, GraduationCap,
  Monitor, School
} from 'lucide-react'

const CONTAINER = 'w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8'

const ICON_MAP: Record<string, string> = {
  BookOpen:'📚', Calculator:'🔢', FlaskConical:'🔬', Landmark:'🏛️',
  Brain:'🧠', Code:'💻', Globe:'🌍', Palette:'🎨', Users:'👥',
  TrendingUp:'📈', Music:'🎵', Camera:'📷', Heart:'❤️', Star:'⭐',
  Zap:'⚡', Microscope:'🔭', Gavel:'⚖️', Leaf:'🌿', Dumbbell:'💪',
  ChefHat:'👨‍🍳', Plane:'✈️', Laptop:'💻', Lightbulb:'💡', Languages:'🗣️',
}

function useCountUp(target: number, duration = 1500, active = false) {
  const [count, setCount] = useState(0)
  useEffect(() => {
    if (!active) return
    let start = 0
    const step = Math.ceil(target / (duration / 16))
    const timer = setInterval(() => {
      start += step
      if (start >= target) { setCount(target); clearInterval(timer) }
      else setCount(start)
    }, 16)
    return () => clearInterval(timer)
  }, [target, duration, active])
  return count
}

function StatCard({ value, label, icon: Icon, active }: {
  value: string; label: string; icon: any; active: boolean
}) {
  const numericPart = parseInt(value.replace(/\D/g, '')) || 0
  const suffix = value.replace(/\d/g, '')
  const animated = useCountUp(numericPart, 1500, active)
  return (
    <div className="flex flex-col sm:flex-row items-center sm:items-start gap-2 sm:gap-3 text-center sm:text-left">
      <div className="w-11 h-11 bg-blue/10 rounded-xl flex items-center justify-center shrink-0">
        <Icon size={20} className="text-blue" />
      </div>
      <div>
        <div className="font-bold text-text text-xl leading-tight tabular-nums">
          {active ? `${animated}${suffix}` : value}
        </div>
        <div className="text-xs text-text3 mt-0.5">{label}</div>
      </div>
    </div>
  )
}

interface Props { featuredCourses: any[]; categories: any[]; stats: any }

export default function HomeClient({ featuredCourses, categories, stats }: Props) {
  const { t, lang } = useLang()
  const statsRef = useRef<HTMLDivElement>(null)
  const [statsActive, setStatsActive] = useState(false)

  useEffect(() => {
    const el = statsRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setStatsActive(true); observer.disconnect() } },
      { threshold: 0.3 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const L = (obj: Record<string, string>) => obj[lang] || obj['fr']

  const testimonials = [
    { name: 'Marie Jean', avatar: 'MJ',
      role:  { fr: 'Étudiante, Port-au-Prince', ht: 'Elèv, Pòtoprens', en: 'Student, Port-au-Prince', es: 'Estudiante, Puerto Príncipe' },
      quote: { fr: "Grâce à EDHA Academy, j'ai obtenu mon certificat en informatique et décroché mon premier emploi !", ht: 'Grasa EDHA Academy, mwen jwenn sètifika enfòmatik mwen epi premye travay mwen !', en: 'Thanks to EDHA Academy, I got my IT certificate and landed my first job!', es: '¡Gracias a EDHA Academy, obtuve mi certificado y conseguí mi primer empleo!' }, stars: 5 },
    { name: 'Pierre Louis', avatar: 'PL',
      role:  { fr: 'Enseignant, Cap-Haïtien', ht: 'Pwofesè, Okap', en: 'Teacher, Cap-Haïtien', es: 'Maestro, Cap-Haïtien' },
      quote: { fr: 'La plateforme est intuitive et les cours sont de très haute qualité. Je recommande à tous.', ht: 'Platfòm nan fasil ak kou yo trè bon kalite. Mwen rekòmande li pou tout moun.', en: 'The platform is intuitive and the courses are of very high quality. I recommend it to everyone.', es: 'La plataforma es intuitiva y los cursos son de muy alta calidad. Lo recomiendo a todos.' }, stars: 5 },
    { name: 'Sophie Beaumont', avatar: 'SB',
      role:  { fr: 'Entrepreneuse, Jacmel', ht: 'Antreprenè, Jakmèl', en: 'Entrepreneur, Jacmel', es: 'Empresaria, Jacmel' },
      quote: { fr: "Les cours en créole haïtien sont exactement ce dont j'avais besoin pour développer mon entreprise.", ht: 'Kou yo nan kreyòl ayisyen se egzakteman sa mwen te bezwen pou devlope biznis mwen.', en: 'The Haitian Creole courses are exactly what I needed to grow my business.', es: 'Los cursos en criollo haitiano son exactamente lo que necesitaba para mi empresa.' }, stars: 5 },
  ]

  const featureCards = [
    { icon: BookOpen, color: 'text-blue',   bg: 'bg-blue/10',
      title: { fr: 'Cours gratuits', ht: 'Kou gratis', en: 'Free courses', es: 'Cursos gratuitos' },
      desc:  { fr: 'Accédez à des cours de qualité sans payer.', ht: 'Jwenn kou kalite san peye.', en: 'Access quality courses for free.', es: 'Accede a cursos de calidad sin pagar.' } },
    { icon: Monitor, color: 'text-cyan',    bg: 'bg-cyan/10',
      title: { fr: 'Plateforme éducative', ht: 'Platfòm edikasyon', en: 'Educational platform', es: 'Plataforma educativa' },
      desc:  { fr: 'Plateforme éducative numérique moderne.', ht: 'Platfòm edikasyon dijital modèn.', en: 'Modern digital educational platform.', es: 'Plataforma educativa digital moderna.' } },
    { icon: Award,   color: 'text-gold',    bg: 'bg-gold/10',
      title: { fr: 'Certificats', ht: 'Sètifika', en: 'Certificates', es: 'Certificados' },
      desc:  { fr: 'Obtenez des certificats reconnus.', ht: 'Jwenn sètifika rekonèt.', en: 'Get recognized certificates.', es: 'Obtén certificados reconocidos.' } },
    { icon: School,  color: 'text-purple',  bg: 'bg-purple/10',
      title: { fr: 'Pour étudiants et écoles', ht: 'Pou elèv ak lekòl', en: 'For students & schools', es: 'Para estudiantes y escuelas' },
      desc:  { fr: 'Pour étudiants et écoles haïtiennes.', ht: 'Pou elèv ak lekòl ayisyen.', en: 'For Haitian students and schools.', es: 'Para estudiantes y escuelas haitianas.' } },
  ]

  const whyItems = [
    { icon: Globe,  key: 'lang',
      title: { fr: 'En créole & français', ht: 'An kreyòl ak fransè', en: 'In Creole & French', es: 'En criollo y francés' },
      desc:  { fr: 'Cours disponibles en français, créole haïtien et anglais.', ht: 'Kou disponib nan fransè, kreyòl ayisyen ak anglè.', en: 'Courses in French, Haitian Creole, and English.', es: 'Cursos en francés, criollo haitiano e inglés.' },
      color: 'text-blue', bg: 'bg-blue/10' },
    { icon: Shield, key: 'cert',
      title: { fr: 'Certificats reconnus', ht: 'Sètifika rekonèt', en: 'Recognized certificates', es: 'Certificados reconocidos' },
      desc:  { fr: 'Obtenez des certificats vérifiables qui valorisent votre parcours.', ht: 'Jwenn sètifika verifiyab ki valorize wout ou.', en: 'Get verifiable certificates that enhance your career.', es: 'Obtén certificados verificables que valoran tu trayectoria.' },
      color: 'text-green', bg: 'bg-green/10' },
    { icon: Zap,    key: 'ai',
      title: { fr: 'Assistant IA inclus', ht: 'Asistan IA enkli', en: 'AI Assistant included', es: 'Asistente IA incluido' },
      desc:  { fr: 'Notre assistant IA vous accompagne à chaque étape.', ht: 'Asistan IA nou an akonpaye w chak etap.', en: 'Our AI assistant guides you at every step.', es: 'Nuestro asistente IA te acompaña en cada paso.' },
      color: 'text-gold', bg: 'bg-gold/10' },
  ]

  const statsData = [
    { value: `${stats?.total_students    || 500}+`, label: { fr: 'Étudiants',    ht: 'Elèv',      en: 'Students',     es: 'Estudiantes'  }, icon: Users },
    { value: `${stats?.published_courses || 50}+`,  label: { fr: 'Cours',        ht: 'Kou',       en: 'Courses',      es: 'Cursos'       }, icon: BookOpen },
    { value: `${stats?.total_instructors || 20}+`,  label: { fr: 'Instructeurs', ht: 'Enstriktè', en: 'Instructors',  es: 'Instructores' }, icon: GraduationCap },
    { value: '1000+',                               label: { fr: 'Certificats',  ht: 'Sètifika',  en: 'Certificates', es: 'Certificados' }, icon: Award },
  ]

  return (
    <>
      {/* ══════════════════════════════════════════════
          HERO — two real columns, no CSS mask tricks
      ══════════════════════════════════════════════ */}
      <section
        className="bg-white overflow-hidden"
        style={{ paddingTop: '64px' }}
      >
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 min-h-[calc(100vh-64px)]">

            {/* ── Left: text ── */}
            <div className="flex items-center px-6 sm:px-10 lg:px-16 py-16 lg:py-20">
              <div className="w-full max-w-xl">

                <div className="inline-flex items-center gap-2 bg-blue/10 border border-blue/20 rounded-full px-4 py-1.5 text-sm text-blue font-medium mb-6">
                  <Star size={12} className="fill-blue" />
                  {t('landing.badge')}
                </div>

                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-text mb-5 leading-[1.1] tracking-tight">
                  {t('landing.hero1')}<br />
                  <span className="text-cyan">{t('landing.hero2')}</span>
                </h1>

                <div className="text-base text-text2 mb-8 space-y-1.5 leading-relaxed">
                  <p>{t('landing.sub1')}</p>
                  <p>{t('landing.sub2')}</p>
                  <p className="text-text3">
                    {t('landing.sub3')} <strong className="text-blue">SYGECO</strong>.
                  </p>
                </div>

                <div className="flex flex-wrap gap-3 mb-5">
                  <Link href="/cursos"
                    className="inline-flex items-center gap-2 text-white font-semibold px-6 py-3 rounded-xl text-sm edha-gradient hover:opacity-90 transition-opacity shadow-md shadow-blue/20">
                    <BookOpen size={15} /> {t('landing.explore')} →
                  </Link>
                  <Link href="/auth/inscription"
                    className="inline-flex items-center gap-2 bg-white border border-border text-text font-semibold px-6 py-3 rounded-xl text-sm hover:bg-bg2 transition-colors shadow-sm">
                    <Play size={13} className="fill-blue text-blue" /> {t('landing.start')}
                  </Link>
                </div>

                <Link href="/auth/devenir-instructeur"
                  className="inline-flex items-center gap-2 bg-white border border-border text-text2 hover:text-blue text-sm px-5 py-2.5 rounded-xl transition-colors hover:border-blue/30 shadow-sm">
                  <School size={15} className="text-blue" />
                  {t('landing.school')} <strong className="text-blue">SYGECO</strong>
                </Link>
              </div>
            </div>

            {/* ── Right: image — overflows slightly into text area ── */}
            <div className="relative hidden lg:block" style={{ marginLeft: '-80px' }}>
              <img
                src="/hero-students.jpg"
                alt="Étudiants EDHA Academy Haïti"
                className="absolute inset-0 w-full h-full object-cover object-center"
              />
              {/* Left fade: image becomes pale/transparent toward text */}
              <div
                className="absolute inset-0"
                style={{
                  background: 'linear-gradient(to right, rgba(255,255,255,1) 0%, rgba(255,255,255,0.7) 15%, rgba(255,255,255,0.15) 35%, transparent 55%)'
                }}
              />
            </div>

          </div>
        </div>

        {/* Mobile: image banner below text */}
        <div className="lg:hidden w-full h-56 sm:h-72 overflow-hidden">
          <img
            src="/hero-students.jpg"
            alt="Étudiants EDHA Academy Haïti"
            className="w-full h-full object-cover object-top"
          />
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          STATS — animated count-up
      ══════════════════════════════════════════════ */}
      <section ref={statsRef} className="bg-white border-t border-b border-border py-8 shadow-sm">
        <div className={CONTAINER}>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-10">
            {statsData.map(({ value, label, icon }) => (
              <StatCard key={L(label)} value={value} label={L(label)} icon={icon} active={statsActive} />
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          FEATURE CARDS
      ══════════════════════════════════════════════ */}
      <section className="py-12 bg-bg2">
        <div className={CONTAINER}>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {featureCards.map(({ icon: Icon, color, bg, title, desc }) => (
              <div key={L(title)} className="bg-white border border-border rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
                <div className={`w-11 h-11 ${bg} rounded-xl flex items-center justify-center mb-3`}>
                  <Icon size={20} className={color} />
                </div>
                <h3 className="font-bold text-text text-sm mb-1">{L(title)}</h3>
                <p className="text-xs text-text3 leading-relaxed">{L(desc)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          WHY EDHA
      ══════════════════════════════════════════════ */}
      <section className="py-16 bg-white">
        <div className={CONTAINER}>
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold text-text mb-2">
              {L({ fr: 'Pourquoi choisir EDHA Academy ?', ht: 'Poukisa chwazi EDHA Academy ?', en: 'Why choose EDHA Academy?', es: '¿Por qué elegir EDHA Academy?' })}
            </h2>
            <p className="text-text3 text-sm">
              {L({ fr: 'Conçu spécifiquement pour les apprenants haïtiens', ht: 'Fèt espesyalman pou moun k ap aprann ayisyen', en: 'Built specifically for Haitian learners', es: 'Diseñado específicamente para los aprendices haitianos' })}
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {whyItems.map(({ icon: Icon, key, title, desc, color, bg }) => (
              <div key={key} className="bg-white border border-border rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
                <div className={`w-12 h-12 ${bg} rounded-xl flex items-center justify-center mb-4`}>
                  <Icon size={22} className={color} />
                </div>
                <h3 className="font-semibold text-text mb-2">{L(title)}</h3>
                <p className="text-sm text-text3 leading-relaxed">{L(desc)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          CATEGORIES
      ══════════════════════════════════════════════ */}
      {categories.length > 0 && (
        <section className="py-16 bg-bg2">
          <div className={CONTAINER}>
            <div className="text-center mb-8">
              <h2 className="text-2xl sm:text-3xl font-bold text-text mb-2">
                {L({ fr: 'Explorez par catégorie', ht: 'Eksplore pa kategori', en: 'Browse by category', es: 'Explorar por categoría' })}
              </h2>
              <p className="text-text3 text-sm">
                {L({ fr: 'Trouvez le domaine qui vous correspond', ht: 'Jwenn domèn ki koresponn ou', en: 'Find the field that suits you', es: 'Encuentra el campo que te corresponde' })}
              </p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {categories.map((cat: any) => (
                <Link key={cat.id} href={`/categorias/${cat.slug}`}
                  className="bg-white hover:bg-bg2 border border-border hover:border-blue/30 rounded-2xl p-4 sm:p-5 text-center transition-all group shadow-sm hover:shadow-md">
                  <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center mx-auto mb-3 text-2xl"
                    style={{ backgroundColor: `${cat.color}15` }}>
                    {ICON_MAP[cat.icon] || '📚'}
                  </div>
                  <p className="text-sm font-medium text-text2 group-hover:text-text transition-colors leading-tight">{cat.name}</p>
                </Link>
              ))}
            </div>
            <div className="text-center mt-6">
              <Link href="/cursos" className="inline-flex items-center gap-1.5 text-sm text-blue hover:underline font-medium">
                {L({ fr: 'Voir tous les cours', ht: 'Wè tout kou yo', en: 'View all courses', es: 'Ver todos los cursos' })}
                <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ══════════════════════════════════════════════
          FEATURED COURSES
      ══════════════════════════════════════════════ */}
      {featuredCourses.length > 0 && (
        <section className="py-16 bg-white">
          <div className={CONTAINER}>
            <div className="text-center mb-8">
              <h2 className="text-2xl sm:text-3xl font-bold text-text mb-2">
                {L({ fr: 'Cours mis en avant', ht: 'Kou espesyal', en: 'Featured courses', es: 'Cursos destacados' })}
              </h2>
              <p className="text-text3 text-sm">
                {L({ fr: 'Sélectionnés par notre équipe pédagogique', ht: 'Chwazi pa ekip pedagojik nou an', en: 'Selected by our educational team', es: 'Seleccionados por nuestro equipo pedagógico' })}
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
              {featuredCourses.map((course: any) => (
                <CourseCard key={course.id} course={course} />
              ))}
            </div>
            <div className="text-center mt-8">
              <Link href="/cursos"
                className="inline-flex items-center gap-2 bg-white border border-border text-text px-6 py-2.5 rounded-xl text-sm font-medium hover:bg-bg2 transition-colors shadow-sm">
                {L({ fr: 'Voir tout le catalogue', ht: 'Wè tout katalòg la', en: 'View full catalog', es: 'Ver todo el catálogo' })}
                <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ══════════════════════════════════════════════
          TESTIMONIALS
      ══════════════════════════════════════════════ */}
      <section className="py-16 bg-bg2">
        <div className={CONTAINER}>
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold text-text mb-2">
              {L({ fr: 'Ce que disent nos étudiants', ht: 'Sa elèv nou yo di', en: 'What our students say', es: 'Lo que dicen nuestros estudiantes' })}
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {testimonials.map(item => (
              <div key={item.name} className="bg-white border border-border rounded-2xl p-6 shadow-sm flex flex-col">
                <div className="flex mb-3">
                  {[...Array(item.stars)].map((_, i) => <Star key={i} size={14} className="text-yellow fill-yellow" />)}
                </div>
                <p className="text-sm text-text2 leading-relaxed mb-4 italic flex-1">&ldquo;{L(item.quote)}&rdquo;</p>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full edha-gradient flex items-center justify-center text-white text-sm font-bold shrink-0">
                    {item.avatar}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-text">{item.name}</p>
                    <p className="text-xs text-text3">{L(item.role)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          CTA
      ══════════════════════════════════════════════ */}
      <section className="py-16 bg-white">
        <div className={CONTAINER}>
          <div className="bg-white border border-border rounded-3xl p-8 sm:p-12 lg:p-16 text-center shadow-sm relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-blue/5 to-cyan/5 rounded-3xl" />
            <div className="relative">
              <h2 className="text-2xl sm:text-3xl font-bold text-text mb-4">
                {L({ fr: 'Vous voulez enseigner ?', ht: 'Ou vle anseye ?', en: 'Want to teach?', es: '¿Quieres enseñar?' })}
              </h2>
              <p className="text-text2 mb-6 max-w-xl mx-auto text-sm sm:text-base">
                {L({ fr: "Rejoignez notre communauté d'instructeurs et partagez vos connaissances avec des milliers d'étudiants haïtiens.", ht: 'Rantre nan kominote enstriktè nou an epi pataje konesans ou ak dè milye elèv ayisyen.', en: 'Join our instructor community and share your knowledge with thousands of Haitian students.', es: 'Únete a nuestra comunidad de instructores y comparte tu conocimiento con miles de estudiantes haitianos.' })}
              </p>
              <div className="flex flex-wrap justify-center gap-2 sm:gap-3 mb-8">
                {L({ fr: "Gratuit pour commencer|Support EDHA dédié|Atteignez des milliers d'étudiants", ht: 'Gratis pou kòmanse|Sipò EDHA dedye|Rive nan dè milye elèv', en: 'Free to start|Dedicated EDHA support|Reach thousands of students', es: 'Gratis para empezar|Soporte EDHA dedicado|Llega a miles de estudiantes' }).split('|').map((item: string) => (
                  <span key={item} className="inline-flex items-center gap-1.5 text-xs text-green bg-green/10 border border-green/20 px-3 py-1.5 rounded-full">
                    <CheckCircle size={11} /> {item}
                  </span>
                ))}
              </div>
              <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4">
                <Link href="/auth/devenir-instructeur"
                  className="inline-flex items-center justify-center gap-2 text-white px-8 py-3 rounded-xl font-semibold text-sm edha-gradient hover:opacity-90 transition-opacity shadow-md">
                  {L({ fr: 'Devenir instructeur', ht: 'Vin yon enstriktè', en: 'Become an instructor', es: 'Ser instructor' })}
                  <ArrowRight size={16} />
                </Link>
                <Link href="/auth/inscription"
                  className="inline-flex items-center justify-center gap-2 bg-white border border-border text-text px-8 py-3 rounded-xl font-semibold text-sm hover:bg-bg2 transition-colors shadow-sm">
                  {L({ fr: "S'inscrire comme étudiant", ht: 'Enskri kòm elèv', en: 'Sign up as student', es: 'Registrarse como estudiante' })}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          FOOTER
      ══════════════════════════════════════════════ */}
      <footer className="border-t border-border py-10 bg-white">
        <div className={CONTAINER}>
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6 mb-6">
            <div className="flex items-center gap-3">
              <img src="/logo.png" alt="EDHA" className="h-8 w-auto" />
              <div>
                <span className="font-bold text-text block text-sm">EDHA Academy</span>
                <span className="text-xs text-text3">Éducation &amp; Développement d&apos;Haïti</span>
              </div>
            </div>
            <nav className="flex flex-wrap justify-center gap-4 sm:gap-6 text-sm text-text3">
              <Link href="/cursos"                   className="hover:text-text transition-colors">{L({ fr: 'Explorer',        ht: 'Eksplore', en: 'Explore',    es: 'Explorar'    })}</Link>
              <Link href="/auth/devenir-instructeur" className="hover:text-text transition-colors">{L({ fr: 'Enseigner',       ht: 'Anseye',   en: 'Teach',      es: 'Enseñar'     })}</Link>
              <Link href="/auth/inscription"         className="hover:text-text transition-colors">{L({ fr: "S'inscrire",     ht: 'Enskri',   en: 'Sign up',    es: 'Registrarse' })}</Link>
              <Link href="/privacy"                  className="hover:text-text transition-colors">{L({ fr: 'Confidentialité', ht: 'Konfidansyalite', en: 'Privacy', es: 'Privacidad' })}</Link>
              <Link href="/terms"                    className="hover:text-text transition-colors">{L({ fr: 'CGU',             ht: 'CGU',      en: 'Terms',      es: 'Términos'    })}</Link>
            </nav>
          </div>
          <div className="border-t border-border pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-text3">
            <p>© 2025 EDHA Academy. {L({ fr: 'Tous droits réservés.', ht: 'Tout dwa rezève.', en: 'All rights reserved.', es: 'Todos los derechos reservados.' })}</p>
            <p>Made with ❤️ for Haïti 🇭🇹</p>
          </div>
        </div>
      </footer>
    </>
  )
}