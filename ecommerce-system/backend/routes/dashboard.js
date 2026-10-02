const express = require('express');
const controller = require('../controllers/dashboardController');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

router.get('/', requireAdmin, controller.summary);

module.exports = router;
