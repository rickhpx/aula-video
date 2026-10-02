const path = require('path');
const { DatabaseSync } = require('node:sqlite');

// Banco SQLite salvo em disco: os dados continuam após reiniciar o servidor
const db = new DatabaseSync(
  process.env.DB_PATH || path.join(__dirname, '..', '..', 'ecommerce.db')
);

db.exec('PRAGMA foreign_keys = ON');

// Migração: versões antigas tinham um carrinho único, sem usuário.
// O carrinho é temporário, então recriamos a tabela no formato novo.
const cartColumns = db.prepare('PRAGMA table_info(cart_items)').all();
if (cartColumns.length > 0 && !cartColumns.some((c) => c.name === 'user_id')) {
  db.exec('DROP TABLE cart_items');
}

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'customer'
  );

  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    price REAL NOT NULL,
    stock INTEGER NOT NULL DEFAULT 0,
    category TEXT NOT NULL DEFAULT 'Geral'
  );

  CREATE TABLE IF NOT EXISTS cart_items (
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL,
    PRIMARY KEY (user_id, product_id)
  );

  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER REFERENCES users(id),
    total REAL NOT NULL,
    status TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS order_items (
    order_id INTEGER NOT NULL REFERENCES orders(id),
    product_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    price REAL NOT NULL,
    quantity INTEGER NOT NULL
  );
`);

// Migração: pedidos antigos não tinham dono
const orderColumns = db.prepare('PRAGMA table_info(orders)').all();
if (!orderColumns.some((c) => c.name === 'user_id')) {
  db.exec('ALTER TABLE orders ADD COLUMN user_id INTEGER REFERENCES users(id)');
}

// Migração: produtos antigos não tinham categoria
const productColumns = db.prepare('PRAGMA table_info(products)').all();
if (!productColumns.some((c) => c.name === 'category')) {
  db.exec("ALTER TABLE products ADD COLUMN category TEXT NOT NULL DEFAULT 'Geral'");
}

// Produtos de exemplo, inseridos só na primeira vez
const { count } = db.prepare('SELECT COUNT(*) AS count FROM products').get();
if (count === 0) {
  const insert = db.prepare('INSERT INTO products (name, price, stock, category) VALUES (?, ?, ?, ?)');
  insert.run('Camiseta', 59.9, 20, 'Roupas');
  insert.run('Calça Jeans', 149.9, 10, 'Roupas');
  insert.run('Tênis', 299.9, 5, 'Calçados');
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
