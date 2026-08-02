# Changelog Spinz

## [1.1.0] 2026-08-03

### Ajoute
- Bouton Infos dans l'en-tete, ouvrant une modale avec la stack, les graphismes, la musique,
  les interactions, l'architecture et les algorithmes notables (vitesse de lancer deduite de
  l'historique de mouvement, friction exponentielle normalisee au temps ecoule). Etape 15 du
  chantier de retrofit decrit dans `todo.md` racine du monorepo.

### Verifie
- Build propre, modale testee a l'ouverture/fermeture, aucune erreur console, aucun 404
  (favicon hashe recopie avec le nouveau `index.html`, son nom de fichier avait change
  depuis le dernier build deploye), aucun debordement horizontal en 390x844.

## [1.0.0] — 2026-07-24
### Ajoute
- Version initiale du jeu Spinz
- 5 designs de spinner (Tri, Hexa, Quad, Barbell, Turbine)
- Physique de rotation avec drag & flick
- Frottement réglable
- Compteurs RPM et rotations
- Interface responsive
- SEO complet
