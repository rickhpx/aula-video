const express = require('express');
const controller = require('../controllers/pagamentosController');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.get('/formas', controller.methods);

// O resto exige login
router.get('/', requireAuth, controller.list);
router.post('/', requireAuth, controller.pay);

module.exports = router;
