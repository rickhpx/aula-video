const orderModel = require('../models/orderModel');
const cartModel = require('../models/cartModel');

// Admin vê todos os pedidos; cliente vê só os seus
function list(req, res) {
  res.json(orderModel.list(req.user.role === 'admin' ? null : req.user.id));
}

function show(req, res) {
  const order = orderModel.findById(Number(req.params.id));
  if (!order || (req.user.role !== 'admin' && order.userId !== req.user.id)) {
    return res.status(404).json({ error: 'Pedido não encontrado' });
  }
  res.json(order);
}

// Finaliza a compra: transforma o carrinho do usuário em pedido
function create(req, res) {
  const cart = cartModel.summary(req.user.id);
  if (cart.items.length === 0) {
    return res.status(400).json({ error: 'Carrinho vazio' });
  }
  const missing = cart.items.find((i) => i.quantity > i.stock);
  if (missing) {
    return res.status(400).json({ error: `Estoque insuficiente para ${missing.name}` });
  }
  res.status(201).json(orderModel.createFromCart(req.user.id, cart));
}

// PATCH /api/pedidos/:id/status  { status } — só admin
function updateStatus(req, res) {
  const order = orderModel.findById(Number(req.params.id));
  if (!order) return res.status(404).json({ error: 'Pedido não encontrado' });

  const { status } = req.body;
  if (!orderModel.STATUSES.includes(status)) {
    return res.status(400).json({ error: `Status inválido. Use: ${orderModel.STATUSES.join(', ')}` });
  }
  if (order.status === 'cancelado') {
    return res.status(400).json({ error: 'Pedido cancelado não pode mudar de status' });
  }
  res.json(orderModel.updateStatus(order, status));
}

module.exports = { list, show, create, updateStatus };
