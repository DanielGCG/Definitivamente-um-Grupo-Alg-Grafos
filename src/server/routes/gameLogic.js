const express = require('express');
const router = express.Router();
const gameLogicController = require('../controllers/gameLogicController');

// Verificar chute do jogador
router.post('/chute', gameLogicController.verificarChute);

// Solicitar dica (revela grafo)
router.post('/dica', gameLogicController.solicitarDica);

// Verificar se depoimento é verdade ou mentira
router.post('/verificarDepoimento', gameLogicController.verificarDepoimento);

module.exports = router;
