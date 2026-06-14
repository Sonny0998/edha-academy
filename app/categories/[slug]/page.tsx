import { redirect } from 'next/navigation'

// Redirect English routes to French equivalent
export default async function CategoryRedirect({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  redirect(`/categorias/${slug}`)
}