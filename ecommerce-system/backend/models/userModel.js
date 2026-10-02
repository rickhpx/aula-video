const db = require('./db');

const findById = (id) => db.prepare('SELECT * FROM users WHERE id = ?').get(id);

const findByEmail = (email) => db.prepare('SELECT * FROM users WHERE email = ?').get(email);

const count = () => db.prepare('SELECT COUNT(*) AS count FROM users').get().count;

function create({ name, email, passwordHash, role }) {
  const { lastInsertRowid } = db
    .prepare('INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)')
    .run(name, email, passwordHash, role);
  return findById(lastInsertRowid);
}

// Dados que podem ir para o front-end (sem a senha)
const toPublic = ({ id, name, email, role }) => ({ id, name, email, role });

module.exports = { findById, findByEmail, count, create, toPublic };
