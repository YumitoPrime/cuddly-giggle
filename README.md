# Stop Before The Word (privé léger)

Mini-jeu vidéo : arrête la vidéo **avant** la limite (affichée aux joueurs comme une **plage**).

- Mot de passe **en clair** (simple) dans `src/App.jsx` → `const PASSWORD = "secret"`.
- Ajout de **vidéos custom** illimité en **mode admin** (`?admin=1`).
- **Export/Import JSON** de la config.
- **Classement local** par vidéo (localStorage).

## Démarrer

```bash
npm install
npm run dev
```

## Déployer sur GitHub Pages

1. Dans `vite.config.js`, remplacez `YOUR_REPO_NAME` par le nom de votre dépôt.
2. Puis :
```bash
npm run build
npm run deploy
```
Le site sera publié sur la branche `gh-pages`.

## Important
- Mot de passe en clair = sécurité légère (entre amis). Ne mettez rien de sensible.
- Pour vrai contrôle d'accès, utiliser Cloudflare Pages + Access ou Netlify password.
