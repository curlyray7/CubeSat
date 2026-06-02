# NanoOrbit — CubeSat Earth Observation System
**Phase 5 — Interfaces applicatives**

## Niveau déclaré
**Niveau 2 — Autonome**

## Prérequis
- Docker Desktop
- Git

## Installation & Lancement

```bash
git clone https://github.com/curlyray7/CubeSat.git
cd CubeSat

# Copier et remplir les variables d'environnement
cp .env.example .env

# Démarrer la base de données et l'API
docker compose up --build
```

L'application est accessible sur **http://localhost:8000**

## Comptes de test

| Identifiant | Mot de passe | Rôle |
|---|---|---|
| `analyste_data` | `Test1234!` | Analyste — front-office uniquement |
| `operateur_sat` | `Test1234!` | Opérateur — statut + fenêtres comm. |
| `resp_mission` | `Test1234!` | Responsable — assignation missions |
| `admin_nano` | `Test1234!` | Admin — toutes les actions |

## Structure du projet

```
CubeSat/
├── backend/
│   └── main.py          # API FastAPI
├── frontend/
│   ├── index.html
│   ├── css/             # base / login / layout / components / globe
│   └── js/              # utils / auth / nav / globe / front-office / back-office
├── sql-init/
│   ├── 01-init.sql      # Schéma nanoOrbit_db
│   └── 02-insert.sql    # Données de test
├── docker-compose.yml
└── Dockerfile
```

## Variables d'environnement

Voir `.env.example` pour la liste complète.
