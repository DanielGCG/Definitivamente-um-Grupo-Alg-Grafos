const db = require('../db/database');

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
            'SELECT id_partida FROM partida WHERE fk_Usuario_id_usuario = ? AND status_partida = ? LIMIT 1',
            [userId, 'em_andamento']
        );
        
        // Se já existir uma partida em andamento, retorna a partida existente
        if (rowsPartida && rowsPartida.length > 0) {
            return res.status(200).json({ 
                message: 'Partida em andamento já existe.', 
                id_partida: rowsPartida[0].id_partida,
                isNew: false
            });
        }

        // Caso contrário, cria uma nova partida (AUTO_INCREMENT garante ID único)
        const [result] = await db.query(
            'INSERT INTO partida (fk_Usuario_id_usuario, status_partida, numRodadas_partida, score_partida) VALUES (?, ?, ?, ?)',
            [userId, 'em_andamento', 0, 0]
        );

        return res.status(201).json({
            message: 'Partida criada com sucesso.',
            id_partida: result.insertId,
            isNew: true
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
            'SELECT id_partida FROM partida WHERE fk_Usuario_id_usuario = ? AND status_partida = ? LIMIT 1',
            [userId, 'em_andamento']
        );

        if (!rowsPartida || rowsPartida.length === 0) {
            return res.status(404).json({ message: 'Nenhuma partida em andamento encontrada.' });
        }

        const idPartida = rowsPartida[0].id_partida;

        // Deletar a partida
        await db.query('DELETE FROM partida WHERE id_partida = ?', [idPartida]);

        return res.status(200).json({
            message: 'Partida deletada com sucesso.',
            id_partida: idPartida
        });
    } catch (err) {
        console.error('Erro ao deletar partida:', err);
        return res.status(500).json({ message: 'Erro ao deletar partida.' });
    }
};