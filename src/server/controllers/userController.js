const bcrypt = require('bcrypt');
const { v4: uuidgen } = require('uuid');
const db = require('../db/database');
const ROUNDS = 10;

// Ranking de usuários pela quantidade de pontos no jogo
exports.listarUsuariosRanking = async (req, res) => {
    try {
        const [rows] = await db.query('SELECT id_usuario, nome_usuario, score_usuario, foto_usuario FROM usuario ORDER BY score_usuario DESC LIMIT 10');
        res.json(rows);
    } catch (err) {
        console.error('Erro ao listar usuários por ranking:', err);
        res.status(500).json({ message: 'Erro no banco de dados.' });
    }
};

// Lista usuários por nome
exports.listarUsuariosPorNome = async (req, res) => {
    try {
        const nomeBusca = (req.query.nome || req.query.q || '').trim();
        if (!nomeBusca) {
            return res.status(400).json({ message: 'Erro, nome é obrigatório.' });
        }

        const param = `%${nomeBusca}%`;
        // Se o usuário estiver autenticado, excluir ele próprio dos resultados
        const token_usuario = req.cookies?.token_usuario;
        if (token_usuario) {
            const [userRows] = await db.query('SELECT id_usuario FROM usuario WHERE token_usuario = ? LIMIT 1', [token_usuario]);
            if (userRows && userRows.length > 0) {
                const myId = userRows[0].id_usuario;
                const [rows] = await db.query(
                    'SELECT id_usuario, nome_usuario, foto_usuario FROM usuario WHERE nome_usuario LIKE ? AND id_usuario <> ? LIMIT 10',
                    [param, myId]
                );
                return res.status(200).json(rows);
            }
        }

        const [rows] = await db.query(
            'SELECT id_usuario, nome_usuario, foto_usuario FROM usuario WHERE nome_usuario LIKE ? LIMIT 10',
            [param]
        );

        return res.status(200).json(rows);
    } catch (err) {
        console.error('Erro ao listar usuários por nome:', err);
        return res.status(500).json({ message: 'Erro no banco de dados.' });
    }
};


// Cria novo usuário
exports.criarUsuario = async (req, res) => {
    try {
        const { nome_usuario, senha_usuario,foto_usuario  } = req.body;

        if (!nome_usuario || !senha_usuario) {
            return res.status(400).json({ message: 'Nome de usuário e senha são obrigatórios. Tente novamente!' });
        }
        if (typeof nome_usuario !== 'string' || typeof senha_usuario !== 'string') {
            return res.status(400).json({ message: 'Formato de nome ou senha inválidos. Tente novamente!' });
        }
        if (nome_usuario.length < 3 || senha_usuario.length < 5) {
            return res.status(400).json({ message: 'Utilize no mínimo 3 caracteres para o nome e 5 caracteres para a senha.' });
        }

        // checar duplicata
        const [existing] = await db.query('SELECT id_usuario FROM usuario WHERE nome_usuario = ? LIMIT 1', [nome_usuario]);
        if (existing.length > 0) {
            return res.status(409).json({ message: 'Nome de usuário já existe. Tente novamente!' });
        }
        
        const senhaHash = await bcrypt.hash(senha_usuario, ROUNDS); //Encriptação da senha
        const token_usuario =  uuidgen(); // Gera um UUID único para o token do usuário

        // Foto default definida para o usuário recém-criado
        let foto = '/img/usuario.png';

        const insertSql = `INSERT INTO usuario (token_usuario, nome_usuario, senha_usuario, foto_usuario)
                                             VALUES (?, ?, ?, ?)`;
        const [result] = await db.query(insertSql, [token_usuario, nome_usuario, senhaHash, foto]);

        res.cookie('token_usuario', token_usuario, {
            httpOnly: true,
            secure: false,
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000
        });

        return res.status(201).json({
            message: 'Registro bem-sucedido',
            usuario: {
                id_usuario: result.insertId,
                nome_usuario,
                score_usuario: 0,
                foto_usuario: foto,
                token_usuario
            }
        });
    } catch (err) {
        console.error('Erro ao criar usuário:', err);
        return res.status(500).json({ message: 'Erro interno' });
    }
};

