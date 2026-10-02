const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../data/db');
const { createToken, requireAuth } = require('../middleware/auth');

const router = express.Router();

const publicUser = ({ id, name, email, role }) => ({ id, name, email, role });

router.post('/register', (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password || password.length < 6) {
    return res.status(400).json({ error: 'Informe name, email e password (mínimo 6 caracteres)' });
  }
  if (db.prepare('SELECT id FROM users WHERE email = ?').get(email)) {
    return res.status(409).json({ error: 'E-mail já cadastrado' });
  }

  // O primeiro usuário cadastrado vira administrador
  const { count } = db.prepare('SELECT COUNT(*) AS count FROM users').get();
  const role = count === 0 ? 'admin' : 'customer';

  const { lastInsertRowid } = db
    .prepare('INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)')
    .run(name, email, bcrypt.hashSync(password, 10), role);
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(lastInsertRowid);
  res.status(201).json({ user: publicUser(user), token: createToken(user) });
});

router.post('/login', (req, res) => {
  const { email, password } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user || !bcrypt.compareSync(password || '', user.password_hash)) {
    return res.status(401).json({ error: 'E-mail ou senha incorretos' });
  }
  res.json({ user: publicUser(user), token: createToken(user) });
});

router.get('/me', requireAuth, (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });
  res.json(publicUser(user));
});

module.exports = router;
