/* 
Nao podemos ter acento nas entidades;
O token não pode ser utilizado como identificador primário ele é tão secreto quanto a senha;
A senha deve ser criptografada com hash bcrypt (tamanho de 60 caracteres);
Devemos seguir o seguinte padrão:       elemento_nomeentidade para evitar ambiguidades;
*/

CREATE TABLE Usuário (
    /* Devemos ter um ID gerado automaticamente (diferente do token) */
    token CHAR(255) PRIMARY KEY, /* Devemos ter um token de 36 caracteres (UUID) */
    nome CHAR(100),
    senha CHAR(16),
    score NUMERIC,
    foto VARCHAR(255),
    nome_usuario CHAR(10) NOT NULL,
    unique (nome_usuario)
);

CREATE TABLE Partida (
    id NUMERIC PRIMARY KEY,
    resultado CHAR(1),
    num_rodadas NUMERIC,
    score_partida NUMERIC,
    fk_Usuário_token CHAR(255) NOT NULL
);

CREATE TABLE Personagem (
    id NUMERIC PRIMARY KEY,
    tipo CHAR(30),
    grau_mentiroso DECIMAL(4,2),
    papel CHAR(15)
);

CREATE TABLE Amizade (
    fk_Usuário_token CHAR(255),
    fk_Usuário_token_ CHAR(255)
);

CREATE TABLE Possui (
    fk_Personagem_id NUMERIC,
    fk_Partida_id NUMERIC
);
 
ALTER TABLE Partida ADD CONSTRAINT FK_Partida_2
    FOREIGN KEY (fk_Usuário_token)
    REFERENCES Usuário (token)
    ON DELETE CASCADE;
 
ALTER TABLE Amizade ADD CONSTRAINT FK_Amizade_1
    FOREIGN KEY (fk_Usuário_token)
    REFERENCES Usuário (token)
    ON DELETE CASCADE;
 
ALTER TABLE Amizade ADD CONSTRAINT FK_Amizade_2
    FOREIGN KEY (fk_Usuário_token)
    REFERENCES Usuário (token)
    ON DELETE CASCADE;
 
ALTER TABLE Possui ADD CONSTRAINT FK_Possui_1
    FOREIGN KEY (fk_Personagem_id)
    REFERENCES Personagem (id)
    ON DELETE RESTRICT;
 
ALTER TABLE Possui ADD CONSTRAINT FK_Possui_2
    FOREIGN KEY (fk_Partida_id)
    REFERENCES Partida (id)
    ON DELETE SET NULL;