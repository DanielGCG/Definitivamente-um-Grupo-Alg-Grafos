require('dotenv').config();
const path = require('path');
const express = require('express');
const expressLayout = require('express-ejs-layouts');
const cors = require('cors');
const cookieParser = require('cookie-parser');

const app = express();
const PORT = process.env.PORTA || 3000;

app.use(cors());
app.use(express.json());
app.use(cookieParser());

app.use(expressLayout);
app.set('layout', './layouts/main');
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(express.static('public'));

// Rota de Autenticação
app.use('/API/user/', require('./server/routes/usuarios'));

// Rota de Gerenciamento da Seção de Jogo
app.use('/API/gameSection/', require('./server/routes/gameSection'));

// Rota de API
//app.use('/api/', require('./server/routes/api'));

// Rota principal
app.use('/', require('./server/routes/main'));

// Iniciar o servidor
const server = app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});

// Tratar encerramento de processo para liberar a porta
const shutdown = () => {
    console.log('Encerrando servidor...');
    server.close(() => {
        console.log('Servidor encerrado com sucesso.');
        process.exit(0);
    });
};

// Escutar sinais de interrupção e finalização do processo
process.on('SIGINT', shutdown); // Ctrl+C no terminal
process.on('SIGTERM', shutdown); // Finalização pelo sistema