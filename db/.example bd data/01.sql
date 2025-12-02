-- Inserts gerados a partir do resultado do SELECT fornecido
INSERT INTO Usuario (token_usuario, nome_usuario, senha_usuario, score_usuario, foto_usuario, id_usuario) VALUES
('878a3f50-2b1e-4077-ac2c-8a15ea3112a6', 'danielgcg', '$2b$10$xeMya8c85Bt.o8XvgCUrUec1.07hwSpQJ2FsVX2dD2KdwzrHKqTOa', 3, 'https://images2.alphacoders.com/226/thumb-1920-226262.jpg', 1),
('85587366-48fe-483d-bc34-030922a52cd0', 'cascadibala', '$2b$10$xHzaw/bY59r6HyXbxZmuZO.kR5RtLY.gkGAp3n0h/sQSH2WlvBrG2', 1, 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTMdM9MEQ0ExL1PmInT3U5I8v63YXBEdoIT0Q&s', 2),
('fe0853d2-bc82-4b0b-b013-fcc5665f7513', 'ChineloVoador', '$2b$10$.BMsY10FxaD0ghK1Yg00yOLfwAA2CFa5/xxSBvsaflbf0lUcd86EK', 4, 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTQtISpeqxmno3q2TLLvuEHPymOMs_Ppm9aaw&s', 3),
('adb2672d-5189-4ac0-b3b9-9c3140714b51', 'SenhorBatata', '$2b$10$oVtMXFKEPXSOrlfAHf/SOu52d8JaZi768ZH3PfLwmG.Yo8wGkXiXO', 4, '/img/usuario.png', 4),
('5d8e0d27-0f45-4de6-af03-b40e28aa0036', 'DadoViciado', '$2b$10$VS.L8SAxvjWgo2U0rF.7h.3KDRcnNINp6mt.nKa0l1Jex8eCpuvC2', 0, 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTgp7USvKuxW8WibFPlebQEo65rvaPwklYGRw&s', 5),
('0ef7da05-4720-4a84-a364-d1ed5265ea93', 'bodebluetooth', '$2b$10$V1SVaogRvqyAOrXjFHuHPuOGJL1S61BEa7VUMlBReqz8bf2mDt8Ry', 3, 'https://www.lifewire.com/thmb/C9ljtSvR9RtODouzgscRQbE8N9o=/1500x0/filters:no_upscale():max_bytes(150000):strip_icc()/bluetooth-5658c2859a7e493490d0e721f189f6d2.png', 6),
('13ff8697-cab8-49a5-b6dc-111e4fd38960', 'luwai', '$2b$10$jsVNafpscbaVZmLdtCfhTOXVYa8Tmwp4mKMdy2k45IrurL5KXdg7a', 7, 'https://i.pinimg.com/736x/f9/93/bb/f993bbabc7d1ce7768f8e6956cd8da19.jpg', 7),
('72dc3714-2ab7-46c6-8902-b2fcab88c6d7', 'carol', '$2b$10$4TvEC2ZvBn05.OkxbJGHl.gPD.S6wJYf3xI33Ul4fuo0kOmPuSJZC', 0, '/img/usuario.png', 8),
('d12136bb-ae6a-4aa0-a062-3191f80e6236', 'tales', '$2b$10$pXNUyfh0N1TtudcuN42Peu8ttADVCYWHSmwqnhb4FAZTkfPjgqkpC', 0, '/img/usuario.png', 9),
('5b94c762-e436-4c35-b08d-55cde8e39435', 'fellipe', '$2b$10$33hGGW0aFqUMiPwP.IFey.AKNdFHDhwHk4Lx5owxKHJJIoMBURUpm', 0, '/img/usuario.png', 10),
('da17cc0b-3fec-4d12-83fb-67b2acb921a8', 'maria', '$2b$10$b9sVWTxGBX/4wEuuwewuMOlvAkR4k4i892A2/t.7NH4gFFwUFv0vy', 0, '/img/usuario.png', 11);

-- Observação: se a tabela `Usuario` já contiver registros com os mesmos `id_usuario` ou `token_usuario`,
-- a execução acima pode falhar por violação de chave primária/unique. Ajuste/remova os registros existentes conforme necessário.

