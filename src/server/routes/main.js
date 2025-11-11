const express = require('express');
const router = express.Router();

router.get('', (req, res) => {
    const locals = {
        title: "Jogo da Fofoca",
        section: "",
        description: "Venha descobrir quem é o fofoqueiro!",
    }
    res.render('pages/index', { locals: locals });
});

router.get('/play', (req, res) => {
    const locals = {
        title: "Jogo da Fofoca",
        section: "- Jogar",
        description: "Entre no jogo e descubra quem é o fofoqueiro!",
    }
    res.render('pages/game/game', { locals: locals });
});

router.get('/how-to-play', (req, res) => {
    const locals = {
        title: "Jogo da Fofoca",
        section: "- Como Jogar",
        description: "Aprenda as regras e como jogar o Jogo da Fofoca.",
    }
    res.render('pages/how-to-play', { locals: locals });
});

router.get('/how-it-works', (req, res) => {
    const locals = {
        title: "Jogo da Fofoca",
        section: "- Como Funciona",
        description: "Saiba mais sobre o funcionamento do Jogo da Fofoca.",
    }
    res.render('pages/how-it-works', { locals: locals });
});

router.get('/login', (req, res) => {
    const locals = {
        title: "Jogo da Fofoca",
        section: "- Login",
        description: "Faça login para acessar sua conta do Jogo da Fofoca.",
    }
    res.render('pages/register/login', { locals: locals });
});

router.get('/register', (req, res) => {
    const locals = {
        title: "Jogo da Fofoca",
        section: "- Registro",
        description: "Crie uma conta para jogar o Jogo da Fofoca.",
    }
    res.render('pages/register/register', { locals: locals });
});


module.exports = router;