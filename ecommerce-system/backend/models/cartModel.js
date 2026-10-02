const db = require('./db');

// Itens do carrinho do usuário, com preço atual e subtotal
function summary(userId) {
  const items = db.prepare(`
    SELECT c.product_id AS productId, p.name, p.price, p.stock, c.quantity,
           p.price * c.quantity AS subtotal
    FROM cart_items c JOIN products p ON p.id = c.product_id
    WHERE c.user_id = ?
  `).all(userId);
  const total = items.reduce((sum, i) => sum + i.subtotal, 0);
  return { items, total };
}

function getQuantity(userId, productId) {
  const item = db
    .prepare('SELECT quantity FROM cart_items WHERE user_id = ? AND product_id = ?')
    .get(userId, productId);
  return item ? item.quantity : 0;
}

function setQuantity(userId, productId, quantity) {
  db.prepare(`
    INSERT INTO cart_items (user_id, product_id, quantity) VALUES (?, ?, ?)
    ON CONFLICT(user_id, product_id) DO UPDATE SET quantity = excluded.quantity
  `).run(userId, productId, quantity);
}

const remove = (userId, productId) =>
  db.prepare('DELETE FROM cart_items WHERE user_id = ? AND product_id = ?').run(userId, productId)
    .changes > 0;

const clear = (userId) => db.prepare('DELETE FROM cart_items WHERE user_id = ?').run(userId);

module.exports = { summary, getQuantity, setQuantity, remove, clear };
