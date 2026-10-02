const express = require('express');
const controller = require('../controllers/pedidosController');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Todas as rotas de pedidos exigem login
router.use(requireAuth);

router.get('/', controller.list);
router.get('/:id', controller.show);
router.post('/', controller.create);
router.patch('/:id/status', requireAdmin, controller.updateStatus);

module.exports = router;
