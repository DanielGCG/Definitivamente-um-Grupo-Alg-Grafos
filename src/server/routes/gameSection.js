const express = require('express');
const router = express.Router();
const controller = require('../controllers/gameSectionController');

// Rotas para gerenciamento da seção de jogo
router.post('/join', controller.joinGameSection);
router.post('/leave', controller.leaveGameSection);

module.exports = router;