SET NAMES utf8mb4;
SET character_set_client = utf8mb4;
create database if not exists nanoOrbit_db character set utf8mb4 collate utf8mb4_unicode_ci;
USE nanoOrbit_db;

drop table if exists PARTICIPATION;
drop table if exists MISSION;
drop table if exists FENETRE_COM;
drop table if exists STATION_SOL;
drop table if exists EMBARQUEMENT;
drop table if exists INSTRUMENT;
drop table if exists SATELLITE;
drop table if exists ORBITE;
create database if not exists nanoOrbit_db character set utf8mb4;
USE nanoOrbit_db;


CREATE table  ORBITE
(
    id_orbite int primary key,
    type_orbite enum('LEO','MEO','SSO','GEO') NOT NULL ,
    altitude int UNIQUE ,
    inclinaison float UNIQUE ,
    periode_orbitale float NOT NULL ,
    excentricite float NOT NULL ,
    zone_couverture varchar(50) NOT NULL
)
    ENGINE = InnoDB;


Create table SATELLITE
(
    ref_satellite varchar(7) primary key,
    nom_satellite varchar(50) NOT NULL ,
    date_lancement date NOT NULL ,
    masse float NOT NULL ,
    format_cubesat varchar(10) NOT NULL ,
    statut enum('Opérationnel','En veille','Désorbité','Défaillant') NOT NULL ,
    duree_vie_prevue int NOT NULL ,
    capacite_batterie float NOT NULL ,
    fk_id_orbite int NOT NULL ,
    CONSTRAINT fk_satellite_orbite
        FOREIGN KEY (fk_id_orbite) REFERENCES ORBITE(id_orbite) ON DELETE RESTRICT
)
    ENGINE = InnoDB;


create table INSTRUMENT
(
    ref_instrument varchar(12) primary key,
    type_instrument varchar(50) NOT NULL ,
    modele varchar(50) Not Null,
    resolution float ,
    consommation float NOT NULL ,
    masse float NOT NULL
)
    ENGINE = InnoDB;


CREATE table EMBARQUEMENT
(
    id_satellite char(7),
    ref_instrument varchar(12),
    primary key (id_satellite, ref_instrument),
    date_integration date NOT NULL ,
    etat_fonctionnement enum('Nominal','Dégradé','HS') NOT NULL,
    fk_id_satellite char(7) NOT NULL ,
    fk_ref_instrument varchar(12) NOT NULL ,
    CONSTRAINT fk_embarquement_satellite
        FOREIGN KEY (fk_id_satellite) REFERENCES SATELLITE(ref_satellite) ON DELETE RESTRICT,
    CONSTRAINT fk_embarquement_instrument
        FOREIGN KEY (fk_ref_instrument) REFERENCES INSTRUMENT(ref_instrument) ON DELETE RESTRICT
)
    ENGINE = InnoDB;


create table STATION_SOL
(
    code_station char(11) primary key ,
    nom_station varchar(50) NOT NULL ,
    latitude float NOT NULL ,
    longitude float NOT NULL ,
    diametre_antenne float NOT NULL ,
    bande_frequence enum('UHF','S-Band','X-Band','Ka-Band') NOT NULL ,
    debit_max float NOT NULL,
    statut enum('active', 'inactive','maintenance') NOT NULL
)
    ENGINE = InnoDB;


create table FENETRE_COM
(
    id_fenetre int primary key ,
    datetime_debut datetime NOT NULL ,
    duree int NULL ,
    CHECK (duree >= 1 AND duree <= 900),
    elevation_max float NOT NULL ,
    volume_donnees float,
    statut enum('Planifiée', 'En cours', 'Réalisée', 'Échouée') NOT NULL ,
    fk_id_satellite char(7) NOT NULL ,
    fk_code_station char(11) NOT NULL ,
    CONSTRAINT fk_fenetre_com_satellite
        FOREIGN KEY (fk_id_satellite) REFERENCES SATELLITE(ref_satellite) ON DELETE RESTRICT,
    CONSTRAINT fk_fenetre_com_station
        FOREIGN KEY (fk_code_station) REFERENCES STATION_SOL(code_station) ON DELETE RESTRICT
)
    ENGINE = InnoDB;


create table MISSION
(
    id_mission char(12) primary key ,
    nom_mission varchar(50) NOT NULL ,
    objectif varchar(255) NOT NULL ,
    zone_geo_cible varchar(50) NOT NULL ,
    date_debut date NOT NULL ,
    date_fin date,
    statut_mission enum('Active','Terminée','Suspendue') NOT NULL
)
    ENGINE = InnoDB;


create table PARTICIPATION
(
    id_satellite char(7),
    id_mission char(12),
    primary key (id_satellite, id_mission),
    role_satellite varchar(50) NOT NULL ,
    fk_id_satellite char(7) NOT NULL ,
    fk_id_mission char(12) NOT NULL ,
    CONSTRAINT fk_participation_satellite
        FOREIGN KEY (fk_id_satellite) REFERENCES SATELLITE(ref_satellite) ON DELETE RESTRICT,
    CONSTRAINT fk_participation_mission
        FOREIGN KEY (fk_id_mission) REFERENCES MISSION(id_mission) ON DELETE RESTRICT
)
    ENGINE = InnoDB;

