const bcrypt = require('bcrypt');
const { v4: uuidgen } = require('uuid');
const db = require('../db/database');
const ROUNDS = 10;

exports.listarUsuarios = async (req, res) => {
    try {
        const [rows] = await db.query('SELECT id_usuario, nome_usuario FROM usuario');
        res.json(rows);
    } catch (err) {
        console.error('Erro ao listar usuários:', err);
        res.status(500).json({ message: 'Erro no banco de dados' });
    }
};

exports.criarUsuario = async (req, res) => {
    try {
        const { nome_usuario, senha_usuario,foto_usuario  } = req.body;

        if (!nome_usuario || !senha_usuario) {
            return res.status(400).json({ message: 'Nome de usuário e senha são obrigatórios' });
        }
        if (typeof nome_usuario !== 'string' || typeof senha_usuario !== 'string') {
            return res.status(400).json({ message: 'Formato inválido' });
        }
        if (nome_usuario.length < 3 || senha_usuario.length < 6) {
            return res.status(400).json({ message: 'Nome mínimo 3 caracteres; senha mínimo 5 caracteres' });
        }

        // checar duplicata
        const [existing] = await db.query('SELECT id_usuario FROM usuario WHERE nome_usuario = ? LIMIT 1', [nome_usuario]);
        if (existing.length > 0) {
            return res.status(409).json({ message: 'Nome de usuário já existe' });
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