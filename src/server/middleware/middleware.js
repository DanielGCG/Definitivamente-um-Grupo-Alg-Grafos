// Importar usuários estáticos para validação de token
const usuarios_estaticos = require('../static_user.json');

// Middleware para verificar se o usuário está autenticado
const verificarAutenticacao = (req, res, next) => {
    const token = req.cookies?.token_usuario;
    
    if (!token) {
        return res.redirect('/login');
    }
    
    // Verificar se o token existe na base de dados
    const usuario = usuarios_estaticos.find(u => u.token_usuario === token);
    
    if (!usuario) {
        // Token inválido ou expirado
        res.clearCookie('token_usuario');
        return res.redirect('/login');
    }
    
    res.locals.isAuthenticated = true;
    res.locals.token = token;
    res.locals.usuario = usuario;
    next();
};

// Middleware para adicionar status de autenticação a todas as rotas
const checkAuthStatus = (req, res, next) => {
    const token = req.cookies?.token_usuario;
    
    if (token) {
        // Verificar se o token é válido
        const usuario = usuarios_estaticos.find(u => u.token_usuario === token);
        
        if (usuario) {
            res.locals.isAuthenticated = true;
            res.locals.token = token;
            res.locals.usuario = usuario;
        } else {
            // Token inválido, limpar cookie
            res.clearCookie('token_usuario');
            res.locals.isAuthenticated = false;
            res.locals.token = null;
            res.locals.usuario = null;
        }
    } else {
        res.locals.isAuthenticated = false;
        res.locals.token = null;
        res.locals.usuario = null;
    }
    
    next();
};

module.exports = {
    verificarAutenticacao,
    checkAuthStatus
};