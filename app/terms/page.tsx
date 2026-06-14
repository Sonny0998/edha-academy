import Link from 'next/link'
import Navbar from '@/components/Navbar'
export default function TermsPage() {
  return (
    <div className="min-h-screen bg-bg">
      <Navbar />
      <div className="max-w-3xl mx-auto px-4 py-24">
        <h1 className="text-3xl font-bold text-text mb-2">Conditions Générales d&apos;Utilisation</h1>
        <p className="text-text3 mb-8">Dernière mise à jour : janvier 2025</p>
        {[
          { title: '1. Acceptation des conditions', content: 'En utilisant EDHA Academy, vous acceptez ces conditions. Si vous n\'êtes pas d\'accord, veuillez ne pas utiliser notre plateforme.' },
          { title: '2. Inscription', content: 'Les informations fournies lors de l\'inscription doivent être exactes. Un seul compte par personne est autorisé. Les comptes instructeurs sont soumis à approbation.' },
          { title: '3. Propriété intellectuelle', content: 'Les cours publiés sur EDHA Academy restent la propriété de leurs auteurs. EDHA Academy dispose d\'une licence pour héberger et distribuer ces contenus.' },
          { title: '4. Règles de conduite', content: 'Il est interdit de partager des contenus illégaux, offensants ou trompeurs. Tout abus entraînera la suspension du compte.' },
          { title: '5. Certificats', content: 'Les certificats EDHA Academy attestent de la complétion d\'un cours. Ils ne remplacent pas des diplômes officiels reconnus par l\'État haïtien.' },
          { title: '6. Résiliation', content: 'Vous pouvez fermer votre compte à tout moment. EDHA Academy se réserve le droit de suspendre tout compte violant ces conditions.' },
          { title: '7. Limitation de responsabilité', content: 'EDHA Academy n\'est pas responsable des interruptions de service ou des pertes de données dues à des événements hors de notre contrôle.' },
        ].map(({ title, content }) => (
          <div key={title} className="mb-6">
            <h2 className="text-lg font-semibold text-text mb-2">{title}</h2>
            <p className="text-text2 leading-relaxed">{content}</p>
          </div>
        ))}
        <div className="mt-8 pt-6 border-t border-border">
          <p className="text-text3 text-sm">Contact : <a href="mailto:contact@edhaacademy.ht" className="text-blue hover:underline">contact@edhaacademy.ht</a></p>
          <Link href="/" className="text-blue hover:underline text-sm mt-2 inline-block">← Retour à l&apos;accueil</Link>
        </div>
      </div>
    </div>
  )
}
