// Importar usuários estáticos para validação de token
const usuarios_estaticos = require('../static_user.json');

// Middleware para adicionar status de autenticação a todas as rotas
const checkAuthStatus = (req, res, next) => {
    const token = req.cookies?.token_usuario;
    
    if (token) {
        // Verificar se o token é válido
        const usuario = usuarios_estaticos.find(u => u.token_usuario === token);
        
        if (usuario) {
            // Não expor a senha para as views/responses: criar cópia sem `senha_usuario`
            const { senha_usuario, ...usuario_sem_senha } = usuario;

            res.locals.isAuthenticated = true;
            res.locals.token = token;
            res.locals.usuario = usuario_sem_senha;
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
    checkAuthStatus
};