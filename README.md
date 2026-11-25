# Spinz

**Simulateur de fidget spinner physique en 2D.**

Joue sur : [games.hylst.fr/spinz/](https://games.hylst.fr/spinz/)

## Comment jouer
Glisse ton doigt sur le spinner pour le faire tourner, puis relâche. Plus le geste est rapide, plus il tourne vite !

## Controles
| Action | Souris | Tactile | Clavier |
|--------|--------|---------|---------|
| Lancer | Glisser + relâcher | Glisser + relâcher | Espace |
| Freiner | - | - | B |
| Changer design | Menu déroulant | Menu déroulant | - |
| Qualité roulement | Slider | Slider | - |

## Structure
```
spinz/
├── src/
│   ├── App.tsx — Composant principal (physique, drag, UI)
│   ├── spinnerDesigns.tsx — 5 designs SVG
│   ├── main.tsx — Point d'entrée
│   └── index.css — Styles Tailwind
├── index.html — Template HTML
├── package.json — Dépendances
├── vite.config.ts — Config Vite
└── tsconfig.json — Config TypeScript
```

## Development
```bash
npm run dev    # Serveur de développement
npm run build  # Build de production
```

## Crédits
- Créé par Geoffroy Streit (alias Hylst)
- Création assistée par IA

## Licence

Code : AGPL-3.0-or-later. Voir `LICENSE`.
