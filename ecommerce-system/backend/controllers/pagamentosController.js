const paymentModel = require('../models/paymentModel');
const orderModel = require('../models/orderModel');

// Admin vê todos os pagamentos; cliente vê só os seus
function list(req, res) {
  res.json(paymentModel.list(req.user.role === 'admin' ? null : req.user.id));
}

function methods(req, res) {
  res.json(paymentModel.METHODS);
}

// POST /api/pagamentos  { orderId, method } — paga um pedido (simulado)
function pay(req, res) {
  const { orderId, method } = req.body;
  const order = orderModel.findById(Number(orderId));
  if (!order || order.userId !== req.user.id) {
    return res.status(404).json({ error: 'Pedido não encontrado' });
  }
  if (!paymentModel.METHODS[method]) {
    return res.status(400).json({
      error: `Forma de pagamento inválida. Use: ${Object.keys(paymentModel.METHODS).join(', ')}`,
    });
  }
  if (order.status !== 'criado' || order.payment) {
    return res.status(400).json({ error: 'Este pedido não está aguardando pagamento' });
  }

  paymentModel.pay(order, method);
  res.status(201).json(orderModel.findById(order.id));
}

module.exports = { list, methods, pay };
