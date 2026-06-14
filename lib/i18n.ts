// ═══════════════════════════════════════════════════
// EDHA Academy — Système de traduction
// Langues: FR (défaut), HT (Kreyòl), EN, ES
// ═══════════════════════════════════════════════════

export type Lang = 'fr' | 'ht' | 'en' | 'es'

export const translations = {
  // ── Navbar ──
  nav: {
    explore:   { fr: 'Explorer', ht: 'Eksplore', en: 'Explore', es: 'Explorar' },
    teach:     { fr: 'Enseigner', ht: 'Anseye', en: 'Teach', es: 'Enseñar' },
    login:     { fr: 'Connexion', ht: 'Koneksyon', en: 'Login', es: 'Iniciar sesión' },
    register:  { fr: 'S\'inscrire', ht: 'Enskri', en: 'Sign up', es: 'Registrarse' },
    search:    { fr: 'Rechercher un cours...', ht: 'Chèche yon kou...', en: 'Search a course...', es: 'Buscar un curso...' },
    dashboard: { fr: 'Mon espace', ht: 'Espas mwen', en: 'My space', es: 'Mi espacio' },
    logout:    { fr: 'Se déconnecter', ht: 'Dekonekte', en: 'Sign out', es: 'Cerrar sesión' },
  },
  // ── Landing ──
  landing: {
    badge:     { fr: 'Éduquer pour changer des vies', ht: 'Edike pou chanje lavi', en: 'Educate to change lives', es: 'Educar para cambiar vidas' },
    hero1:     { fr: 'Apprenez sans limites,', ht: 'Aprann san limit,', en: 'Learn without limits,', es: 'Aprende sin límites,' },
    hero2:     { fr: 'réussissez partout.', ht: 'reyisi toupatou.', en: 'succeed everywhere.', es: 'triunfa en todas partes.' },
    sub1:      { fr: 'Des cours en ligne gratuits et de qualité en français, créole et anglais.', ht: 'Kou sou entènèt gratis ak kalite bon nan fransè, kreyòl ak anglè.', en: 'Free high-quality online courses in French, Creole, and English.', es: 'Cursos gratuitos y de calidad en francés, criollo e inglés.' },
    sub2:      { fr: 'Formez-vous avec des experts et obtenez des certificats reconnus.', ht: 'Fòme w ak ekspè epi jwenn sètifika rekonèt.', en: 'Train with experts and get recognized certificates.', es: 'Fórmate con expertos y obtén certificados reconocidos.' },
    explore:   { fr: 'Explorer les cours', ht: 'Eksplore kou yo', en: 'Explore courses', es: 'Explorar cursos' },
    start:     { fr: 'Commencer gratuitement', ht: 'Kòmanse gratis', en: 'Start for free', es: 'Empezar gratis' },
   sub3:      { fr: 'Nous aidons aussi les écoles à se digitaliser à travers', ht: 'Nou ede lekòl yo dijitalize tou atravè', en: 'We also help schools digitize through', es: 'También ayudamos a las escuelas a digitalizarse a través de' },
    school:    { fr: 'Inscrivez votre école sur', ht: 'Enskri lekòl ou sou', en: 'Register your school on', es: 'Registra tu escuela en' },
  },
  // ── Feature cards ──
  features: {
    free_title:  { fr: 'Cours gratuits', ht: 'Kou gratis', en: 'Free courses', es: 'Cursos gratuitos' },
    free_desc:   { fr: 'Accédez à des cours de qualité sans payer.', ht: 'Jwenn kou kalite san peye.', en: 'Access quality courses for free.', es: 'Accede a cursos de calidad sin pagar.' },
    platform_title: { fr: 'Plateforme éducative', ht: 'Platfòm edikasyon', en: 'Educational platform', es: 'Plataforma educativa' },
    cert_title:  { fr: 'Certificats', ht: 'Sètifika', en: 'Certificates', es: 'Certificados' },
    cert_desc:   { fr: 'Obtenez des certificats reconnus.', ht: 'Jwenn sètifika rekonèt.', en: 'Get recognized certificates.', es: 'Obtén certificados reconocidos.' },
    school_title: { fr: 'Pour étudiants et écoles', ht: 'Pou elèv ak lekòl', en: 'For students and schools', es: 'Para estudiantes y escuelas' },
    school_desc:  { fr: 'Pour étudiants et écoles haïtiennes.', ht: 'Pou elèv ak lekòl ayisyen.', en: 'For Haitian students and schools.', es: 'Para estudiantes y escuelas haitianas.' },
  },
  // ── Auth ──
  auth: {
    login_title:    { fr: 'Connexion', ht: 'Koneksyon', en: 'Login', es: 'Iniciar sesión' },
    login_sub:      { fr: 'Bienvenue sur EDHA Academy', ht: 'Byenveni sou EDHA Academy', en: 'Welcome to EDHA Academy', es: 'Bienvenido a EDHA Academy' },
    google:         { fr: 'Continuer avec Google', ht: 'Kontinye ak Google', en: 'Continue with Google', es: 'Continuar con Google' },
    email_label:    { fr: 'Email', ht: 'Imèl', en: 'Email', es: 'Correo' },
    pwd_label:      { fr: 'Mot de passe', ht: 'Modpas', en: 'Password', es: 'Contraseña' },
    connect:        { fr: 'Se connecter', ht: 'Konekte', en: 'Sign in', es: 'Iniciar sesión' },
    no_account:     { fr: 'Pas encore de compte ?', ht: 'Ou pa gen kont?', en: 'No account yet?', es: '¿Sin cuenta todavía?' },
    register_link:  { fr: 'S\'inscrire', ht: 'Enskri', en: 'Sign up', es: 'Registrarse' },
    teach_link:     { fr: 'Devenir instructeur', ht: 'Vin yon enstriktè', en: 'Become an instructor', es: 'Ser instructor' },
    register_title: { fr: 'Créer un compte étudiant', ht: 'Kreye yon kont elèv', en: 'Create a student account', es: 'Crear cuenta de estudiante' },
    register_sub:   { fr: 'Accédez à des milliers de cours gratuits', ht: 'Jwenn aksè a milye kou gratis', en: 'Access thousands of free courses', es: 'Accede a miles de cursos gratuitos' },
    name_label:     { fr: 'Nom complet', ht: 'Non konplè', en: 'Full name', es: 'Nombre completo' },
    create:         { fr: 'Créer mon compte', ht: 'Kreye kont mwen', en: 'Create my account', es: 'Crear mi cuenta' },
  },
  // ── Learn page ──
  learn: {
    mark_done:    { fr: 'Marquer terminé', ht: 'Make fini', en: 'Mark complete', es: 'Marcar completado' },
    next:         { fr: 'Suivant', ht: 'Swivan', en: 'Next', es: 'Siguiente' },
    prev:         { fr: 'Précédent', ht: 'Anvan', en: 'Previous', es: 'Anterior' },
    notes:        { fr: 'Notes', ht: 'Nòt', en: 'Notes', es: 'Notas' },
    syllabus:     { fr: 'Syllabus', ht: 'Silabus', en: 'Syllabus', es: 'Temario' },
    write_note:   { fr: 'Écrivez une note...', ht: 'Ekri yon nòt...', en: 'Write a note...', es: 'Escribe una nota...' },
    save_note:    { fr: 'Sauvegarder', ht: 'Sove', en: 'Save', es: 'Guardar' },
    done_badge:   { fr: 'Terminé', ht: 'Fini', en: 'Done', es: 'Hecho' },
    progress:     { fr: 'Progression', ht: 'Pwogrè', en: 'Progress', es: 'Progreso' },
    congrats:     { fr: 'Cours terminé ! 🎉', ht: 'Kou fini ! 🎉', en: 'Course complete! 🎉', es: '¡Curso completado! 🎉' },
    see_cert:     { fr: 'Voir mon certificat', ht: 'Wè sètifika mwen', en: 'See my certificate', es: 'Ver mi certificado' },
    speed:        { fr: 'Vitesse', ht: 'Vitès', en: 'Speed', es: 'Velocidad' },
  },
  // ── Dashboard commun ──
  dashboard: {
    hello:      { fr: 'Bonjour', ht: 'Bonjou', en: 'Hello', es: 'Hola' },
    my_courses: { fr: 'Mes cours', ht: 'Kou mwen yo', en: 'My courses', es: 'Mis cursos' },
    calendar:   { fr: 'Calendrier', ht: 'Kalandriye', en: 'Calendar', es: 'Calendario' },
    certs:      { fr: 'Certificats', ht: 'Sètifika', en: 'Certificates', es: 'Certificados' },
    wishlist:   { fr: 'Liste de souhaits', ht: 'Lis vle mwen', en: 'Wishlist', es: 'Lista de deseos' },
    profile:    { fr: 'Mon profil', ht: 'Pwofil mwen', en: 'My profile', es: 'Mi perfil' },
    save:       { fr: 'Sauvegarder', ht: 'Sove', en: 'Save', es: 'Guardar' },
    cancel:     { fr: 'Annuler', ht: 'Anile', en: 'Cancel', es: 'Cancelar' },
  },
  // ── Course catalog ──
  catalog: {
    all_courses: { fr: 'Tous les cours', ht: 'Tout kou yo', en: 'All courses', es: 'Todos los cursos' },
    free:        { fr: 'Gratuit', ht: 'Gratis', en: 'Free', es: 'Gratis' },
    enroll:      { fr: 'S\'inscrire gratuitement', ht: 'Enskri gratis', en: 'Enroll for free', es: 'Inscribirse gratis' },
    students:    { fr: 'étudiants', ht: 'elèv', en: 'students', es: 'estudiantes' },
    level_beg:   { fr: 'Débutant', ht: 'Debitant', en: 'Beginner', es: 'Principiante' },
    level_int:   { fr: 'Intermédiaire', ht: 'Entèmedyè', en: 'Intermediate', es: 'Intermedio' },
    level_adv:   { fr: 'Avancé', ht: 'Avanse', en: 'Advanced', es: 'Avanzado' },
  },
} as const

export type TranslationKey = keyof typeof translations

export function t(key: string, lang: Lang = 'fr'): string {
  const parts = key.split('.')
  let current: any = translations
  for (const part of parts) {
    if (!current[part]) return key
    current = current[part]
  }
  return current[lang] || current['fr'] || key
}
