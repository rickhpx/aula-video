const bcrypt = require('bcryptjs');
const userModel = require('../models/userModel');
const { createToken } = require('../middleware/auth');

function register(req, res) {
  const { name, email, password } = req.body;
  if (!name || !email || !password || password.length < 6) {
    return res.status(400).json({ error: 'Informe name, email e password (mínimo 6 caracteres)' });
  }
  if (userModel.findByEmail(email)) {
    return res.status(409).json({ error: 'E-mail já cadastrado' });
  }

  // O primeiro usuário cadastrado vira administrador
  const role = userModel.count() === 0 ? 'admin' : 'customer';
  const user = userModel.create({ name, email, passwordHash: bcrypt.hashSync(password, 10), role });
  res.status(201).json({ user: userModel.toPublic(user), token: createToken(user) });
}

function login(req, res) {
  const { email, password } = req.body;
  const user = userModel.findByEmail(email);
  if (!user || !bcrypt.compareSync(password || '', user.password_hash)) {
    return res.status(401).json({ error: 'E-mail ou senha incorretos' });
  }
  res.json({ user: userModel.toPublic(user), token: createToken(user) });
}

function me(req, res) {
  const user = userModel.findById(req.user.id);
  if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });
  res.json(userModel.toPublic(user));
}

module.exports = { register, login, me };
