CREATE USER IF NOT EXISTS 'operateur_sat'@'localhost'
    IDENTIFIED BY 'Test1234!';

GRANT SELECT
    ON nanoOrbit_db.*
    TO 'operateur_sat'@'localhost';

GRANT INSERT, UPDATE
    ON nanoOrbit_db.FENETRE_COM
    TO 'operateur_sat'@'localhost';

GRANT UPDATE (ref_satellite, nom_satellite, statut)
    ON nanoOrbit_db.SATELLITE
    TO 'operateur_sat'@'localhost';


/*Rôle : Analyste de données*/
CREATE USER IF NOT EXISTS 'analyste_data'@'localhost'
    IDENTIFIED BY 'Test1234!';

GRANT SELECT
    ON nanoOrbit_db.*
    TO 'analyste_data'@'localhost';


/*Rôle : Responsable mission*/
CREATE USER IF NOT EXISTS 'resp_mission'@'localhost'
    IDENTIFIED BY 'Test1234!';

GRANT SELECT
    ON nanoOrbit_db.*
    TO 'resp_mission'@'localhost';

GRANT INSERT, UPDATE
    ON nanoOrbit_db.MISSION
    TO 'resp_mission'@'localhost';

GRANT INSERT, UPDATE
    ON nanoOrbit_db.PARTICIPATION
    TO 'resp_mission'@'localhost';


/*Rôle : Admin nano*/
CREATE USER IF NOT EXISTS 'admin_nano'@'localhost'
    IDENTIFIED BY 'Test1234!';

GRANT SELECT, INSERT, UPDATE, DELETE, CREATE VIEW
    ON nanoOrbit_db.*
    TO 'admin_nano'@'localhost';