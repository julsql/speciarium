# Speciarium

> Plateforme web de catalogage et d'exploration de la biodiversité — gérez vos observations d'espèces, vos photos et vos collections, le tout sur une carte interactive.

[![Django](https://img.shields.io/badge/Django-6.0-092E20?logo=django)](https://www.djangoproject.com/)
[![Python](https://img.shields.io/badge/Python-3.13-3776AB?logo=python&logoColor=white)](https://www.python.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Docker](https://img.shields.io/badge/Docker-ready-2496ED?logo=docker&logoColor=white)](https://www.docker.com/)

---

## ✨ Fonctionnalités

- 🌿 **Catalogue d'espèces** — taxonomie complète (règne, classe, ordre, famille, genre, espèce) synchronisée avec [GBIF](https://www.gbif.org/).
- 🗺️ **Carte interactive** — visualisez vos observations géolocalisées avec différents fonds cartographiques.
- 📸 **Galerie photo** — upload massif d'images (jusqu'à 1000 fichiers, 200 Mo) avec extraction automatique des métadonnées.
- 👥 **Collections collaboratives** — partagez vos observations avec d'autres utilisateurs.
- 🔍 **Recherche avancée** — filtres dynamiques par taxon, date, localisation, etc.
- 🔔 **Notifications temps réel** — via WebSockets (Django Channels + Redis).
- 🧬 **Arbres phylogénétiques** — génération via [ete3](http://etetoolkit.org/).
- 📊 **Rétrospective annuelle** — statistiques personnalisées de vos observations.
- 🎨 **Thèmes personnalisables** — adaptez l'interface à vos préférences.
- 🌐 **Internationalisation** — interface en français.

---

## 🛠️ Stack technique

| Couche | Technologie |
| --- | --- |
| Backend | Django 6.0, Django Channels, Daphne (ASGI) |
| Base de données | PostgreSQL 15 |
| Cache / Pub-Sub | Redis |
| Frontend | Templates Django, django-tables2 |
| Données scientifiques | pygbif, ete3, matplotlib |
| Conteneurisation | Docker, Docker Compose |

---

## 🚀 Démarrage rapide

### Prérequis

- [Docker](https://www.docker.com/) et [Docker Compose](https://docs.docker.com/compose/)
- Un fichier `.env` à la racine (voir [Configuration](#configuration))

### Lancement

```bash
# 1. Cloner le repo
git clone <repo-url>
cd speciarium

# 2. Configurer les variables d'environnement
cp .env.example .env  # puis éditer

# 3. Démarrer la stack complète (Django + PostgreSQL + Redis)
docker-compose up -d

# 4. L'app est disponible sur http://localhost:8003
```

### Mode développement local

`docker-compose-local.yml` ne lance que Django ; Postgres et Redis doivent
tourner sur l'hôte (ou être ajoutés au compose) pour que l'app démarre.

---

## Configuration

Toutes les variables d'environnement requises sont listées dans
[`.env.example`](./.env.example) — `cp .env.example .env` puis éditer
suffit pour démarrer.

---

## 📦 Migration / setup initial

Avant le premier démarrage en production, copier :

1. La base de données (`src/database/`)
2. Les médias (`src/media/`)
3. Les données ete3 (`etetoolkit/`)

Puis mettre à jour la taxonomie :

```bash
docker exec -it speciarium python3 manage.py update_species_taxonomy
```

---

## 📁 Structure du projet

```
speciarium/
├── src/
│   ├── config/              # Settings, URLs, ASGI
│   ├── main/
│   │   ├── core/
│   │   │   ├── backend/     # Logique métier (upload, hash, load_data)
│   │   │   └── frontend/    # Vues + templates par feature
│   │   ├── models/          # Species, Photo, Collection, User…
│   │   ├── management/      # Commandes Django custom
│   │   └── migrations/
│   └── manage.py
├── docker-compose.yml       # Stack production
├── docker-compose-local.yml # Stack dev
├── Dockerfile
└── requirements.txt
```

---

## 🌍 Production

L'application est déployée sur [speciarium.julsql.fr](https://speciarium.julsql.fr).

---

## 📝 Licence

Projet personnel — © JulSql