// Atualiza nome e foto dos usuários logados
exports.atualizarUsuario = async (req, res) => {
    try {
        // Identificar token pelo cookie
        const token_usuario = req.cookies?.token_usuario;
        const nome_usuario = req.body.nome_usuario;
        const foto_usuario = req.body.foto_usuario;

        if (!token_usuario) return res.status(400).json({ message: 'Token de usuário é necessário' });

        // localizar usuário pelo token
        const [rows] = await db.query('SELECT id_usuario, nome_usuario, foto_usuario FROM usuario WHERE token_usuario = ? LIMIT 1', [token_usuario]);
        if (!rows || rows.length === 0) {
            return res.status(404).json({ message: 'Token inválido. Tente novamente!' });
        }
        const usuario = rows[0];


        if (!nome_usuario && !foto_usuario) {
            return res.status(400).json({ message: 'Nenhum campo para atualizar.' });
        }

        const updates = [];
        const params = [];

        // Se for alterar nome, checar duplicata
        if (nome_usuario) {
            const [exist] = await db.query('SELECT id_usuario FROM usuario WHERE nome_usuario = ? LIMIT 1', [nome_usuario]);
            if (exist.length > 0 && exist[0].id_usuario !== usuario.id_usuario) {
                return res.status(409).json({ message: 'Nome de usuário já em uso. Tente outro!' });
            }
            updates.push('nome_usuario = ?');
            params.push(nome_usuario);
        }

        // Se for alterar foto
        if (foto_usuario) {
            updates.push('foto_usuario = ?');
            params.push(foto_usuario);
        }

        // montar query dinâmica
        params.push(token_usuario); // WHERE token_usuario = ?
        const sql = `UPDATE usuario SET ${updates.join(', ')} WHERE token_usuario = ?`;
        await db.query(sql, params);

        // retornar usuário atualizado (sem senha)
        const [updatedRows] = await db.query('SELECT id_usuario, nome_usuario, foto_usuario FROM usuario WHERE token_usuario = ? LIMIT 1', [token_usuario]);
        return res.status(200).json({ message: 'Usuário atualizado!', usuario: updatedRows[0] });
    } catch (err) {
        console.error('Erro ao atualizar usuário:', err);
        return res.status(500).json({ message: 'Erro interno.' });
    }
};


// Login de usuário
exports.loginUsuario = async (req, res) => {
    try {
        const { nome_usuario, senha_usuario } = req.body;

        if (!nome_usuario || !senha_usuario) {
            return res.status(400).json({ message: 'Nome de usuário e senha são obrigatórios.' });
        }

        // localizar usuário pelo nome
        const [rows] = await db.query('SELECT id_usuario, nome_usuario, senha_usuario, foto_usuario FROM usuario WHERE nome_usuario = ? LIMIT 1', [nome_usuario]);
        if (!rows || rows.length === 0) {
            return res.status(401).json({ message: 'Nome de usuário ou senha incorretos.' });
        }

        const user = rows[0];

        // comparar senha
        const senhaValida = await bcrypt.compare(senha_usuario, user.senha_usuario);
        if (!senhaValida) {
            return res.status(401).json({ message: 'Nome de usuário ou senha incorretos.' });
        }

        // gerar novo token de sessão e atualizar no banco
        const novoToken = uuidgen();
        await db.query('UPDATE usuario SET token_usuario = ? WHERE id_usuario = ?', [novoToken, user.id_usuario]);

        // setar cookie httpOnly
        res.cookie('token_usuario', novoToken, {
            httpOnly: true,
            secure: false, // em produção: true com HTTPS
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000
        });

        // retornar dados do usuário sem senha
        return res.status(200).json({
            message: 'Login bem-sucedido',
            usuario: {
                id_usuario: user.id_usuario,
                nome_usuario: user.nome_usuario,
                foto_usuario: user.foto_usuario,
                token_usuario: novoToken
            }
        });
    } catch (err) {
        console.error('Erro no login do usuário:', err);
        return res.status(500).json({ message: 'Erro interno.' });
    }
}

