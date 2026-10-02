const db = require('./db');

// Abaixo deste estoque o produto aparece como "estoque baixo"
const LOW_STOCK = 5;

// Números gerais da loja para o painel do admin
function summary() {
  // Vendas = pedidos pagos, enviados ou entregues (não conta "criado" nem "cancelado")
  const sales = db.prepare(`
    SELECT COUNT(*) AS orders, COALESCE(SUM(total), 0) AS revenue
    FROM orders WHERE status IN ('pago', 'enviado', 'entregue')
  `).get();

  const byStatus = Object.fromEntries(
    db.prepare('SELECT status, COUNT(*) AS count FROM orders GROUP BY status').all()
      .map((r) => [r.status, r.count])
  );

  const topProducts = db.prepare(`
    SELECT i.name, SUM(i.quantity) AS quantity, SUM(i.price * i.quantity) AS revenue
    FROM order_items i JOIN orders o ON o.id = i.order_id
    WHERE o.status IN ('pago', 'enviado', 'entregue')
    GROUP BY i.product_id ORDER BY quantity DESC LIMIT 5
  `).all();

  const lowStock = db.prepare(
    'SELECT id, name, stock FROM products WHERE stock <= ? ORDER BY stock, name'
  ).all(LOW_STOCK);

  const totals = db.prepare(`
    SELECT
      (SELECT COUNT(*) FROM products) AS products,
      (SELECT COALESCE(SUM(stock), 0) FROM products) AS units,
      (SELECT COUNT(*) FROM users WHERE role = 'customer') AS customers
  `).get();

  return {
    revenue: sales.revenue,
    paidOrders: sales.orders,
    averageTicket: sales.orders ? sales.revenue / sales.orders : 0,
    byStatus,
    topProducts,
    lowStock,
    lowStockLimit: LOW_STOCK,
    ...totals,
  };
}

module.exports = { summary };
