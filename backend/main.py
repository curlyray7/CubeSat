"""
NanoOrbit — Backend FastAPI
Phase 5 · Interfaces applicatives
Schéma réel nanoOrbit_db
"""

from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional  # noqa: F401 — utilisé dans les Pydantic models
import pymysql
import pymysql.cursors
import os
from datetime import date, datetime

app = FastAPI(title="NanoOrbit API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── DB Connection ─────────────────────────────────────────────
def get_conn():
    return pymysql.connect(
        host=os.getenv("DB_HOST", "CubeSat-db"),
        user=os.getenv("DB_USER", "root"),
        password=os.getenv("DB_PASSWORD", "password"),
        database=os.getenv("DB_NAME", "nanoOrbit_db"),
        cursorclass=pymysql.cursors.DictCursor,
    )

def serialize(row: dict) -> dict:
    """Convertit les objets date/datetime en str pour JSON."""
    for k, v in row.items():
        if isinstance(v, (date, datetime)):
            row[k] = v.isoformat()
    return row

def try_view(conn, view_sql: str, fallback_sql: str) -> list:
    """Essaie d'exécuter une vue Phase 3, sinon utilise la requête de secours."""
    with conn.cursor() as cur:
        try:
            cur.execute(view_sql)
            return [serialize(r) for r in cur.fetchall()]
        except pymysql.err.ProgrammingError:
            cur.execute(fallback_sql)
            return [serialize(r) for r in cur.fetchall()]


# ── Static / Frontend ─────────────────────────────────────────
app.mount("/static", StaticFiles(directory="frontend"), name="static")

@app.get("/")
def read_index():
    return FileResponse("frontend/index.html")


# ══════════════════════════════════════════════════════════════
# FRONT-OFFICE — Lecture seule
# ══════════════════════════════════════════════════════════════

# FO-01 — Satellites opérationnels
@app.get("/api/satellites")
def get_satellites():
    try:
        conn = get_conn()
        rows = try_view(
            conn,
            "SELECT * FROM VUE_SATELLITES_OPERATIONNELS",
            """
            SELECT
                s.ref_satellite,
                s.nom_satellite,
                s.format_cubesat,
                s.date_lancement,
                s.statut,
                o.type_orbite,
                o.altitude,
                s.capacite_batterie
            FROM SATELLITE s
            JOIN ORBITE o ON s.fk_id_orbite = o.id_orbite
            WHERE s.statut = 'Opérationnel'
            ORDER BY s.nom_satellite
            """
        )
        conn.close()
        return {"status": "success", "data": rows}
    except Exception as e:
        return {"status": "error", "message": str(e)}


# Tous les satellites — pour les <select> du back-office
@app.get("/api/satellites/all")
def get_all_satellites():
    try:
        conn = get_conn()
        with conn.cursor() as cur:
            cur.execute("""
                SELECT ref_satellite, nom_satellite, statut
                FROM SATELLITE
                ORDER BY nom_satellite
            """)
            rows = [serialize(r) for r in cur.fetchall()]
        conn.close()
        return {"status": "success", "data": rows}
    except Exception as e:
        return {"status": "error", "message": str(e)}


# FO-02 — Bilan des communications
@app.get("/api/communications")
def get_communications():
    try:
        conn = get_conn()
        rows = try_view(
            conn,
            "SELECT * FROM VUE_BILAN_COMMUNICATIONS ORDER BY volume_total_mo DESC",
            """
            SELECT
                s.nom_satellite,
                COUNT(f.id_fenetre)                         AS nb_fenetres,
                COALESCE(SUM(f.volume_donnees), 0)          AS volume_total,
                COALESCE(AVG(f.volume_donnees), 0)          AS volume_moyen,
                MAX(f.datetime_debut)                       AS derniere_comm,
                COUNT(DISTINCT f.fk_code_station)           AS nb_stations
            FROM SATELLITE s
            LEFT JOIN FENETRE_COM f
                   ON f.fk_id_satellite = s.ref_satellite
                  AND f.statut = 'Réalisée'
            GROUP BY s.ref_satellite, s.nom_satellite
            ORDER BY volume_total DESC
            """
        )
        conn.close()
        return {"status": "success", "data": rows}
    except Exception as e:
        return {"status": "error", "message": str(e)}


# FO-03 — Tableau de bord missions
@app.get("/api/missions")
def get_missions():
    try:
        conn = get_conn()
        rows = try_view(
            conn,
            "SELECT * FROM VUE_TABLEAU_DE_BORD_MISSIONS",
            """
            SELECT
                m.id_mission,
                m.nom_mission,
                m.zone_geo_cible,
                m.date_debut,
                m.statut_mission,
                COUNT(p.id_satellite)                                           AS nb_participants,
                SUM(CASE WHEN s.statut = 'Opérationnel' THEN 1 ELSE 0 END)     AS nb_operationnels
            FROM MISSION m
            LEFT JOIN PARTICIPATION p  ON p.fk_id_mission  = m.id_mission
            LEFT JOIN SATELLITE s      ON s.ref_satellite   = p.fk_id_satellite
            WHERE m.statut_mission != 'Terminée'
            GROUP BY m.id_mission, m.nom_mission, m.zone_geo_cible, m.date_debut, m.statut_mission
            ORDER BY m.date_debut DESC
            """
        )
        conn.close()
        return {"status": "success", "data": rows}
    except Exception as e:
        return {"status": "error", "message": str(e)}


# Missions actives — pour <select> BO-03
@app.get("/api/missions/actives")
def get_missions_actives():
    try:
        conn = get_conn()
        with conn.cursor() as cur:
            cur.execute("""
                SELECT id_mission, nom_mission
                FROM MISSION
                WHERE statut_mission != 'Terminée'
                ORDER BY nom_mission
            """)
            rows = [serialize(r) for r in cur.fetchall()]
        conn.close()
        return {"status": "success", "data": rows}
    except Exception as e:
        return {"status": "error", "message": str(e)}


# FO-04 — Alertes instruments
@app.get("/api/alertes")
def get_alertes():
    try:
        conn = get_conn()
        rows = try_view(
            conn,
            "SELECT * FROM VUE_ALERTES_INSTRUMENTS ORDER BY priorite DESC",
            """
            SELECT
                i.ref_instrument,
                i.type_instrument,
                e.etat_fonctionnement,
                s.nom_satellite,
                CASE
                    WHEN e.etat_fonctionnement = 'HS'      THEN 'CRITIQUE'
                    WHEN e.etat_fonctionnement = 'Dégradé' THEN 'SURVEILLANCE'
                    ELSE 'OK'
                END AS priorite
            FROM EMBARQUEMENT e
            JOIN INSTRUMENT i  ON i.ref_instrument  = e.fk_ref_instrument
            JOIN SATELLITE  s  ON s.ref_satellite   = e.fk_id_satellite
            WHERE e.etat_fonctionnement IN ('HS', 'Dégradé')
            ORDER BY
                CASE e.etat_fonctionnement WHEN 'HS' THEN 0 ELSE 1 END,
                s.nom_satellite
            """
        )
        conn.close()
        return {"status": "success", "data": rows}
    except Exception as e:
        return {"status": "error", "message": str(e)}


# Stations au sol actives — pour <select> BO-02
@app.get("/api/stations")
def get_stations():
    try:
        conn = get_conn()
        with conn.cursor() as cur:
            # statut en minuscules dans la BDD : 'active'
            cur.execute("""
                SELECT code_station, nom_station, bande_frequence
                FROM STATION_SOL
                WHERE statut = 'active'
                ORDER BY nom_station
            """)
            rows = [serialize(r) for r in cur.fetchall()]
        conn.close()
        return {"status": "success", "data": rows}
    except Exception as e:
        return {"status": "error", "message": str(e)}


# ══════════════════════════════════════════════════════════════
# BACK-OFFICE — Écriture
# ══════════════════════════════════════════════════════════════

ROLE_PERMS = {
    "analyste":    [],
    "operateur":   ["bo-statut", "bo-fenetre"],
    "responsable": ["bo-mission"],
    "admin":       ["bo-statut", "bo-fenetre", "bo-mission", "bo-desorbiter"],
}

def check_perm(role: str, perm: str):
    if perm not in ROLE_PERMS.get(role, []):
        raise HTTPException(
            status_code=403,
            detail=f"Accès refusé : le rôle '{role}' n'est pas autorisé pour cette action."
        )


# ── BO-01 : Modifier le statut d'un satellite ────────────────
class StatutBody(BaseModel):
    statut: str
    role: str

STATUTS_VALIDES = {"Opérationnel", "En veille", "Désorbité", "Défaillant"}

@app.post("/api/satellites/{ref_satellite}/statut")
def update_statut(ref_satellite: str, body: StatutBody):
    check_perm(body.role, "bo-statut")
    if body.statut not in STATUTS_VALIDES:
        raise HTTPException(status_code=400, detail=f"Statut invalide. Valeurs : {STATUTS_VALIDES}")
    try:
        conn = get_conn()
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE SATELLITE SET statut = %s WHERE ref_satellite = %s",
                (body.statut, ref_satellite)
            )
            if cur.rowcount == 0:
                conn.close()
                return {"status": "error", "message": "Satellite introuvable."}
        conn.commit()
        conn.close()
        return {"status": "success", "message": f"Statut mis à jour : {body.statut}"}
    except HTTPException:
        raise
    except Exception as e:
        return {"status": "error", "message": str(e)}


