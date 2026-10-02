const jwt = require('jsonwebtoken');

// Em produção, defina JWT_SECRET como variável de ambiente
const JWT_SECRET = process.env.JWT_SECRET || 'segredo-de-desenvolvimento';

function createToken(user) {
  return jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
}

// Exige o header "Authorization: Bearer <token>" e preenche req.user
function requireAuth(req, res, next) {
  const [type, token] = (req.headers.authorization || '').split(' ');
  if (type !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'Faça login para continuar' });
  }
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Token inválido ou expirado' });
  }
}

function requireAdmin(req, res, next) {
  requireAuth(req, res, () => {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Apenas administradores' });
    }
    next();
  });
}

module.exports = { createToken, requireAuth, requireAdmin };
