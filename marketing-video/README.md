# Vidéo marketing Telecom Stock

Projet Remotion (indépendant de l'app Next.js) générant une vidéo hero de ~25s (16:9, 1920x1080) présentant le produit.

## Utilisation

```bash
cd marketing-video
npm install

# Aperçu interactif (studio Remotion, hot-reload)
npm start

# Rendu final en MP4
npm run build
# -> out/hero-video.mp4

# Image fixe d'une frame précise (pour prévisualiser rapidement)
npx remotion still src/index.ts HeroVideo out/still.png --frame=160
```

## Structure

- `src/HeroVideo.tsx` — assemble les 5 séquences (logo, accroche, 2 fonctionnalités, appel à l'action)
- `src/scenes/` — chaque scène + les mockups d'interface (scanner, alerte de stock)
- `src/theme.ts` — couleurs de marque et police (Inter, chargée via `@remotion/google-fonts`)

## Modifier le contenu

Les textes, durées et couleurs sont dans `src/HeroVideo.tsx` et `src/scenes/*.tsx`. Les durées de chaque séquence sont exprimées en frames à 30fps (ex: 150 frames = 5s), définies en haut de `HeroVideo.tsx`.