// Altera senha de usuário logado
exports.alterarSenha = async (req, res) => {
    try {
        const token_usuario = req.cookies?.token_usuario;
        if (!token_usuario) return res.status(401).json({ message: 'Não autenticado.' });

        const { currentPassword, newPassword } = req.body;
        if (!currentPassword || !newPassword) return res.status(400).json({ message: 'Senha atual e nova senha são obrigatórias.' });
        if (typeof newPassword !== 'string' || newPassword.length < 5) return res.status(400).json({ message: 'A nova senha precisa ter no mínimo 5 caracteres.' });

        // buscar usuário pelo token
        const [rows] = await db.query('SELECT id_usuario, senha_usuario FROM usuario WHERE token_usuario = ? LIMIT 1', [token_usuario]);
        if (!rows || rows.length === 0) return res.status(404).json({ message: 'Usuário não encontrado.' });
        const user = rows[0];

        // verificar senha atual
        const senhaValida = await bcrypt.compare(currentPassword, user.senha_usuario);
        if (!senhaValida) return res.status(401).json({ message: 'Senha atual incorreta.' });

        // hashear nova senha e gerar novo token (invalida sessões antigas)
        const novaHash = await bcrypt.hash(newPassword, ROUNDS);
        const novoToken = uuidgen();
        await db.query('UPDATE usuario SET senha_usuario = ?, token_usuario = ? WHERE id_usuario = ?', [novaHash, novoToken, user.id_usuario]);

        // setar novo cookie
        res.cookie('token_usuario', novoToken, {
            httpOnly: true,
            secure: false,
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000
        });

        return res.status(200).json({ message: 'Senha alterada com sucesso.' });
    } catch (err) {
        console.error('Erro ao alterar senha:', err);
        return res.status(500).json({ message: 'Erro interno.' });
    }
};

// Logout de usuário
exports.logoutUsuario = async (req, res) => {
    try {
        const token_usuario = req.cookies?.token_usuario;
        
        if (token_usuario) {
            // Invalidar o token do usuário no banco gerando um novo
            const novoToken = uuidgen();
            await db.query('UPDATE usuario SET token_usuario = ? WHERE token_usuario = ?', [novoToken, token_usuario]);
        }

        // Limpar cookie
        res.clearCookie('token_usuario');
        
        return res.status(200).json({ message: 'Logout realizado com sucesso.' });
    } catch (err) {
        console.error('Erro ao fazer logout:', err);
        // Mesmo com erro, limpar o cookie
        res.clearCookie('token_usuario');
        return res.status(500).json({ message: 'Erro interno, mas sessão foi limpa.' });
    }
};

// Lista amigos do usuário logado (bidirecional)
exports.listarAmigos = async (req, res) => {
    try {
        const token_usuario = req.cookies?.token_usuario;
        if (!token_usuario)
            return res.status(401).json({ message: 'Não autenticado.' });

        const [rowsUser] = await db.query(
            'SELECT id_usuario FROM usuario WHERE token_usuario = ? LIMIT 1',
            [token_usuario]
        );

        if (!rowsUser.length)
            return res.status(404).json({ message: 'Usuário não encontrado.' });

        const userId = rowsUser[0].id_usuario;

        // pega apenas amizades recíprocas
        const [rows] = await db.query(
            `SELECT u.id_usuario, u.nome_usuario, u.foto_usuario, u.score_usuario
             FROM Amizade a1
             JOIN Amizade a2 
                 ON a1.fk_Usuario_id_usuario = a2.fk_Usuario_id_usuario_
                AND a1.fk_Usuario_id_usuario_ = a2.fk_Usuario_id_usuario
             JOIN usuario u 
                 ON u.id_usuario = a1.fk_Usuario_id_usuario_
             WHERE a1.fk_Usuario_id_usuario = ?`,
            [userId]
        );

        return res.status(200).json(rows);

    } catch (err) {
        console.error('Erro ao listar amigos:', err);
        return res.status(500).json({ message: 'Erro interno.' });
    }
};

