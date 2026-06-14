// ═══════════════════════════════════════════════════
// STUDENT SCHEDULE PAGE
// app/dashboard/student/schedule/page.tsx
// ═══════════════════════════════════════════════════
'use client'
import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { studentNav } from '@/lib/nav'
import { createBrowserClient } from '@/lib/supabase/browser'
import DashboardLayout from '@/components/dashboard/DashboardLayout'
import { Card, Spinner } from '@/components/ui'
import {
  LayoutDashboard, BookOpen, Award, User, Calendar,
  ClipboardList, MapPin, Video, Monitor
} from 'lucide-react'
import clsx from 'clsx'

const navItems = [
  { label: 'Tableau de bord', href: '/dashboard/student',              icon: <LayoutDashboard size={16} /> },
  { label: 'Mes cours',       href: '/dashboard/student/courses',      icon: <BookOpen size={16} /> },
  { label: 'Devoirs',         href: '/dashboard/student/assignments',  icon: <ClipboardList size={16} /> },
  { label: 'Mon horaire',     href: '/dashboard/student/schedule',     icon: <Calendar size={16} /> },
  { label: 'Certificats',     href: '/dashboard/student/certificates', icon: <Award size={16} /> },
  { label: 'Mon profil',      href: '/dashboard/student/profile',      icon: <User size={16} /> },
]

const DAYS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi']
const HOURS = Array.from({ length: 13 }, (_, i) => i + 7)

const LOCATION_ICONS: Record<string, any> = {
  classroom: MapPin, online: Video, hybrid: Monitor, lab: MapPin,
}

