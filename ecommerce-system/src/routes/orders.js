const express = require('express');
const db = require('../data/db');
const { transaction } = require('../data/db');
const { requireAuth } = require('../middleware/auth');
const { cartSummary } = require('./cart');

const router = express.Router();

// Todas as rotas de pedidos exigem login
router.use(requireAuth);

function loadOrder(id) {
  const order = db.prepare(
    'SELECT id, user_id AS userId, total, status, created_at AS createdAt FROM orders WHERE id = ?'
  ).get(id);
  if (!order) return null;
  order.items = db.prepare(`
    SELECT product_id AS productId, name, price, quantity, price * quantity AS subtotal
    FROM order_items WHERE order_id = ?
  `).all(id);
  return order;
}

// Admin vê todos os pedidos; cliente vê só os seus
router.get('/', (req, res) => {
  const ids = req.user.role === 'admin'
    ? db.prepare('SELECT id FROM orders ORDER BY id').all()
    : db.prepare('SELECT id FROM orders WHERE user_id = ? ORDER BY id').all(req.user.id);
  res.json(ids.map(({ id }) => loadOrder(id)));
});

router.get('/:id', (req, res) => {
  const order = loadOrder(Number(req.params.id));
  if (!order || (req.user.role !== 'admin' && order.userId !== req.user.id)) {
    return res.status(404).json({ error: 'Pedido não encontrado' });
  }
  res.json(order);
});

// Finaliza a compra: transforma o carrinho do usuário em pedido e baixa o estoque
router.post('/', (req, res) => {
  const userId = req.user.id;
  const { items, total } = cartSummary(userId);
  if (items.length === 0) {
    return res.status(400).json({ error: 'Carrinho vazio' });
  }

  const stockOf = db.prepare('SELECT stock FROM products WHERE id = ?');
  for (const item of items) {
    if (item.quantity > stockOf.get(item.productId).stock) {
      return res.status(400).json({ error: `Estoque insuficiente para o produto ${item.productId}` });
    }
  }

  const orderId = transaction(() => {
    const { lastInsertRowid } = db
      .prepare('INSERT INTO orders (user_id, total, status, created_at) VALUES (?, ?, ?, ?)')
      .run(userId, total, 'criado', new Date().toISOString());

    const insertItem = db.prepare(
      'INSERT INTO order_items (order_id, product_id, name, price, quantity) VALUES (?, ?, ?, ?, ?)'
    );
    const decreaseStock = db.prepare('UPDATE products SET stock = stock - ? WHERE id = ?');
    for (const item of items) {
      insertItem.run(lastInsertRowid, item.productId, item.name, item.price, item.quantity);
      decreaseStock.run(item.quantity, item.productId);
    }

    db.prepare('DELETE FROM cart_items WHERE user_id = ?').run(userId);
    return lastInsertRowid;
  });

  res.status(201).json(loadOrder(orderId));
});

module.exports = router;
