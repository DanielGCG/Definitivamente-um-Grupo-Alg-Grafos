const express = require('express');
const router = express.Router();
const controller = require('../controllers/usuariosController');

router.get('/', controller.listarUsuarios);
router.post('/', controller.criarUsuario);

module.exports = router;