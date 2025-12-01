const express = require('express');
const router = express.Router();
const { checkAuthStatus } = require('../middleware/middleware');

router.get('', checkAuthStatus, (req, res) => {
    const locals = {
        title: "Jogo da Fofoca",
        section: "",
        description: "Venha descobrir quem é o fofoqueiro!",
    }
    res.render('pages/index', { locals: locals });
});

router.get('/play', checkAuthStatus, (req, res) => {
    const locals = {
        title: "Jogo da Fofoca",
        section: "- Jogar",
        description: "Entre no jogo e descubra quem é o fofoqueiro!",
    }
    res.render('pages/game/game', { locals: locals });
});


router.get('/how-to-play', checkAuthStatus, (req, res) => {
    const locals = {
        title: "Jogo da Fofoca",
        section: "- Como Jogar",
        description: "Aprenda as regras e como jogar o Jogo da Fofoca.",
    }
    res.render('pages/how-to-play', { locals: locals });
});

router.get('/how-it-works', checkAuthStatus, (req, res) => {
    const locals = {
        title: "Jogo da Fofoca",
        section: "- Como Funciona",
        description: "Saiba mais sobre o funcionamento do Jogo da Fofoca.",
    }
    res.render('pages/how-it-works', { locals: locals });
});

router.get('/login', checkAuthStatus, (req, res) => {
    const locals = {
        title: "Jogo da Fofoca",
        section: "- Login",
        description: "Faça login para acessar sua conta do Jogo da Fofoca.",
    }
    res.render('pages/register/login', { locals: locals });
});

router.get('/register', checkAuthStatus, (req, res) => {
    const locals = {
        title: "Jogo da Fofoca",
        section: "- Registro",
        description: "Crie uma conta para jogar o Jogo da Fofoca.",
    }
    res.render('pages/register/register', { locals: locals });
});

router.get('/editarperfil', checkAuthStatus, (req, res) => {
    const locals = {
        title: "Jogo da Fofoca",
        section: "- Editar Perfil",
        description: "Altere seu nome de usuário, foto de perfil ou senha.",
    }
    res.render('pages/edit-profile', { locals: locals });
});

module.exports = router;