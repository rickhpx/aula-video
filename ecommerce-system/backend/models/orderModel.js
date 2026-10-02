const db = require('./db');
const { transaction } = require('./db');
const productModel = require('./productModel');
const cartModel = require('./cartModel');

// Status possíveis de um pedido, na ordem normal
const STATUSES = ['criado', 'pago', 'enviado', 'entregue', 'cancelado'];

// Pedido completo: dados, nome do cliente, itens e pagamento
function findById(id) {
  const order = db.prepare(`
    SELECT o.id, o.user_id AS userId, u.name AS userName, o.total, o.status, o.created_at AS createdAt
    FROM orders o LEFT JOIN users u ON u.id = o.user_id
    WHERE o.id = ?
  `).get(id);
  if (!order) return null;
  order.items = db.prepare(`
    SELECT product_id AS productId, name, price, quantity, price * quantity AS subtotal
    FROM order_items WHERE order_id = ?
  `).all(id);
  order.payment = db.prepare(
    'SELECT method, amount, status, created_at AS createdAt FROM payments WHERE order_id = ?'
  ).get(id) || null;
  return order;
}

// Sem userId: todos os pedidos (admin). Com userId: só os do cliente.
function list(userId) {
  const rows = userId
    ? db.prepare('SELECT id FROM orders WHERE user_id = ? ORDER BY id').all(userId)
    : db.prepare('SELECT id FROM orders ORDER BY id').all();
  return rows.map(({ id }) => findById(id));
}

// Transforma o carrinho em pedido: cria o pedido, baixa o estoque e limpa o carrinho
function createFromCart(userId, { items, total }) {
  const orderId = transaction(() => {
    const { lastInsertRowid } = db
      .prepare('INSERT INTO orders (user_id, total, status, created_at) VALUES (?, ?, ?, ?)')
      .run(userId, total, 'criado', new Date().toISOString());

    const insertItem = db.prepare(
      'INSERT INTO order_items (order_id, product_id, name, price, quantity) VALUES (?, ?, ?, ?, ?)'
    );
    for (const item of items) {
      insertItem.run(lastInsertRowid, item.productId, item.name, item.price, item.quantity);
      productModel.addStock(item.productId, -item.quantity);
    }

    cartModel.clear(userId);
    return lastInsertRowid;
  });
  return findById(orderId);
}

// Muda o status. Cancelar devolve os itens ao estoque e estorna o pagamento.
function updateStatus(order, status) {
  transaction(() => {
    db.prepare('UPDATE orders SET status = ? WHERE id = ?').run(status, order.id);
    if (status === 'cancelado') {
      for (const item of order.items) productModel.addStock(item.productId, item.quantity);
      db.prepare("UPDATE payments SET status = 'estornado' WHERE order_id = ?").run(order.id);
    }
  });
  return findById(order.id);
}

module.exports = { STATUSES, findById, list, createFromCart, updateStatus };
