const productModel = require('../models/productModel');

// Confere os dados de um produto. Devolve a mensagem de erro, ou null se estiver tudo certo.
function validate({ name, price, stock }) {
  if (!name || typeof price !== 'number' || price <= 0) {
    return 'Informe name e price (número positivo)';
  }
  if (!Number.isInteger(stock) || stock < 0) {
    return 'stock deve ser um inteiro maior ou igual a 0';
  }
  return null;
}

// Arruma espaços e preenche a categoria padrão
const clean = (p) => ({
  ...p,
  name: String(p.name).trim(),
  category: String(p.category || '').trim() || 'Geral',
  description: String(p.description || '').trim(),
});

// GET /api/estoque?q=&category=&minPrice=&maxPrice=
function list(req, res) {
  res.json(productModel.list(req.query));
}

function categories(req, res) {
  res.json(productModel.categories());
}

function show(req, res) {
  const product = productModel.findById(Number(req.params.id));
  if (!product) return res.status(404).json({ error: 'Produto não encontrado' });
  res.json(product);
}

function create(req, res) {
  const data = { stock: 0, ...req.body };
  const error = validate(data);
  if (error) return res.status(400).json({ error });
  res.status(201).json(productModel.create(clean(data)));
}

// Envie só os campos que quer mudar; o resto continua igual
function update(req, res) {
  const product = productModel.findById(Number(req.params.id));
  if (!product) return res.status(404).json({ error: 'Produto não encontrado' });
  const data = { ...product, ...req.body };
  const error = validate(data);
  if (error) return res.status(400).json({ error });
  res.json(productModel.update(product.id, clean(data)));
}

// POST /api/estoque/:id/repor  { "amount": 10 } — soma ao estoque atual
function restock(req, res) {
  const product = productModel.findById(Number(req.params.id));
  if (!product) return res.status(404).json({ error: 'Produto não encontrado' });
  const { amount } = req.body;
  if (!Number.isInteger(amount) || amount <= 0) {
    return res.status(400).json({ error: 'amount deve ser um inteiro positivo' });
  }
  productModel.addStock(product.id, amount);
  res.json(productModel.findById(product.id));
}

function remove(req, res) {
  if (!productModel.remove(Number(req.params.id))) {
    return res.status(404).json({ error: 'Produto não encontrado' });
  }
  res.status(204).end();
}

module.exports = { list, categories, show, create, update, restock, remove };
