const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');

const ROOT = path.join(__dirname, '..', '..');
const DATABASE_DIR = path.join(ROOT, 'database');

// Banco SQLite salvo em disco: os dados continuam após reiniciar o servidor
const db = new DatabaseSync(process.env.DB_PATH || path.join(ROOT, 'ecommerce.db'));

db.exec('PRAGMA foreign_keys = ON');

const columnsOf = (table) => db.prepare(`PRAGMA table_info(${table})`).all().map((c) => c.name);

// Migração: versões antigas tinham um carrinho único, sem usuário.
// O carrinho é temporário, então recriamos a tabela no formato novo.
const cartColumns = columnsOf('cart_items');
if (cartColumns.length > 0 && !cartColumns.includes('user_id')) {
  db.exec('DROP TABLE cart_items');
}

// Cria as tabelas que ainda não existem (database/schema.sql)
db.exec(fs.readFileSync(path.join(DATABASE_DIR, 'schema.sql'), 'utf8'));

// Migrações: colunas que versões antigas do banco não tinham
if (!columnsOf('orders').includes('user_id')) {
  db.exec('ALTER TABLE orders ADD COLUMN user_id INTEGER REFERENCES users(id)');
}
const productColumns = columnsOf('products');
if (!productColumns.includes('category')) {
  db.exec("ALTER TABLE products ADD COLUMN category TEXT NOT NULL DEFAULT 'Geral'");
}
if (!productColumns.includes('description')) {
  db.exec("ALTER TABLE products ADD COLUMN description TEXT NOT NULL DEFAULT ''");
}

// Produtos de exemplo, inseridos só na primeira vez (database/seed.sql)
const { count } = db.prepare('SELECT COUNT(*) AS count FROM products').get();
if (count === 0) {
  db.exec(fs.readFileSync(path.join(DATABASE_DIR, 'seed.sql'), 'utf8'));
}

// Executa fn dentro de uma transação (tudo ou nada)
function transaction(fn) {
  db.exec('BEGIN');
  try {
    const result = fn();
    db.exec('COMMIT');
    return result;
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}

module.exports = db;
module.exports.transaction = transaction;
