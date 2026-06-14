/**
 * EDHA Academy — Centralised navigation items
 * Import the correct navItems for each role instead of copy-pasting.
 * FIX: Previously each page had its own copy → menus were inconsistent.
 */
import {
  LayoutDashboard, BookOpen, Award, Heart, User, Calendar,
  ClipboardList, FileText, BarChart2, MessageSquare, Megaphone,
  Users, GraduationCap, UserCheck, Globe, Settings, Layers,
  Shield, Tag, Activity, Ticket, CreditCard
} from 'lucide-react'

export const studentNav = [
  { label: 'Tableau de bord',   href: '/dashboard/student',              icon: <LayoutDashboard size={16} /> },
  { label: 'Mes cours',         href: '/dashboard/student/courses',       icon: <BookOpen size={16} /> },
  { label: 'Devoirs',           href: '/dashboard/student/assignments',   icon: <ClipboardList size={16} /> },
  { label: 'Calendrier',        href: '/dashboard/student/calendar',      icon: <Calendar size={16} /> },
  { label: 'Mon horaire',       href: '/dashboard/student/schedule',      icon: <Calendar size={16} /> },
  { label: 'Bulletins',         href: '/dashboard/student/bulletins',     icon: <FileText size={16} /> },
  { label: 'Certificats',       href: '/dashboard/student/certificates',  icon: <Award size={16} /> },
  { label: 'Liste de souhaits', href: '/dashboard/student/wishlist',      icon: <Heart size={16} /> },
  { label: 'Mon profil',        href: '/dashboard/student/profile',       icon: <User size={16} /> },
]

export const instructorNav = [
  { label: 'Tableau de bord', href: '/dashboard/instructor',             icon: <LayoutDashboard size={16} /> },
  { label: 'Mes cours',       href: '/dashboard/instructor/courses',      icon: <BookOpen size={16} /> },
  { label: 'Messages Q&A',    href: '/dashboard/instructor/messages',     icon: <MessageSquare size={16} /> },
  { label: 'Annonces',        href: '/dashboard/instructor/announcements',icon: <Megaphone size={16} /> },
  { label: 'Analytiques',     href: '/dashboard/instructor/analytics',   icon: <BarChart2 size={16} /> },
  { label: 'Mon profil',      href: '/dashboard/instructor/profile',      icon: <User size={16} /> },
]

export const institutionNav = [
  { label: 'Vue d\'ensemble',  href: '/dashboard/institution',                  icon: <LayoutDashboard size={16} /> },
  { label: 'Programmes',       href: '/dashboard/institution/programs',          icon: <Layers size={16} /> },
  { label: 'Cours',            href: '/dashboard/institution/courses',           icon: <BookOpen size={16} /> },
  { label: 'Mode académique',  href: '/dashboard/institution/academic',          icon: <GraduationCap size={16} /> },
  { label: 'Équipe',           href: '/dashboard/institution/teachers',          icon: <UserCheck size={16} /> },
  { label: 'Étudiants',        href: '/dashboard/institution/students',          icon: <Users size={16} /> },
  { label: 'Analytiques',      href: '/dashboard/institution/analytics',         icon: <BarChart2 size={16} /> },
  { label: 'Page publique',    href: '/dashboard/institution/profile',           icon: <Globe size={16} /> },
  { label: 'Paramètres',       href: '/dashboard/institution/settings',          icon: <Settings size={16} /> },
]

export const adminNav = [
  { label: 'Tableau de bord', href: '/dashboard/admin',           icon: <LayoutDashboard size={16} /> },
  { label: 'Utilisateurs',    href: '/dashboard/admin/users',      icon: <Users size={16} /> },
  { label: 'Cours',           href: '/dashboard/admin/courses',    icon: <BookOpen size={16} /> },
  { label: 'Catégories',      href: '/dashboard/admin/categories', icon: <Tag size={16} /> },
  { label: 'Activité',        href: '/dashboard/admin/activity',   icon: <Activity size={16} /> },
  { label: 'Coupons',         href: '/dashboard/admin/coupons',    icon: <Ticket size={16} /> },
  { label: 'Rapports',        href: '/dashboard/admin/reports',    icon: <BarChart2 size={16} /> },
  { label: 'Paiements',       href: '/dashboard/admin/payments',   icon: <CreditCard size={16} /> },
  { label: 'Paramètres',      href: '/dashboard/admin/settings',   icon: <Settings size={16} /> },
]