export default function StudentSchedulePage() {
  const { profile } = useAuth()
  const supabase = createBrowserClient()
  const [schedule, setSchedule] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [sectionName, setSectionName] = useState('')

  useEffect(() => {
    if (!profile) return
    const load = async () => {
      const { data: enroll } = await supabase
        .from('institutional_enrollments')
        .select('institution_id, class_section_id, section:class_sections!class_section_id(name, level:class_levels(name))')
        .eq('student_id', profile.id).eq('status', 'active').maybeSingle()

      if (!enroll) { setLoading(false); return }
      const section = enroll.section as any
      setSectionName(section
        ? `${section.level?.name} — Section ${section.name}` : '')

      const { data: slots } = await supabase
        .from('class_schedule')
        .select('*, period_subject:period_subjects!period_subject_id(subject:academic_subjects(name, color, code), teacher:profiles!teacher_id(full_name))')
        .eq('institution_id', enroll.institution_id)
        .eq('is_cancelled', false)
        .or(`class_section_id.eq.${enroll.class_section_id},class_section_id.is.null`)
        .order('day_of_week').order('start_time')

      setSchedule(slots || [])
      setLoading(false)
    }
    load()
  }, [profile])

  const grid: Record<number, any[]> = {}
  for (let d = 0; d < 6; d++) grid[d] = []
  for (const slot of schedule) grid[slot.day_of_week]?.push(slot)

  const timeToTop = (t: string) => {
    const [h, m] = t.split(':').map(Number)
    return ((h - 7) * 60 + m) / 60 * 60
  }
  const dur = (s: string, e: string) => {
    const [sh, sm] = s.split(':').map(Number)
    const [eh, em] = e.split(':').map(Number)
    return ((eh * 60 + em) - (sh * 60 + sm)) / 60 * 60
  }

  // Today's classes
  const todayDay = (new Date().getDay() + 6) % 7
  const todayClasses = grid[todayDay] || []

  if (loading) return (
    <DashboardLayout navItems={studentNav} title="Mon horaire" role="student">
      <div className="flex justify-center py-16"><Spinner size="lg" /></div>
    </DashboardLayout>
  )

  return (
    <DashboardLayout navItems={studentNav} title="Mon horaire" role="student">
      <div className="max-w-5xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-text">Mon emploi du temps</h1>
          {sectionName && <p className="text-text3 text-sm mt-0.5">{sectionName}</p>}
        </div>

        {/* Today's classes */}
        {todayClasses.length > 0 && (
          <div>
            <h2 className="font-semibold text-text mb-3 text-sm">
              Aujourd&apos;hui — {DAYS[todayDay]}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {todayClasses.map(slot => {
                const LocIcon = LOCATION_ICONS[slot.location_type] || MapPin
                return (
                  <Card key={slot.id} className="p-4 border-l-4"
                    style={{ borderLeftColor: slot.period_subject?.subject?.color || '#4f6ef7' }}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-text" style={{ color: slot.period_subject?.subject?.color }}>
                          {slot.period_subject?.subject?.name}
                        </p>
                        <p className="text-xs text-text3 mt-0.5">
                          {slot.start_time?.slice(0, 5)} – {slot.end_time?.slice(0, 5)}
                        </p>
                        {slot.period_subject?.teacher?.full_name && (
                          <p className="text-xs text-text3">Prof. {slot.period_subject.teacher.full_name}</p>
                        )}
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="flex items-center gap-1 text-xs text-text3">
                          <LocIcon size={11} />
                          <span>{slot.room || (slot.location_type === 'online' ? 'En ligne' : 'Salle')}</span>
                        </div>
                        {slot.online_link && (
                          <a href={slot.online_link} target="_blank" rel="noopener noreferrer"
                            className="text-xs text-blue hover:underline mt-1 block">
                            Rejoindre →
                          </a>
                        )}
                      </div>
                    </div>
                  </Card>
                )
              })}
            </div>
          </div>
        )}

        {/* Weekly grid */}
        {schedule.length === 0 ? (
          <Card className="p-10 text-center">
            <Calendar size={28} className="text-text3 mx-auto mb-3" />
            <p className="text-sm text-text2">Aucun horaire disponible</p>
            <p className="text-xs text-text3 mt-1">L&apos;institution n&apos;a pas encore publié les horaires</p>
          </Card>
        ) : (
          <Card className="overflow-auto">
            <div className="min-w-[600px]">
              <div className="grid border-b border-border" style={{ gridTemplateColumns: '48px repeat(6, 1fr)' }}>
                <div className="p-2" />
                {DAYS.map((d, i) => (
                  <div key={d} className={clsx('p-2 text-center', i === todayDay && 'bg-blue/5')}>
                    <p className={clsx('text-xs font-semibold', i === todayDay ? 'text-blue' : 'text-text')}>{d}</p>
                  </div>
                ))}
              </div>
              <div className="relative grid" style={{ gridTemplateColumns: '48px repeat(6, 1fr)', height: `${13 * 60}px` }}>
                {HOURS.map(h => (
                  <div key={h} className="absolute left-0 right-0 border-t border-border/30"
                    style={{ top: (h - 7) * 60 }}>
                    <span className="absolute left-0 -top-2.5 text-[10px] text-text3 w-10 text-right pr-1">{h}h</span>
                  </div>
                ))}
                {DAYS.map((_, di) => (
                  <div key={di} className={clsx('relative border-l border-border/20', di === todayDay && 'bg-blue/5')}
                    style={{ gridColumn: di + 2 }}>
                    {grid[di].map(slot => {
                      const top = timeToTop(slot.start_time)
                      const height = dur(slot.start_time, slot.end_time)
                      return (
                        <div key={slot.id}
                          className="absolute left-0.5 right-0.5 rounded-lg p-1.5 overflow-hidden"
                          style={{
                            top: top + 1, height: Math.max(height - 2, 20),
                            backgroundColor: (slot.period_subject?.subject?.color || '#4f6ef7') + '20',
                            borderLeft: `3px solid ${slot.period_subject?.subject?.color || '#4f6ef7'}`,
                          }}>
                          <p className="text-[10px] font-semibold truncate"
                            style={{ color: slot.period_subject?.subject?.color || '#4f6ef7' }}>
                            {slot.period_subject?.subject?.code || slot.period_subject?.subject?.name?.slice(0, 6)}
                          </p>
                          {height > 35 && (
                            <p className="text-[9px] text-text3">{slot.start_time?.slice(0, 5)}</p>
                          )}
                          {height > 50 && slot.room && (
                            <p className="text-[9px] text-text3 truncate">{slot.room}</p>
                          )}
                        </div>
                      )
                    })}
                  </div>
                ))}
              </div>
            </div>
          </Card>
        )}
      </div>
    </DashboardLayout>
  )
}