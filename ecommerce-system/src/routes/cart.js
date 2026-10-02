const express = require('express');
const db = require('../data/db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// Todas as rotas do carrinho exigem login
router.use(requireAuth);

function cartSummary(userId) {
  const items = db.prepare(`
    SELECT c.product_id AS productId, p.name, p.price, c.quantity,
           p.price * c.quantity AS subtotal
    FROM cart_items c JOIN products p ON p.id = c.product_id
    WHERE c.user_id = ?
  `).all(userId);
  const total = items.reduce((sum, i) => sum + i.subtotal, 0);
  return { items, total };
}

router.get('/', (req, res) => {
  res.json(cartSummary(req.user.id));
});

router.post('/', (req, res) => {
  const { productId, quantity = 1 } = req.body;
  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(productId);
  if (!product) return res.status(404).json({ error: 'Produto não encontrado' });
  if (!Number.isInteger(quantity) || quantity <= 0) {
    return res.status(400).json({ error: 'quantity deve ser um inteiro positivo' });
  }

  const item = db
    .prepare('SELECT quantity FROM cart_items WHERE user_id = ? AND product_id = ?')
    .get(req.user.id, productId);
  const newQuantity = (item ? item.quantity : 0) + quantity;
  if (newQuantity > product.stock) {
    return res.status(400).json({ error: 'Estoque insuficiente' });
  }

  db.prepare(`
    INSERT INTO cart_items (user_id, product_id, quantity) VALUES (?, ?, ?)
    ON CONFLICT(user_id, product_id) DO UPDATE SET quantity = excluded.quantity
  `).run(req.user.id, productId, newQuantity);
  res.status(201).json(cartSummary(req.user.id));
});

router.delete('/:productId', (req, res) => {
  const { changes } = db
    .prepare('DELETE FROM cart_items WHERE user_id = ? AND product_id = ?')
    .run(req.user.id, Number(req.params.productId));
  if (changes === 0) return res.status(404).json({ error: 'Item não está no carrinho' });
  res.json(cartSummary(req.user.id));
});

module.exports = router;
module.exports.cartSummary = cartSummary;
