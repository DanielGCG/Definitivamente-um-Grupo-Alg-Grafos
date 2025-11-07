const express = require('express');
const router = express.Router();

router.get('', (req, res) => {
    const locals = {
        title: "Jogo da Fofoca",
        description: "Venha descobrir quem é o fofoqueiro!",
    }
    // index.ejs is located under views/pages/index.ejs
    res.render('pages/index', { locals: locals });
});

module.exports = router;