'use client'
// La création de cours pour une institution utilise le même
// formulaire que les instructeurs individuels.
// On redirige simplement vers le créateur de cours existant
// mais on passe le contexte "institution" via un paramètre.

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Spinner } from '@/components/ui'

export default function InstitutionNewCoursePage() {
  const router = useRouter()

  useEffect(() => {
    // Redirige vers le créateur de cours de l'instructor
    // avec un paramètre pour identifier le contexte institution
    router.replace('/dashboard/instructor/courses/new?context=institution')
  }, [router])

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center">
      <div className="text-center">
        <Spinner size="lg" />
        <p className="text-text3 text-sm mt-3">Chargement de l&apos;éditeur de cours...</p>
      </div>
    </div>
  )
}