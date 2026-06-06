SET NAMES utf8mb4;

-- ── FO-01 : Satellites opérationnels ────────────────────────────
-- Correction : ajout de date_lancement + SET NAMES pour le filtre 'Opérationnel'
CREATE OR REPLACE VIEW VUE_SATELLITES_OPERATIONNELS AS
SELECT s.ref_satellite,
       s.nom_satellite,
       s.format_cubesat,
       s.date_lancement,
       s.statut,
       o.type_orbite,
       o.altitude,
       s.capacite_batterie
FROM SATELLITE s
         JOIN ORBITE o ON s.fk_id_orbite = o.id_orbite
WHERE s.statut = 'Opérationnel';


-- ── FO-02 : Bilan des communications ────────────────────────────
-- Correction : ajout de nom_satellite via JOIN SATELLITE
CREATE OR REPLACE VIEW VUE_BILAN_COMMUNICATIONS AS
SELECT f.fk_id_satellite,
       s.nom_satellite,
       COUNT(f.id_fenetre)             AS nb_fenetres_realisees,
       SUM(f.volume_donnees)           AS volume_total_mo,
       AVG(f.volume_donnees)           AS volume_moyen_mo,
       MAX(f.datetime_debut)           AS date_derniere_communication,
       COUNT(DISTINCT f.fk_code_station) AS nb_stations_contactees
FROM FENETRE_COM f
         JOIN SATELLITE s ON f.fk_id_satellite = s.ref_satellite
WHERE f.statut = 'Réalisée'
GROUP BY f.fk_id_satellite, s.nom_satellite;


-- ── FO-03 : Tableau de bord missions ────────────────────────────
CREATE OR REPLACE VIEW VUE_TABLEAU_DE_BORD_MISSIONS AS
SELECT m.id_mission,
       m.nom_mission,
       m.zone_geo_cible,
       m.date_debut,
       COUNT(p.id_satellite)                                       AS nb_satellites_participants,
       SUM(CASE WHEN s.statut = 'Opérationnel' THEN 1 ELSE 0 END) AS nb_satellites_operationnels
FROM MISSION m
         LEFT JOIN PARTICIPATION p ON m.id_mission = p.id_mission
         LEFT JOIN SATELLITE s     ON p.id_satellite = s.ref_satellite
WHERE m.statut_mission = 'Active'
GROUP BY m.id_mission, m.nom_mission, m.zone_geo_cible, m.date_debut;


-- ── FO-04 : Alertes instruments ─────────────────────────────────
-- Correction : 'Hors service' → 'HS' (valeur réelle de l'enum)
--              + ajout nom_satellite via JOIN SATELLITE
CREATE OR REPLACE VIEW VUE_ALERTES_INSTRUMENTS AS
SELECT i.ref_instrument,
       i.type_instrument,
       e.etat_fonctionnement,
       e.id_satellite,
       s.nom_satellite,
       CASE
           WHEN e.etat_fonctionnement = 'HS'      THEN 'CRITIQUE'
           WHEN e.etat_fonctionnement = 'Dégradé' THEN 'SURVEILLANCE'
       END AS priorite
FROM INSTRUMENT i
         JOIN EMBARQUEMENT e ON i.ref_instrument = e.ref_instrument
         JOIN SATELLITE    s ON e.id_satellite   = s.ref_satellite
WHERE e.etat_fonctionnement IN ('Dégradé', 'HS');
