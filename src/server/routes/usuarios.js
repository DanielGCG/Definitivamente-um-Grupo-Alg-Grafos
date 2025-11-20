const express = require('express');
const router = express.Router();
const controller = require('../controllers/usuariosController');

router.get('/', controller.listarUsuariosRanking);
router.post('/register', controller.criarUsuario);
router.put('/', controller.atualizarUsuario);
router.post('/login', controller.loginUsuario);

module.exports = router;