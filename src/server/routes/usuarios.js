const express = require('express');
const router = express.Router();
const controller = require('../controllers/usuariosController');

// Rotas para gerenciamento de usuários
router.get('/', controller.listarUsuariosRanking);
router.post('/register', controller.criarUsuario);
router.put('/', controller.atualizarUsuario);
router.put('/password/self', controller.alterarSenha);
router.post('/login', controller.loginUsuario);
router.get('/search', controller.listarUsuariosPorNome);

// Rotas para gerenciamento de amigos
router.get('/friends', controller.listarAmigos);
router.post('/friends', controller.adicionarAmigo);
router.delete('/friends/:id', controller.removerAmigo);

module.exports = router;