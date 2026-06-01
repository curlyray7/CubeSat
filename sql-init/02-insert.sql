-- --------------------------------------------------------
-- Importation des données pour la table EMBARQUEMENT
-- --------------------------------------------------------
INSERT INTO EMBARQUEMENT (id_satellite, ref_instrument, date_integration, etat_fonctionnement) VALUES
('SAT-001', 'CAM-HR-01', '2023-02-01', 'Nominal'),
('SAT-001', 'IR-MID-01', '2023-02-01', 'Dégradé'),
('SAT-002', 'CAM-HR-01', '2023-02-10', 'Nominal'),
('SAT-002', 'AIS-01', '2023-02-10', 'Nominal'),
('SAT-003', 'IR-MID-01', '2023-08-01', 'Nominal'),
('SAT-004', 'CAM-HR-02', '2024-01-05', 'Nominal'),
('SAT-004', 'AIS-01', '2024-01-05', 'Nominal');

-- --------------------------------------------------------
-- Importation des données pour la table FENETRE_COM
-- --------------------------------------------------------
INSERT INTO FENETRE_COM (id_fenetre, datetime_debut, duree, elevation_max, volume_donnees, statut, id_satellite, code_station) VALUES
(1, '2024-03-15 14:32:00', 420, 68.4, 1250.0, 'Réalisée', 'SAT-001', 'GS-TLS-01'),
(2, '2024-03-15 16:08:00', 380, 52.1, 890.0, 'Réalisée', 'SAT-002', 'GS-KIR-01'),
(3, '2024-03-16 08:15:00', 510, 74.2, NULL, 'Planifiée', 'SAT-003', 'GS-KIR-01'),
(4, '2024-03-16 09:00:00', 300, 45.0, NULL, 'Planifiée', 'SAT-004', 'GS-TLS-01'),
(5, '2024-03-15 22:44:00', 280, 38.7, 620.0, 'Réalisée', 'SAT-001', 'GS-KIR-01');

-- --------------------------------------------------------
-- Importation des données pour la table INSTRUMENT
-- --------------------------------------------------------
INSERT INTO INSTRUMENT (ref_instrument, type_instrument, modele, resolution, consommation, masse) VALUES
('CAM-HR-01', 'Caméra optique', 'PocketQube-CAM v2', 5.0, 3.2, 0.45),
('IR-MID-01', 'Capteur IR', 'ThermoSat IRv3', 30.0, 2.8, 0.38),
('AIS-01', 'Capteur AIS', 'MarineTrack-Nano', NULL, 1.5, 0.22),
('CAM-HR-02', 'Caméra optique', 'PocketQube-CAM v3', 3.5, 4.0, 0.5);

-- --------------------------------------------------------
-- Importation des données pour la table MISSION
-- --------------------------------------------------------
INSERT INTO MISSION (id_mission, nom_mission, objectif, zone_geo_cible, date_debut, date_fin, statut_mission) VALUES
('MSN-AMA-2023', 'ForestWatch Amazonia', 'Suivi de la déforestation en Amazonie par imagerie optique', 'Amérique du Sud (-5N, 50O)', '2023-04-01', '2025-03-31', 'Active'),
('MSN-ARC-2023', 'ArcticIce Monitor', 'Surveillance de la fonte des glaces arctiques', 'Arctique (>70N)', '2023-04-01', NULL, 'Active'),
('MSN-AIS-2024', 'SeaTrack Global', 'Détection et suivi du trafic maritime mondial', 'Océans mondiaux', '2024-02-01', '2024-12-31', 'Terminée');

-- --------------------------------------------------------
-- Importation des données pour la table ORBITE
-- --------------------------------------------------------
INSERT INTO ORBITE (id_orbite, type_orbite, altitude, inclinaison, periode_orbitale, excentricite, zone_couverture) VALUES
(1, 'SSO', 550, 97.4, 95.7, 0.001, 'Zones polaires / Arctique'),
(2, 'LEO', 400, 51.6, 92.65, 0.0003, 'Ceinture tropicale'),
(3, 'SSO', 600, 97.8, 96.7, 0.0008, 'Amazonie / Afrique centrale');

-- --------------------------------------------------------
-- Importation des données pour la table PARTICIPATION
-- --------------------------------------------------------
INSERT INTO PARTICIPATION (id_satellite, id_mission, role_satellite) VALUES
('SAT-001', 'MSN-AMA-2023', 'Satellite primaire'),
('SAT-002', 'MSN-AMA-2023', 'Satellite de backup'),
('SAT-003', 'MSN-ARC-2023', 'Satellite primaire'),
('SAT-001', 'MSN-ARC-2023', 'Satellite de calibration'),
('SAT-004', 'MSN-AIS-2024', 'Satellite primaire'),
('SAT-002', 'MSN-AIS-2024', 'Satellite de backup');

-- --------------------------------------------------------
-- Importation des données pour la table SATELLITE
-- --------------------------------------------------------
INSERT INTO SATELLITE (id_satellite, nom_satellite, date_lancement, masse, format_cubesat, statut, duree_vie_prevue, capacite_batterie, id_orbite) VALUES
('SAT-001', 'NanoOrbit-Alpha', '2023-03-12', 4.5, '3U', 'Opérationnel', 36, 60.0, 1),
('SAT-002', 'NanoOrbit-Beta', '2023-03-12', 4.5, '3U', 'Opérationnel', 36, 60.0, 1),
('SAT-003', 'NanoOrbit-Gamma', '2023-09-05', 8.2, '6U', 'En veille', 48, 110.0, 2),
('SAT-004', 'NanoOrbit-Delta', '2024-01-20', 4.8, '3U', 'Opérationnel', 36, 65.0, 3),
('SAT-005', 'NanoOrbit-Epsilon', '2022-06-15', 4.5, '3U', 'Désorbité', 24, 55.0, 1);

-- --------------------------------------------------------
-- Importation des données pour la table STATION_SOL
-- --------------------------------------------------------
INSERT INTO STATION_SOL (code_station, nom_station, latitude, longitude, diametre_antenne, bande_frequence, debit_max, statut) VALUES
('GS-TLS-01', 'Toulouse-CNES', 43.605, 1.444, 3.7, 'S-Band', 100.0, 'Active'),
('GS-KIR-01', 'Kiruna-SSC', 67.856, 20.228, 5.4, 'X-Band', 300.0, 'Active'),
('GS-SGP-01', 'Singapore-SATEC', 1.3521, 103.8198, 2.8, 'S-Band', 80.0, 'Maintenance');