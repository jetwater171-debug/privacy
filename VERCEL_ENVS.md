# Vercel environment variables

Configure these in Vercel for Production, Preview, and Development:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_STORAGE_BUCKET=privacy-assets
ADMIN_SESSION_SECRET=generate-a-long-random-secret
```

Run `supabase.sql` once in Supabase SQL Editor before deploying.

The app falls back to `data/site.json` only for local testing when Supabase envs are absent.
