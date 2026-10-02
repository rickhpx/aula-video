const db = require('./db');

const findById = (id) => db.prepare('SELECT * FROM products WHERE id = ?').get(id);

// Lista com filtros opcionais: { q, category, minPrice, maxPrice }
function list({ q, category, minPrice, maxPrice } = {}) {
  const where = [];
  const params = [];

  if (q) {
    where.push('name LIKE ?');
    params.push(`%${q}%`);
  }
  if (category) {
    where.push('category = ?');
    params.push(category);
  }
  if (minPrice) {
    where.push('price >= ?');
    params.push(Number(minPrice));
  }
  if (maxPrice) {
    where.push('price <= ?');
    params.push(Number(maxPrice));
  }

  const filter = where.length ? `WHERE ${where.join(' AND ')}` : '';
  return db.prepare(`SELECT * FROM products ${filter} ORDER BY name`).all(...params);
}

const categories = () =>
  db.prepare('SELECT DISTINCT category FROM products ORDER BY category').all().map((r) => r.category);

function create({ name, price, stock, category, description }) {
  const { lastInsertRowid } = db
    .prepare('INSERT INTO products (name, price, stock, category, description) VALUES (?, ?, ?, ?, ?)')
    .run(name, price, stock, category, description);
  return findById(lastInsertRowid);
}

function update(id, { name, price, stock, category, description }) {
  db.prepare(
    'UPDATE products SET name = ?, price = ?, stock = ?, category = ?, description = ? WHERE id = ?'
  ).run(name, price, stock, category, description, id);
  return findById(id);
}

// Soma (ou subtrai, se negativo) uma quantidade ao estoque
const addStock = (id, amount) =>
  db.prepare('UPDATE products SET stock = stock + ? WHERE id = ?').run(amount, id);

const remove = (id) => db.prepare('DELETE FROM products WHERE id = ?').run(id).changes > 0;

module.exports = { findById, list, categories, create, update, addStock, remove };
