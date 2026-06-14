import { Suspense } from 'react'
import CoursesContent from './CoursesContent'
import { Spinner } from '@/components/ui'

export default function CoursesPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    }>
      <CoursesContent />
    </Suspense>
  )
}
