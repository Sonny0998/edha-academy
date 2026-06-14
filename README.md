# EDHA Academy — Plateforme d'apprentissage en ligne pour Haïti

Stack: Next.js 15 · Supabase · TypeScript · Tailwind CSS

## 🚀 Installation rapide

```bash
# 1. Décompresser et installer
unzip edha_academy.zip && cd edha_complete
npm install

# 2. Configurer les variables d'environnement
cp .env.local.example .env.local
# Remplir NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, etc.

# 3. Exécuter le SQL dans Supabase (voir SQL_TO_RUN.md)

# 4. Lancer le serveur
npm run dev
```

## 📁 Structure
```
app/
  page.tsx                    → Landing page
  auth/login/                 → Connexion (+ Google OAuth)
  auth/inscription/           → Inscription étudiant
  auth/devenir-instructeur/   → Inscription instructeur/institution (4 étapes)
  auth/callback/              → OAuth callback
  pending/                    → Page attente approbation instructeur
  pending-confirmation/       → Confirmation après inscription instructeur
  dashboard/
    admin/                    → Administration complète
    instructor/               → Dashboard instructeur
    student/                  → Dashboard étudiant
  cursos/                     → Catalogue des cours
  learn/[slug]/               → Lecteur de cours
  privacy/                    → Politique de confidentialité
  terms/                      → CGU
  api/email/                  → API envoi d'emails (Resend)
```

## 🔐 Sécurité
- Les instructeurs sont bloqués jusqu'à approbation admin
- Email automatique envoyé après inscription (attente) + après approbation
- Google OAuth intégré
- RLS Supabase sur toutes les tables

## 📧 Emails (Resend)
Ajoutez `RESEND_API_KEY` dans `.env.local` pour activer les emails.
Sans cette clé, les emails sont loggués mais pas envoyés.

## 👤 Créer un compte Admin
```sql
UPDATE public.profiles SET role = 'admin' WHERE email = 'votre@email.com';
```

Voir `SQL_TO_RUN.md` pour le guide complet de configuration.
