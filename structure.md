# Structure du projet Spinz

```
physics-based-fidget-spinner-game-development/
├── index.html              # Template HTML (SEO, meta tags)
├── package.json            # spinz v1.0.0
├── vite.config.ts          # Config Vite (base: /spinz/, singlefile)
├── tsconfig.json           # Config TypeScript
├── favicon.png             # Favicon (32x32)
├── og-image.png            # Image OG (1024x576)
├── about.md                # A propos du jeu
├── README.md               # Documentation principale
├── structure.md            # Ce fichier
├── features.md             # Liste des fonctionnalites
├── todo.md                 # Todo list
├── changelog.md            # Historique des versions
├── .gitignore              # Fichiers ignores
└── src/
    ├── main.tsx            # Point d'entrée React
    ├── App.tsx             # Composant principal (physique, UI)
    ├── spinnerDesigns.tsx  # 5 designs SVG de spinners
    └── index.css           # Styles Tailwind CSS 4

Build de production (dist/ copie vers hylst.games/spinz/):
└── spinz/
    ├── index.html          # Build single-file (~228 KB)
    ├── favicon.png         # Favicon
    ├── og-image.png        # Image Open Graph
    └── favicon-*.png       # Asset inline
```
