const express = require('express');
const bcrypt = require('bcrypt');
const router = express.Router();

const ROUNDS = 10;

// Importar o arquivo de usuários estáticos
let usuarios_estaticos = require('../static_user.json');

// Rota de Login
router.post('/login', async (req, res) => {
    const { nome_usuario, senha_usuario } = req.body;
    const usuario = usuarios_estaticos.find(u => u.nome_usuario === nome_usuario);
    if (!usuario) {
        return res.status(401).json({ message: 'Nome de usuário ou senha incorretos' });
    }
    const senhaValida = await bcrypt.compare(senha_usuario, usuario.senha_usuario);
    if (senhaValida) {
        // Configurar cookie com o token
        res.cookie('token_usuario', usuario.token_usuario, {
            httpOnly: true,
            secure: false,
            sameSite: 'lax',
            maxAge: 24 * 60 * 60 * 1000 // 24 horas
        });
        res.status(200).json({ message: 'Login bem-sucedido', token_usuario: usuario.token_usuario });
    } else {
        res.status(401).json({ message: 'Nome de usuário ou senha incorretos' });
    }
});

// Rota de Cadastro
router.post('/register', async (req, res) => {
    const { nome_usuario, senha_usuario, foto_usuario } = req.body;
    if (!nome_usuario || !senha_usuario) {
        return res.status(400).json({ message: 'Nome de usuário e senha são obrigatórios' });
    }
    const existe = usuarios_estaticos.find(u => u.nome_usuario === nome_usuario);
    if (existe) {
        return res.status(409).json({ message: 'Nome de usuário já existe' });
    }
    const maxId = usuarios_estaticos.reduce((max, u) => (u.id_usuario > max ? u.id_usuario : max), 0);
    const id_usuario = maxId + 1;
    const token_usuario = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 11)}`;
    
    // Hash da senha antes de armazenar
    const senhaHash = await bcrypt.hash(senha_usuario, ROUNDS);
    
    const novoUsuario = {
        id_usuario,
        nome_usuario,
        senha_usuario: senhaHash,
        score_usuario: 0,
        foto_usuario: foto_usuario || '/img/usuario.png',
        token_usuario
    };
    usuarios_estaticos.push(novoUsuario);
    
    // Configurar cookie com o token
    res.cookie('token_usuario', token_usuario, {
        httpOnly: true,
        secure: false, // Mude para true em produção com HTTPS
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 dias
    });
    
    res.status(201).json({ message: 'Registro bem-sucedido', token_usuario, usuario: novoUsuario });
});

// Rota de Logout
router.post('/logout', (req, res) => {
    res.clearCookie('token_usuario');
    res.status(200).json({ message: 'Logout realizado com sucesso' });
});

module.exports = router;