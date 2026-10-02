const express = require('express');
const db = require('../data/db');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

const findProduct = (id) => db.prepare('SELECT * FROM products WHERE id = ?').get(id);

router.get('/', (req, res) => {
  res.json(db.prepare('SELECT * FROM products').all());
});

router.get('/:id', (req, res) => {
  const product = findProduct(Number(req.params.id));
  if (!product) return res.status(404).json({ error: 'Produto não encontrado' });
  res.json(product);
});

router.post('/', requireAdmin, (req, res) => {
  const { name, price, stock = 0 } = req.body;
  if (!name || typeof price !== 'number' || price <= 0) {
    return res.status(400).json({ error: 'Informe name e price (número positivo)' });
  }
  const { lastInsertRowid } = db
    .prepare('INSERT INTO products (name, price, stock) VALUES (?, ?, ?)')
    .run(name, price, stock);
  res.status(201).json(findProduct(lastInsertRowid));
});

router.put('/:id', requireAdmin, (req, res) => {
  const product = findProduct(Number(req.params.id));
  if (!product) return res.status(404).json({ error: 'Produto não encontrado' });
  const { name = product.name, price = product.price, stock = product.stock } = req.body;
  db.prepare('UPDATE products SET name = ?, price = ?, stock = ? WHERE id = ?')
    .run(name, price, stock, product.id);
  res.json(findProduct(product.id));
});

router.delete('/:id', requireAdmin, (req, res) => {
  const { changes } = db.prepare('DELETE FROM products WHERE id = ?').run(Number(req.params.id));
  if (changes === 0) return res.status(404).json({ error: 'Produto não encontrado' });
  res.status(204).end();
});

module.exports = router;