// Adiciona amigo utilizando o id
exports.adicionarAmigo = async (req, res) => {
    try {
        const token_usuario = req.cookies?.token_usuario;
        if (!token_usuario)
            return res.status(401).json({ message: 'Não autenticado.' });

        const { friendId } = req.body;
        if (!friendId)
            return res.status(400).json({ message: 'ID do amigo é obrigatório.' });

        // localizar usuário atual
        const [rowsUser] = await db.query(
            'SELECT id_usuario FROM usuario WHERE token_usuario = ? LIMIT 1',
            [token_usuario]
        );
        if (!rowsUser || rowsUser.length === 0)
            return res.status(404).json({ message: 'Usuário não encontrado.' });

        const userId = rowsUser[0].id_usuario;

        // Impedir auto-amizade
        if (userId === friendId)
            return res.status(400).json({ message: 'Você não pode se adicionar.' });

        // checar se o friendId existe
        const [friendRows] = await db.query(
            'SELECT id_usuario, nome_usuario, foto_usuario, score_usuario FROM usuario WHERE id_usuario = ? LIMIT 1',
            [friendId]
        );
        if (!friendRows || friendRows.length === 0)
            return res.status(404).json({ message: 'Usuário alvo não encontrado.' });

        const friend = friendRows[0];

        // Verificar se já existe amizade (evita duplicata)
        const [checkRows] = await db.query(
            `SELECT 1 FROM Amizade
             WHERE fk_Usuario_id_usuario = ? AND fk_Usuario_id_usuario_ = ?
             LIMIT 1`,
            [userId, friendId]
        );

        if (checkRows.length > 0)
            return res.status(409).json({ message: 'Pedido de amizade já enviado.' });

        // Inserir relação de amizade (unidirecional)
        await db.query(
            'INSERT INTO Amizade (fk_Usuario_id_usuario, fk_Usuario_id_usuario_) VALUES (?, ?)',
            [userId, friendId]
        );

        return res.status(201).json({
            message: 'Pedido de amizade enviado.',
            friend
        });

    } catch (err) {
        console.error('Erro ao adicionar amigo:', err);
        return res.status(500).json({ message: 'Erro interno.' });
    }
};

// Remove amigo para o usuário logado (bidirecional)
exports.removerAmigo = async (req, res) => {
    try {
        const token_usuario = req.cookies?.token_usuario;
        if (!token_usuario) 
            return res.status(401).json({ message: 'Não autenticado.' });

        const friendId = req.params.id;
        if (!friendId) 
            return res.status(400).json({ message: 'ID do amigo é obrigatório.' });

        const [rowsUser] = await db.query(
            'SELECT id_usuario FROM usuario WHERE token_usuario = ? LIMIT 1',
            [token_usuario]
        );
        if (!rowsUser.length) 
            return res.status(404).json({ message: 'Usuário não encontrado.' });

        const userId = rowsUser[0].id_usuario;

        const [result] = await db.query(
            `DELETE FROM Amizade 
             WHERE 
                (fk_Usuario_id_usuario = ? AND fk_Usuario_id_usuario_ = ?) OR
                (fk_Usuario_id_usuario = ? AND fk_Usuario_id_usuario_ = ?)`,
            [userId, friendId, friendId, userId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Amizade não encontrada.' });
        }

        return res.status(200).json({ message: 'Amizade removida nos dois sentidos.' });

    } catch (err) {
        console.error('Erro ao remover amigo:', err);
        return res.status(500).json({ message: 'Erro interno.' });
    }
};