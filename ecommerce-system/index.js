const path = require('path');
const express = require('express');
const authRouter = require('./src/routes/auth');
const productsRouter = require('./src/routes/products');
const cartRouter = require('./src/routes/cart');
const ordersRouter = require('./src/routes/orders');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Front-end da loja (arquivos da pasta public)
app.use(express.static(path.join(__dirname, 'public')));

app.use('/auth', authRouter);
app.use('/products', productsRouter);
app.use('/cart', cartRouter);
app.use('/orders', ordersRouter);

app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});