# ── BO-02 : Planifier une fenêtre de communication ───────────
class FenetreBody(BaseModel):
    ref_satellite: str          # PK char(7) ex: 'SAT-001'
    code_station: str           # PK char(11) ex: 'GS-TLS-01'
    datetime_debut: str         # format 'YYYY-MM-DD HH:MM:SS'
    duree: int                  # secondes, 1–900
    elevation_max: float
    role: str

@app.post("/api/fenetres")
def create_fenetre(body: FenetreBody):
    check_perm(body.role, "bo-fenetre")
    if not (1 <= body.duree <= 900):
        raise HTTPException(status_code=400, detail="La durée doit être entre 1 et 900 secondes.")
    try:
        conn = get_conn()
        with conn.cursor() as cur:
            # id_fenetre n'est pas AUTO_INCREMENT → on calcule le prochain
            cur.execute("SELECT COALESCE(MAX(id_fenetre), 0) + 1 AS next_id FROM FENETRE_COM")
            next_id = cur.fetchone()["next_id"]

            cur.execute("""
                INSERT INTO FENETRE_COM
                    (id_fenetre, datetime_debut, duree, elevation_max, statut,
                     fk_id_satellite, fk_code_station)
                VALUES (%s, %s, %s, %s, 'Planifiée', %s, %s)
            """, (next_id, body.datetime_debut, body.duree, body.elevation_max,
                  body.ref_satellite, body.code_station))
        conn.commit()
        conn.close()
        return {"status": "success", "message": "Fenêtre planifiée avec succès."}
    except HTTPException:
        raise
    except pymysql.err.IntegrityError as e:
        return {"status": "error", "message": f"Contrainte violée : {e.args[1]}"}
    except Exception as e:
        return {"status": "error", "message": str(e)}


