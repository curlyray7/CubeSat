from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import pymysql
import os
from starlette.middleware.cors import CORSMiddleware

app = FastAPI()

# <-- À AJOUTER : Autorise ton JS local à interroger l'API Docker
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Permet à n'importe quelle adresse (dont WebStorm) de se connecter
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 1. ROUTE DE TEST POUR LA BASE DE DONNÉES
@app.get("/api/status")
def check_db_status():
    # On récupère l'adresse de la BDD configurée dans le docker-compose
    db_url = os.getenv("DATABASE_URL", "mysql://root:password@cubesat-db:3306/cubesat_db")

    try:
        # Tentative de connexion à MySQL
        connection = pymysql.connect(
            host="cubesat-db",
            user="root",
            password="password",
            database="cubesat_db"
        )
        connection.close()
        return {"status": "success", "message": "FastAPI est connecté à la base de données MySQL !"}
    except Exception as e:
        return {"status": "error", "message": f"Échec de connexion à la BDD : {str(e)}"}

# 2. SERVIR LE FRONT-END VANILLA
# On dit à FastAPI que le dossier "frontend" contient tes fichiers HTML/CSS/JS
app.mount("/static", StaticFiles(directory="frontend"), name="frontend")

# Route principale : quand on va sur http://localhost:8000, on affiche ton index.html
@app.get("/")
def read_index():
    return FileResponse("frontend/index.html")