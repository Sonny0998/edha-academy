import Link from 'next/link'
import Navbar from '@/components/Navbar'
export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-bg">
      <Navbar />
      <div className="max-w-3xl mx-auto px-4 py-24">
        <h1 className="text-3xl font-bold text-text mb-2">Politique de confidentialité</h1>
        <p className="text-text3 mb-8">Dernière mise à jour : janvier 2025</p>
        {[
          { title: '1. Données collectées', content: 'EDHA Academy collecte uniquement les données nécessaires à votre apprentissage : nom, email, progression dans les cours. Nous ne vendons jamais vos données à des tiers.' },
          { title: '2. Utilisation des données', content: 'Vos données sont utilisées pour personnaliser votre expérience d\'apprentissage, émettre vos certificats et améliorer la plateforme.' },
          { title: '3. Conservation des données', content: 'Vos données sont conservées pendant toute la durée de votre inscription sur EDHA Academy. Vous pouvez demander leur suppression à tout moment.' },
          { title: '4. Sécurité', content: 'Nous utilisons Supabase avec chiffrement SSL/TLS pour protéger vos données. Les mots de passe sont hashés et jamais stockés en clair.' },
          { title: '5. Vos droits', content: 'Vous avez le droit d\'accéder, modifier ou supprimer vos données. Contactez-nous à contact@edhaacademy.ht.' },
          { title: '6. Cookies', content: 'EDHA Academy utilise des cookies de session uniquement pour maintenir votre connexion. Aucun cookie publicitaire.' },
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
