const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/reading.controller');
const settingsCtrl = require('../controllers/settings.controller');
const uvCtrl = require('../controllers/uv.controller');

router.get('/reading', ctrl.get);
router.get('/reading/stream', ctrl.stream);
router.post('/reading', ctrl.add);

router.get('/settings', settingsCtrl.get);
router.post('/settings', settingsCtrl.save);
router.post('/uv', uvCtrl.control);

module.exports = router;