# ── BO-03 : Assigner un satellite à une mission ──────────────
class ParticipationBody(BaseModel):
    ref_satellite: str   # char(7)
    id_mission: str      # char(12)
    role_satellite: str
    role: str            # rôle applicatif

@app.post("/api/participations")
def create_participation(body: ParticipationBody):
    check_perm(body.role, "bo-mission")
    try:
        conn = get_conn()
        with conn.cursor() as cur:
            # Vérifier que la mission existe et n'est pas terminée
            cur.execute(
                "SELECT statut_mission FROM MISSION WHERE id_mission = %s",
                (body.id_mission,)
            )
            m = cur.fetchone()
            if not m:
                conn.close()
                return {"status": "error", "message": "Mission introuvable."}
            if m["statut_mission"] == "Terminée":
                conn.close()
                return {"status": "error", "message": "Impossible d'assigner à une mission terminée."}

            # Vérifier doublon
            cur.execute(
                "SELECT 1 FROM PARTICIPATION WHERE id_satellite = %s AND id_mission = %s",
                (body.ref_satellite, body.id_mission)
            )
            if cur.fetchone():
                conn.close()
                return {"status": "error", "message": "Ce satellite est déjà assigné à cette mission."}

            # PARTICIPATION a des colonnes PK + FK dupliqués dans le schéma
            cur.execute("""
                INSERT INTO PARTICIPATION
                    (id_satellite, id_mission, role_satellite,
                     fk_id_satellite, fk_id_mission)
                VALUES (%s, %s, %s, %s, %s)
            """, (body.ref_satellite, body.id_mission, body.role_satellite,
                  body.ref_satellite, body.id_mission))
        conn.commit()
        conn.close()
        return {"status": "success", "message": "Satellite assigné à la mission."}
    except HTTPException:
        raise
    except Exception as e:
        return {"status": "error", "message": str(e)}


# ── BO-04 : Désorbiter un satellite ─────────────────────────
class DesorbiterBody(BaseModel):
    role: str

@app.post("/api/satellites/{ref_satellite}/desorbiter")
def desorbiter_satellite(ref_satellite: str, body: DesorbiterBody):
    check_perm(body.role, "bo-desorbiter")
    try:
        conn = get_conn()
        with conn.cursor() as cur:
            # Essai procédure stockée Phase 4.5
            try:
                cur.execute("CALL desorbiter_satellite(%s, @n)", (ref_satellite,))
                cur.execute("SELECT @n AS nb_annulees")
                result = cur.fetchone()
                nb = result["nb_annulees"] if result else 0
            except pymysql.err.OperationalError:
                # Fallback sans procédure : annuler les fenêtres planifiées + désorbiter
                cur.execute("""
                    UPDATE FENETRE_COM
                    SET statut = 'Échouée'
                    WHERE fk_id_satellite = %s AND statut = 'Planifiée'
                """, (ref_satellite,))
                nb = cur.rowcount
                cur.execute(
                    "UPDATE SATELLITE SET statut = 'Désorbité' WHERE ref_satellite = %s",
                    (ref_satellite,)
                )
        conn.commit()
        conn.close()
        return {"status": "success", "message": "Satellite désorbité.", "fenetres_annulees": nb}
    except HTTPException:
        raise
    except Exception as e:
        return {"status": "error", "message": str(e)}


# ── Health check ─────────────────────────────────────────────
@app.get("/api/status")
def check_db_status():
    try:
        conn = get_conn()
        conn.close()
        return {"status": "success", "message": "Connecté à nanoOrbit_db ✅"}
    except Exception as e:
        return {"status": "error", "message": str(e)}
