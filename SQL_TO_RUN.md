# SQL à exécuter dans Supabase

## Comment faire ?
1. Allez sur votre projet Supabase → SQL Editor
2. Copiez-collez le contenu de chaque fichier SQL
3. Cliquez sur "Run"

## Ordre d'exécution

### Étape 1 — Schema principal (si première installation)
```
edha_coursera_schema.sql
```

### Étape 2 — Additions (toujours sécurisé à exécuter)
```
edha_coursera_schema_additions.sql
```
Contient (avec IF NOT EXISTS — sans risque):
- Colonnes de calendrier sur `lessons` (opens_at, closes_at, due_at...)
- Tables: `assignments`, `assignment_submissions`
- Tables: `lesson_qa`, `announcements`
- Tables: `badges`, `user_badges`
- Tables: `email_logs`, `audit_logs`
- Colonnes de gamification sur `profiles` (xp_points, streak_days...)
- Vue: `student_calendar`

### Étape 3 — Activer Google OAuth (Supabase Dashboard)
1. Authentication → Providers → Google → Enable
2. Ajouter votre Client ID et Secret depuis console.cloud.google.com
3. Ajouter l'URL de callback: `https://VOTRE-PROJET.supabase.co/auth/v1/callback`

### Étape 4 — Créer bucket de storage
1. Storage → New bucket → Nom: `course-resources` → Public: OUI
2. Storage → `course-resources` → Policies → Add policy → "All users can upload"
   ```sql
   -- Permettre upload aux utilisateurs authentifiés
   (auth.role() = 'authenticated')
   ```

### Étape 5 — Activer Email Confirmations (optionnel mais recommandé)
Authentication → Email → Enable email confirmations

## Créer un compte Admin
Après vous être inscrit avec votre email:
```sql
UPDATE public.profiles 
SET role = 'admin' 
WHERE email = 'VOTRE-EMAIL@exemple.com';
```


## Tablas añadidas en las últimas sesiones

```sql
-- Las siguientes tablas se añaden automáticamente al correr
-- edha_coursera_schema_additions.sql:
-- - email_logs (historial de emails enviados)
-- - audit_logs (log de acciones del admin)
-- - platform_settings (configuración de la plataforma)
-- - badges / user_badges (gamificación)
-- - lesson_qa (preguntas y respuestas)
-- - announcements (anuncios del instructor)
-- - assignments / assignment_submissions (tareas)
-- - lesson_notes (notas del estudiante)
-- Funciones SQL: increment_enrolled_count, recalculate_course_rating
-- Índices: courses title search, enrollments, lesson_progress
```
