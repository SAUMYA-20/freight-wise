const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'zod-dev-secret-change-in-production';
const MANAGER_API_TOKEN = process.env.MANAGER_API_TOKEN;

function requireManager(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  const apiToken = req.headers['x-manager-token'];

  if (MANAGER_API_TOKEN && apiToken === MANAGER_API_TOKEN) {
    req.user = { role: 'manager', name: 'API Manager' };
    return next();
  }

  if (bearerToken) {
    try {
      const decoded = jwt.verify(bearerToken, JWT_SECRET);
      if (['manager', 'admin'].includes(decoded.role)) {
        req.user = decoded;
        return next();
      }
    } catch {
      return res.status(401).json({ error: 'Invalid or expired token.' });
    }
  }

  return res.status(401).json({ error: 'Manager authentication required.' });
}

function signManagerToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '8h' });
}

module.exports = { requireManager, signManagerToken, JWT_SECRET };
