const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/reading.controller');

router.get('/reading', ctrl.get);
router.post('/reading', ctrl.add);

module.exports = router;