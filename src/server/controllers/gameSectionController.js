const db = require('../db/database');
const graphController = require('./graphGenerationController');
const gameLogicController = require('./gameLogicController');

exports.joinGameSection = async (req, res) => {
    try {
        // Pegamos o cookie do token do usuário autenticado
        const token_usuario = req.cookies?.token_usuario;
        if (!token_usuario) return res.status(401).json({ message: 'Não autenticado.' });

        // localizar usuário atual
        const [rowsUser] = await db.query('SELECT id_usuario FROM usuario WHERE token_usuario = ? LIMIT 1', [token_usuario]);
        if (!rowsUser || rowsUser.length === 0) return res.status(404).json({ message: 'Usuário não encontrado.' });
        const userId = rowsUser[0].id_usuario;

        // Verifica se já existe uma partida em andamento para este usuário
        const [rowsPartida] = await db.query(
            `SELECT id_partida, numRodadas_partida, grafo_json_partida, depoimentos_json_partida, 
                    fofoqueiro_id_partida, vidas_restantes_partida, score_partida, usou_dica_partida,
                    verificacao_usada_partida, depoimento_verificado_index_partida
             FROM partida 
             WHERE fk_Usuario_id_usuario = ? AND status_partida = ? LIMIT 1`,
            [userId, 'em_andamento']
        );
        
        // Se já existir uma partida em andamento, retorna a partida existente com grafo
        if (rowsPartida && rowsPartida.length > 0) {
            const idPartida = rowsPartida[0].id_partida;
            
            // Verificar se o grafo existe, caso contrário a partida está corrompida
            if (!rowsPartida[0].grafo_json_partida || !rowsPartida[0].depoimentos_json_partida) {
                // Deletar partida corrompida e criar uma nova
                await db.query('DELETE FROM partida WHERE id_partida = ?', [idPartida]);
                console.log(`Partida ${idPartida} estava corrompida, recriando...`);
            } else {
                const grafo = JSON.parse(rowsPartida[0].grafo_json_partida);
                const depoimentos = JSON.parse(rowsPartida[0].depoimentos_json_partida);

                return res.status(200).json({ 
                    message: 'Partida em andamento já existe.', 
                    id_partida: idPartida,
                    isNew: false,
                    nomes: grafo.nodes.map(n => ({ id: n.id, nome: n.nome, foto: n.foto })),
                    depoimentos: depoimentos.map(d => `${d.quemOuviu}: ouvi de ${d.deQuem}`),
                    vidasRestantes: rowsPartida[0].vidas_restantes_partida,
                    grafo: rowsPartida[0].usou_dica_partida ? grafo : null,
                    usouDica: !!rowsPartida[0].usou_dica_partida,
                    usouVerificacao: !!rowsPartida[0].verificacao_usada_partida,
                    depoimentoVerificadoIndex: rowsPartida[0].depoimento_verificado_index_partida,
                    depoimentoVerificadoEhMentira: (typeof rowsPartida[0].depoimento_verificado_index_partida === 'number' && depoimentos[rowsPartida[0].depoimento_verificado_index_partida]) 
                        ? !!depoimentos[rowsPartida[0].depoimento_verificado_index_partida].ehMentira 
                        : null,
                    scoreAtual: rowsPartida[0].score_partida
                });
            }
        }

        // Caso contrário, cria uma nova partida (AUTO_INCREMENT garante ID único)
        const [result] = await db.query(
            'INSERT INTO partida (fk_Usuario_id_usuario, status_partida, numRodadas_partida, score_partida) VALUES (?, ?, ?, ?)',
            [userId, 'em_andamento', 0, 0]
        );

        const idPartida = result.insertId;

        // Gerar grafo para a nova partida
        const numNodes = 6;
        const estadoJogo = await gameLogicController.inicializarJogo(idPartida, userId, numNodes);

        return res.status(201).json({
            message: 'Partida criada com sucesso.',
            id_partida: idPartida,
            isNew: true,
            nomes: estadoJogo.nomes,
            depoimentos: estadoJogo.depoimentos,
            vidasRestantes: estadoJogo.vidasRestantes,
            usouVerificacao: estadoJogo.usouVerificacao,
            depoimentoVerificadoIndex: estadoJogo.depoimentoVerificadoIndex,
            depoimentoVerificadoEhMentira: null
        });
    } catch (err) {
        console.error('Erro ao criar partida:', err);
        return res.status(500).json({ message: 'Erro ao criar partida.' });
    }
};

exports.leaveGameSection = async (req, res) => {
    try {
        // Pegamos o cookie do token do usuário autenticado
        const token_usuario = req.cookies?.token_usuario;
        if (!token_usuario) return res.status(401).json({ message: 'Não autenticado.' });

        // localizar usuário atual
        const [rowsUser] = await db.query('SELECT id_usuario FROM usuario WHERE token_usuario = ? LIMIT 1', [token_usuario]);
        if (!rowsUser || rowsUser.length === 0) return res.status(404).json({ message: 'Usuário não encontrado.' });
        const userId = rowsUser[0].id_usuario;

        // Buscar partida em andamento do usuário
        const [rowsPartida] = await db.query(
            'SELECT id_partida, score_partida FROM partida WHERE fk_Usuario_id_usuario = ? AND status_partida = ? LIMIT 1',
            [userId, 'em_andamento']
        );

        if (!rowsPartida || rowsPartida.length === 0) {
            return res.status(404).json({ message: 'Nenhuma partida em andamento encontrada.' });
        }

        const idPartida = rowsPartida[0].id_partida;
        const scoreAtual = rowsPartida[0].score_partida;

        // Encerrar partida como abandono e atualizar score máximo
        await exports.encerrarPartida(idPartida, scoreAtual);

        return res.status(200).json({
            message: 'Partida abandonada com sucesso.',
            id_partida: idPartida
        });
    } catch (err) {
        console.error('Erro ao deletar partida:', err);
        return res.status(500).json({ message: 'Erro ao deletar partida.' });
    }
};

exports.encerrarPartida = async (idPartida, scoreFinal) => {
    try {
        // A trigger 'atualizar_score_maximo_usuario' atualizará o score_usuario automaticamente
        await db.query(
            'UPDATE partida SET status_partida = ?, score_partida = ? WHERE id_partida = ?',
            ['concluida', scoreFinal, idPartida]
        );
        
        return { success: true };
    } catch (err) {
        console.error('Erro ao encerrar partida:', err);
        return { success: false, error: err.message };
    }
};