-- Inserts gerados a partir do resultado do SELECT fornecido
INSERT INTO Usuario (token_usuario, nome_usuario, senha_usuario, score_usuario, foto_usuario, id_usuario) VALUES
('3537b701-c768-4d28-9d6f-97adbc898089', 'danielgcg', '$2b$10$xeMya8c85Bt.o8XvgCUrUec1.07hwSpQJ2FsVX2dD2KdwzrHKqTOa', 2, 'https://images2.alphacoders.com/226/thumb-1920-226262.jpg', 1),
('85587366-48fe-483d-bc34-030922a52cd0', 'cascadibala', '$2b$10$xHzaw/bY59r6HyXbxZmuZO.kR5RtLY.gkGAp3n0h/sQSH2WlvBrG2', 1, 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTMdM9MEQ0ExL1PmInT3U5I8v63YXBEdoIT0Q&s', 2),
('fe0853d2-bc82-4b0b-b013-fcc5665f7513', 'ChineloVoador', '$2b$10$.BMsY10FxaD0ghK1Yg00yOLfwAA2CFa5/xxSBvsaflbf0lUcd86EK', 4, 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTQtISpeqxmno3q2TLLvuEHPymOMs_Ppm9aaw&s', 3),
('adb2672d-5189-4ac0-b3b9-9c3140714b51', 'SenhorBatata', '$2b$10$oVtMXFKEPXSOrlfAHf/SOu52d8JaZi768ZH3PfLwmG.Yo8wGkXiXO', 4, '/img/usuario.png', 4),
('cc5a8975-2f8f-475b-aacb-50f09b258c79', 'DadoViciado', '$2b$10$VS.L8SAxvjWgo2U0rF.7h.3KDRcnNINp6mt.nKa0l1Jex8eCpuvC2', 0, 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTgp7USvKuxW8WibFPlebQEo65rvaPwklYGRw&s', 5),
('545d8764-1565-41ba-b1fe-0bb0b0ec0ab2', 'bodebluetooth', '$2b$10$V1SVaogRvqyAOrXjFHuHPuOGJL1S61BEa7VUMlBReqz8bf2mDt8Ry', 3, 'https://www.lifewire.com/thmb/C9ljtSvR9RtODouzgscRQbE8N9o=/1500x0/filters:no_upscale():max_bytes(150000):strip_icc()/bluetooth-5658c2859a7e493490d0e721f189f6d2.png', 6),
('5953c2b8-d508-4e5b-bda4-a29c824d1585', 'luwai', '$2b$10$jsVNafpscbaVZmLdtCfhTOXVYa8Tmwp4mKMdy2k45IrurL5KXdg7a', 7, 'https://i.pinimg.com/736x/f9/93/bb/f993bbabc7d1ce7768f8e6956cd8da19.jpg', 7);

-- Observação: se a tabela `Usuario` já contiver registros com os mesmos `id_usuario` ou `token_usuario`,
-- a execução acima pode falhar por violação de chave primária/unique. Ajuste/remova os registros existentes conforme necessário.

