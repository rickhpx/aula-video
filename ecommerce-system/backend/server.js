const path = require('path');
const express = require('express');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Front-end (arquivos da pasta frontend)
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// API: todas as rotas começam com /api
app.use('/api/auth', require('./routes/auth'));
app.use('/api/estoque', require('./routes/estoque'));
app.use('/api/carrinho', require('./routes/carrinho'));
app.use('/api/pedidos', require('./routes/pedidos'));
app.use('/api/pagamentos', require('./routes/pagamentos'));
app.use('/api/dashboard', require('./routes/dashboard'));

// Rota de API que não existe: responde em JSON (e não com uma página HTML)
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Rota não encontrada' });
});

app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});
