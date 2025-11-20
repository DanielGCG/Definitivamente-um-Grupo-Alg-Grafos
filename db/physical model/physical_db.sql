/* physical db */

CREATE TABLE Usuario (
    token_usuario VARCHAR(36) NOT NULL UNIQUE,
    nome_usuario VARCHAR(50) NOT NULL,
    senha_usuario VARCHAR(60) NOT NULL,
    score_usuario INTEGER DEFAULT 0,
    foto_usuario VARCHAR(500),
    id_usuario INTEGER AUTO_INCREMENT PRIMARY KEY
);

CREATE TABLE Partida (
    id_partida INTEGER PRIMARY KEY,
    resultado_partida CHAR(1),
    numRodadas_partida INTEGER,
    score_partida INTEGER,
    fk_Usuario_id_usuario INTEGER
);

CREATE TABLE Personagem (
    id_personagem INTEGER PRIMARY KEY,
    tipo_personagem VARCHAR(30),
    grauMentiroso_personagem FLOAT,
    papel_personagem CHAR(30)
);

CREATE TABLE Amizade (
    fk_Usuario_id_usuario INTEGER,
    fk_Usuario_id_usuario_ INTEGER
);

CREATE TABLE Possui (
    fk_Personagem_id_personagem INTEGER,
    fk_Partida_id_partida INTEGER
);
 
ALTER TABLE Partida ADD CONSTRAINT FK_Partida_2
    FOREIGN KEY (fk_Usuario_id_usuario)
    REFERENCES Usuario (id_usuario)
    ON DELETE CASCADE;
 
ALTER TABLE Amizade ADD CONSTRAINT FK_Amizade_1
    FOREIGN KEY (fk_Usuario_id_usuario)
    REFERENCES Usuario (id_usuario)
    ON DELETE CASCADE;
 
ALTER TABLE Amizade ADD CONSTRAINT FK_Amizade_2
    FOREIGN KEY (fk_Usuario_id_usuario_)
    REFERENCES Usuario (id_usuario)
    ON DELETE CASCADE;
 
ALTER TABLE Possui ADD CONSTRAINT FK_Possui_1
    FOREIGN KEY (fk_Personagem_id_personagem)
    REFERENCES Personagem (id_personagem)
    ON DELETE RESTRICT;
 
ALTER TABLE Possui ADD CONSTRAINT FK_Possui_2
    FOREIGN KEY (fk_Partida_id_partida)
    REFERENCES Partida (id_partida)
    ON DELETE SET NULL;