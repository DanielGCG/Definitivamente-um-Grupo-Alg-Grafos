const express = require('express');
const router = express.Router();

router.get('/profile/:id', (req, res) => {
    // Lógica para retornar o perfil do usuário com base no id
});

router.put('/profile/self', (req, res) => {
    // Lógica para atualizar o perfil do usuário com base no cookie
});

router.put('/password/self', (req, res) => {
    // Lógica para atualizar a senha do usuário com base no cookie
});

module.exports = router;