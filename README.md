# Chat App — Next.js + Supabase + Vercel

Application de chat en temps réel avec emojis, stickers et partage de fichiers.

## Stack
- **Next.js 14** — Framework React
- **TypeScript** — Typage statique  
- **Supabase** — Base de données + Realtime + Storage
- **Vercel** — Déploiement

## Lancer en local

```bash
npm install
npm run dev
```

Ouvre http://localhost:3000

## Déployer sur Vercel

1. Push ce projet sur GitHub
2. Va sur vercel.com → "New Project" → importe le repo
3. Ajoute les variables d'environnement :
   - NEXT_PUBLIC_SUPABASE_URL
   - NEXT_PUBLIC_SUPABASE_ANON_KEY
4. Clique Deploy → ton lien public est prêt ! 🚀
