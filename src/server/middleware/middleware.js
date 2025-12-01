const db = require('../db/database');

// Middleware para adicionar status de autenticação a todas as rotas
const checkAuthStatus = async (req, res, next) => {
    const token = req.cookies?.token_usuario;
    
    // Rotas públicas que não requerem autenticação
    const rotasPublicas = ['/login', '/register'];
    const isRotaPublica = rotasPublicas.includes(req.path);
    
    if (token) {
        try {
            // Verificar se o token é válido no banco de dados
            const [rows] = await db.query('SELECT id_usuario, nome_usuario, foto_usuario, score_usuario FROM Usuario WHERE token_usuario = ? LIMIT 1', [token]);
            
            if (rows.length > 0) {
                const usuario = rows[0];

                res.locals.isAuthenticated = true;
                res.locals.token = token;
                res.locals.usuario = usuario;
                next();
            } else {
                // Token inválido, limpar cookie e redirecionar para login
                res.clearCookie('token_usuario');
                return res.redirect('/login');
            }
        } catch (err) {
            console.error('Erro ao verificar token:', err);
            res.clearCookie('token_usuario');
            return res.redirect('/login');
        }
    } else {
        // Sem token: permitir apenas rotas públicas
        res.locals.isAuthenticated = false;
        res.locals.token = null;
        res.locals.usuario = null;
        
        if (isRotaPublica) {
            next();
        } else {
            return res.redirect('/login');
        }
    }
};

module.exports = {
    checkAuthStatus
};