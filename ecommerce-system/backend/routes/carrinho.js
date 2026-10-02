const express = require('express');
const controller = require('../controllers/carrinhoController');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// Todas as rotas do carrinho exigem login
router.use(requireAuth);

router.get('/', controller.show);
router.post('/', controller.add);
router.put('/:productId', controller.update);
router.delete('/:productId', controller.remove);

module.exports = router;
