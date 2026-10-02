const cartModel = require('../models/cartModel');
const productModel = require('../models/productModel');

function show(req, res) {
  res.json(cartModel.summary(req.user.id));
}

// POST /api/carrinho  { productId, quantity } — soma ao que já está no carrinho
function add(req, res) {
  const { productId, quantity = 1 } = req.body;
  const product = productModel.findById(productId);
  if (!product) return res.status(404).json({ error: 'Produto não encontrado' });
  if (!Number.isInteger(quantity) || quantity <= 0) {
    return res.status(400).json({ error: 'quantity deve ser um inteiro positivo' });
  }

  const newQuantity = cartModel.getQuantity(req.user.id, product.id) + quantity;
  if (newQuantity > product.stock) {
    return res.status(400).json({ error: 'Estoque insuficiente' });
  }
  cartModel.setQuantity(req.user.id, product.id, newQuantity);
  res.status(201).json(cartModel.summary(req.user.id));
}

// PUT /api/carrinho/:productId  { quantity } — troca a quantidade
function update(req, res) {
  const productId = Number(req.params.productId);
  const { quantity } = req.body;
  if (!cartModel.getQuantity(req.user.id, productId)) {
    return res.status(404).json({ error: 'Item não está no carrinho' });
  }
  if (!Number.isInteger(quantity) || quantity <= 0) {
    return res.status(400).json({ error: 'quantity deve ser um inteiro positivo' });
  }
  if (quantity > productModel.findById(productId).stock) {
    return res.status(400).json({ error: 'Estoque insuficiente' });
  }
  cartModel.setQuantity(req.user.id, productId, quantity);
  res.json(cartModel.summary(req.user.id));
}

function remove(req, res) {
  if (!cartModel.remove(req.user.id, Number(req.params.productId))) {
    return res.status(404).json({ error: 'Item não está no carrinho' });
  }
  res.json(cartModel.summary(req.user.id));
}

module.exports = { show, add, update, remove };
