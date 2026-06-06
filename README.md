# NanoOrbit — CubeSat Earth Observation System
**Phase 5 — Interfaces applicatives**

## Niveau déclaré
**Niveau 2 — Autonome**

## Stack technique
| Couche | Technologie |
|--------|------------|
| Backend | Python 3 · FastAPI · Uvicorn |
| Base de données | MySQL 8 (via Docker) |
| Frontend | HTML / CSS / JavaScript (Vanilla) |
| Globe 3D | Globe.gl + Three.js |
| Connecteur MySQL | PyMySQL |
| Déploiement | Docker Compose |

## Prérequis
- Docker Desktop (version récente)
- Git

## Installation & Lancement

```bash
git clone https://github.com/curlyray7/CubeSat.git
cd CubeSat

# Copier les variables d'environnement
cp .env.example .env
# Éditer .env si nécessaire (par défaut : root / password)

# Démarrer la base de données et l'API (premier lancement : ~30 secondes)
docker compose up --build
```

L'application est accessible sur **http://localhost:8000**

> **Note :** Au premier `docker compose up`, MySQL initialise la base automatiquement
> via les scripts du dossier `sql-init/` (schéma → données → droits → vues).
> Attendre que le log affiche `Uvicorn running on http://0.0.0.0:8000` avant d'ouvrir le navigateur.

## Comptes de test

| Identifiant | Mot de passe | Rôle | Accès |
|-------------|-------------|------|-------|
| `analyste_data` | `Test1234!` | Analyste | Front-office uniquement |
| `operateur_sat` | `Test1234!` | Opérateur | Front-office + statut satellites + fenêtres comm. |
| `resp_mission`  | `Test1234!` | Responsable | Front-office + assignation missions |
| `admin_nano`    | `Test1234!` | Admin | Toutes les actions |

## Fonctionnalités

### Front-office — Consultation (tous profils)
| Écran | Source BDD | Description |
|-------|-----------|-------------|
| **Satellites** | `VUE_SATELLITES_OPERATIONNELS` | Tableau des satellites opérationnels avec indicateur format (1U/3U/6U/12U) |
| **Communications** | `VUE_BILAN_COMMUNICATIONS` | Bilan par satellite — volume, fenêtres, stations, satellite le plus actif mis en évidence |
| **Missions** | `VUE_TABLEAU_DE_BORD_MISSIONS` | Missions actives avec signalement visuel des missions sous-dotées |
| **Alertes** | `VUE_ALERTES_INSTRUMENTS` | Instruments en anomalie — code couleur CRITIQUE (rouge) / SURVEILLANCE (orange) |
| **Globe 3D** | `/api/globe-data` | Carte interactive avec satellites en orbite animés et stations au sol |

### Back-office — Administration (selon profil)
| Action | Profils autorisés | Description |
|--------|------------------|-------------|
| **Modifier statut satellite** | `operateur_sat`, `admin_nano` | Opérationnel / En veille / Défaillant / Désorbité |
| **Planifier fenêtre de communication** | `operateur_sat`, `admin_nano` | Formulaire avec contrainte durée 1–900 s |
| **Assigner satellite à une mission** | `resp_mission`, `admin_nano` | Vérification doublon et mission non terminée |
| **Désorbiter un satellite** | `admin_nano` uniquement | Action destructive avec confirmation modale |

> Toutes les données se mettent à jour **en temps réel** après chaque action (tableaux,
> listes déroulantes, panneau globe) — sans rechargement de page.

## Structure du projet

```
CubeSat/
├── backend/
│   └── main.py              # API FastAPI — tous les endpoints
├── frontend/
│   ├── index.html           # SPA unique (login + app)
│   ├── css/
│   │   ├── base.css         # Variables, reset, typographie
│   │   ├── login.css        # Page de connexion
│   │   ├── layout.css       # Navbar, écrans, structure
│   │   ├── components.css   # Tableaux, cartes, badges, modales
│   │   └── globe.css        # Globe 3D et panneau latéral
│   └── js/
│       ├── utils.js         # Helpers DOM partagés
│       ├── auth.js          # Login / logout / session
│       ├── nav.js           # Navigation entre écrans, init post-login
│       ├── globe.js         # Globe interactif + sidebar + refreshGlobe()
│       ├── front-office.js  # FO-01 à FO-04
│       └── back-office.js   # BO-01 à BO-04 + refreshAfterAction()
├── sql-init/
│   ├── 01-init.sql          # Schéma nanoOrbit_db (tables + contraintes)
│   ├── 02-insert.sql        # Données de test
│   ├── 03-grant.sql         # Droits par profil (Phase 4)
│   └── 04-vues.sql          # 4 vues Phase 3 (FO-01 à FO-04)
├── Dockerfile
├── docker-compose.yml
├── requirements.txt         # fastapi · uvicorn · pymysql · cryptography
├── .env.example
└── .gitignore
```

## Variables d'environnement

| Variable | Valeur par défaut | Description |
|----------|------------------|-------------|
| `DB_HOST` | `CubeSat-db` | Nom du service MySQL dans Docker |
| `DB_USER` | `root` | Utilisateur MySQL |
| `DB_PASSWORD` | `password` | Mot de passe MySQL |
| `DB_NAME` | `nanoOrbit_db` | Nom de la base de données |

Voir `.env.example` pour le fichier modèle (sans valeurs réelles).

## Endpoints API

| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/api/status` | Health check — vérifie la connexion BDD |
| GET | `/api/satellites` | FO-01 — satellites opérationnels |
| GET | `/api/satellites/all` | Tous les satellites (pour les `<select>` BO) |
| GET | `/api/communications` | FO-02 — bilan communications |
| GET | `/api/missions` | FO-03 — tableau de bord missions |
| GET | `/api/missions/actives` | Missions non terminées (pour les `<select>` BO) |
| GET | `/api/alertes` | FO-04 — alertes instruments |
| GET | `/api/stations` | Stations au sol actives |
| GET | `/api/globe-data` | Satellites + stations pour le globe 3D |
| POST | `/api/satellites/{ref}/statut` | BO-01 — modifier le statut |
| POST | `/api/fenetres` | BO-02 — planifier une fenêtre |
| POST | `/api/participations` | BO-03 — assigner à une mission |
| POST | `/api/satellites/{ref}/desorbiter` | BO-04 — désorbiter |

## Arrêter l'application

```bash
docker compose down          # Arrête les conteneurs (données conservées)
docker compose down -v       # Arrête et supprime le volume MySQL (reset complet)
```
