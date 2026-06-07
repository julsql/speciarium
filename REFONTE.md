# Speciarium — refonte React + Quarkus

Branche : `feat/refonte-react-quarkus`

## Architecture

```
speciarium/
├── backend/        Quarkus 3 (Java 21) — REST + WebSocket + upload
├── frontend/      React 18 + Vite + TS — design « Cabinet »
├── src/           ⚠️ Ancien stack Django (à supprimer après cutover)
└── docker-compose.yml
```

- **Base de données** : Postgres 15, schéma Django préservé (mode JPA `validate`).
  Les nouvelles entités JPA dans `backend/src/main/java/fr/speciarium/model/`
  pointent sur les tables `main_*` existantes.
- **Hash de mot de passe** : `pbkdf2_sha256$<iter>$<salt>$<hash>` — compatible
  avec les comptes Django existants (`DjangoPasswordHasher`).
- **Sessions** : cookie HttpOnly + token côté Redis (`SessionStore`).
- **Médias** : volume partagé `src/media/` ; `MediaResource` sert `/media/**`
  avec sandbox sur le chemin racine.
- **WebSocket progress** : `/ws/progress` (port unique 8000), broadcast simple.

## Backend (Quarkus)

| Endpoint | Description |
|---|---|
| `POST /api/auth/login` | login user/password |
| `POST /api/auth/demo` | session sur le compte démo |
| `POST /api/auth/signup` | inscription + collection initiale |
| `POST /api/auth/logout` | invalide le token Redis |
| `GET /api/auth/me` | utilisateur courant |
| `GET /api/species` | liste paginée + filtres + tri |
| `GET /api/species/{id}/photos` | photos d'une espèce dans la collection courante |
| `GET /api/photos` | mur de photos paginé + filtres |
| `GET /api/photos/hash` | clés `<path>:<hash>` (parité avec `get_hash`) |
| `GET /api/collections` | collections accessibles |
| `POST /api/collections` | créer |
| `POST /api/collections/{id}/select` | définir la collection courante |
| `GET /api/filter-options?field=` | options filtrées (port de `get_filtered_options`) |
| `POST /api/upload-images/{collectionId}` | multipart : `images[]`, `metadata`, `imageToDelete`, `upload_id` |
| `GET /media/{path}` | fichiers médias |
| `WS  /ws/progress` | progression de l'upload |

### Upload — logique préservée

Le pipeline `UploadService.treatOne` reproduit `treatment_image` Python :

1. Hash SHA-256 (fallback sur valeur transmise depuis le client)
2. `PhotoMetadataExtractor.extractLocation` : pays/région/continent depuis le chemin
3. `PhotoMetadataExtractor.extractLatin` : `Genre espèce (détails) id` → latin + détails
4. EXIF date + GPS (via `metadata-extractor`)
5. Redimensionnement vignette 300px + small 1000px (`Thumbnailator`)
6. Si espèce inconnue → `TaxonomyService.lookup` interroge GBIF (`/species/suggest`)
   puis iNaturalist (`/taxa?locale=fr`) pour le nom vernaculaire
7. Persistance Species + Photo, lien `UploadAction`
8. Broadcast WS `{ "progress": <index+1> }`

Logique de suppression et `reassign_rename_origins` portée à l'identique.
La taxonomie via `ete3` (NCBI Taxonomy, Python-only) n'est pas portée — seul
GBIF est interrogé. Si le besoin se fait sentir, encapsuler `ete3` dans un
micro-service Python séparé invoqué via REST.

## Frontend (React)

- `Vite + React 18 + TypeScript + react-router 6`
- Design tokens dans `src/design/tokens.ts` (paper/ink/oklch + textures SVG)
- Polices Google : EB Garamond, Cormorant Garamond, Italianno, JetBrains Mono
- Composants partagés :
  - `Paper`, `DoubleFrame`, `Divider`, `CornerFlourish`, `Logo`, `Engraving`
  - `ChipBtn`, `InkButton`, `IconBtn`, `CatalogTag`, `Latin`
  - `PhotoThumb` (vraie image, cadre vintage + overlay catalogue) + `PhotoGrid` adaptatif
  - `Lightbox` (raccourcis clavier ←/→/Esc, thumbs strip, `MiniLocator`)
  - `MiniLocator` (mini-globe orthographique SVG centré sur les coordonnées)
- Pages :
  - `/login`, `/signup`
  - `/especes` — table + sidebar filtres + panneau droit (photos + bouton Carte)
  - `/photos` — mur groupé (Année/Espèce/Lieu), 3 tailles, lightbox
  - `/carte` — fond parchemin sépia + pins de cluster + callout + rose des vents
  - `/profil` — bannière + stats (4 cartes), collections, répartition par classe

### Persistance des préférences de vue

`localStorage` key `speciarium:visibleColumns:v1` — à terme, migrer dans le
profil serveur (champ JSON sur `AppUser`).

## Lancement local (dev)

```bash
# 1. Postgres + Redis
docker compose up postgres redis

# 2. Backend
cd backend && ./mvnw quarkus:dev

# 3. Frontend
cd frontend && npm install && npm run dev
# → http://localhost:5173 (proxy /api, /media, /ws vers :8000)
```

## Lancement production

```bash
docker compose up -d --build
# → http://localhost:8003 (nginx sert le build React + proxy l'API)
```

## Reste à faire

- Notifications temps réel (sessions Django Channels → broadcast d'événements
  via Redis pub/sub vers WebSocket Quarkus).
- Rétrospective annuelle (`get_year_retrospective` Django) à porter.
- Phylogénie (`ete3`) : décision séparée (micro-service Python ou bibliothèque
  Java équivalente — à valider produit).
- Reset password : email transactionnel (Quarkus Mailer).
- Tests d'intégration sur l'upload (REST Assured + DB éphémère).
- Suppression du dossier `src/` Django une fois la bascule validée.
