const express = require('express');
const db = require('../data/db');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

const findProduct = (id) => db.prepare('SELECT * FROM products WHERE id = ?').get(id);

// Lista com filtros opcionais: /products?q=cami&category=Roupas&minPrice=10&maxPrice=100
router.get('/', (req, res) => {
  const { q, category, minPrice, maxPrice } = req.query;
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
  res.json(db.prepare(`SELECT * FROM products ${filter} ORDER BY name`).all(...params));
});

// Categorias existentes (para montar o filtro no site)
router.get('/categories', (req, res) => {
  const rows = db.prepare('SELECT DISTINCT category FROM products ORDER BY category').all();
  res.json(rows.map((r) => r.category));
});

router.get('/:id', (req, res) => {
  const product = findProduct(Number(req.params.id));
  if (!product) return res.status(404).json({ error: 'Produto não encontrado' });
  res.json(product);
});

router.post('/', requireAdmin, (req, res) => {
  const { name, price, stock = 0, category } = req.body;
  if (!name || typeof price !== 'number' || price <= 0) {
    return res.status(400).json({ error: 'Informe name e price (número positivo)' });
  }
  const { lastInsertRowid } = db
    .prepare('INSERT INTO products (name, price, stock, category) VALUES (?, ?, ?, ?)')
    .run(name, price, stock, category?.trim() || 'Geral');
  res.status(201).json(findProduct(lastInsertRowid));
});

router.put('/:id', requireAdmin, (req, res) => {
  const product = findProduct(Number(req.params.id));
  if (!product) return res.status(404).json({ error: 'Produto não encontrado' });
  const {
    name = product.name,
    price = product.price,
    stock = product.stock,
    category = product.category,
  } = req.body;
  db.prepare('UPDATE products SET name = ?, price = ?, stock = ?, category = ? WHERE id = ?')
    .run(name, price, stock, category, product.id);
  res.json(findProduct(product.id));
});

router.delete('/:id', requireAdmin, (req, res) => {
  const { changes } = db.prepare('DELETE FROM products WHERE id = ?').run(Number(req.params.id));
  if (changes === 0) return res.status(404).json({ error: 'Produto não encontrado' });
  res.status(204).end();
});

module.exports = router;
