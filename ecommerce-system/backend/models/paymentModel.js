const db = require('./db');
const { transaction } = require('./db');

// Formas de pagamento aceitas (pagamento simulado, sem dinheiro de verdade)
const METHODS = { pix: 'Pix', cartao: 'Cartão de crédito', boleto: 'Boleto' };

// Sem userId: todos (admin). Com userId: só os do cliente.
function list(userId) {
  const sql = `
    SELECT p.id, p.order_id AS orderId, p.method, p.amount, p.status, p.created_at AS createdAt,
           u.name AS userName
    FROM payments p
    JOIN orders o ON o.id = p.order_id
    LEFT JOIN users u ON u.id = o.user_id
    ${userId ? 'WHERE o.user_id = ?' : ''}
    ORDER BY p.id DESC
  `;
  return userId ? db.prepare(sql).all(userId) : db.prepare(sql).all();
}

// Registra o pagamento aprovado e marca o pedido como pago (tudo ou nada)
function pay(order, method) {
  transaction(() => {
    db.prepare(
      'INSERT INTO payments (order_id, method, amount, status, created_at) VALUES (?, ?, ?, ?, ?)'
    ).run(order.id, method, order.total, 'aprovado', new Date().toISOString());
    db.prepare("UPDATE orders SET status = 'pago' WHERE id = ?").run(order.id);
  });
}

module.exports = { METHODS, list, pay };
