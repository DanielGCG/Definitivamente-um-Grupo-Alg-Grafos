const express = require('express');
const router = express.Router();

router.get('', (req, res) => {
    const locals = {
        title: "Jogo da Fofoca",
        description: "Venha descobrir quem é o fofoqueiro!",
    }
    res.render('pages/index', { locals: locals });
});

router.get('/play', (req, res) => {
    const locals = {
        title: "Jogo da Fofoca - Jogar",
        description: "Entre no jogo e descubra quem é o fofoqueiro!",
    }
    res.render('pages/play', { locals: locals });
});

router.get('/how-to-play', (req, res) => {
    const locals = {
        title: "Jogo da Fofoca - Como Jogar",
        description: "Aprenda as regras e como jogar o Jogo da Fofoca.",
    }
    res.render('pages/how-to-play', { locals: locals });
});

router.get('/about', (req, res) => {
    const locals = {
        title: "Jogo da Fofoca - Sobre",
        description: "Saiba mais sobre o Jogo da Fofoca e como jogar.",
    }
    res.render('pages/about', { locals: locals });
});

module.exports = router;