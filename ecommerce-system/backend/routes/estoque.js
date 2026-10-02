const express = require('express');
const controller = require('../controllers/estoqueController');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Leitura pública
router.get('/', controller.list);
router.get('/categorias', controller.categories);
router.get('/:id', controller.show);

// Alterações só para admin
router.post('/', requireAdmin, controller.create);
router.put('/:id', requireAdmin, controller.update);
router.post('/:id/repor', requireAdmin, controller.restock);
router.delete('/:id', requireAdmin, controller.remove);

module.exports = router;
