const express = require('express');
const router = express.Router();
const controller = require('../controllers/usuariosController');

router.get('/ranking', controller.listarUsuariosRanking);
router.post('/register', controller.criarUsuario);
router.put('/', controller.atualizarUsuario);
router.put('/password/self', controller.alterarSenha);
router.post('/login', controller.loginUsuario);
router.get('/search', controller.listarUsuariosPorNome);
router.get('/', controller.obterUsuarioPorId);

module.exports = router;