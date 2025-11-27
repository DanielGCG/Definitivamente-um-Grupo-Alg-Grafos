const bcrypt = require('bcrypt');
const { v4: uuidgen } = require('uuid');
const db = require('../db/database');
const ROUNDS = 10;

exports.listarUsuariosRanking = async (req, res) => {
    try {
        const [rows] = await db.query('SELECT id_usuario, nome_usuario FROM usuario ORDER BY score_usuario DESC LIMIT 10');
        res.json(rows);
    } catch (err) {
        console.error('Erro ao listar usuários por ranking:', err);
        res.status(500).json({ message: 'Erro no banco de dados.' });
    }
};

exports.criarUsuario = async (req, res) => {
    try {
        const { nome_usuario, senha_usuario,foto_usuario  } = req.body;

        if (!nome_usuario || !senha_usuario) {
<<<<<<< Updated upstream
            return res.status(400).json({ message: 'Nome de usuário e senha são obrigatórios.' });
=======
            return res.status(400).json({ message: 'Nome de usuário e senha são obrigatórios. Tente novamente!' });
>>>>>>> Stashed changes
        }
        if (typeof nome_usuario !== 'string' || typeof senha_usuario !== 'string') {
            return res.status(400).json({ message: 'Formato de nome ou senha inválidos. Tente novamente!' });
        }
        if (nome_usuario.length < 3 || senha_usuario.length < 5) {
<<<<<<< Updated upstream
            return res.status(400).json({ message: 'Utilize no mínimo 3 caracteres para o nome e 5 caracteres para a senha.' });
=======
            return res.status(400).json({ message: 'Nome mínimo 3 caracteres; senha mínimo 5 caracteres' });
>>>>>>> Stashed changes
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