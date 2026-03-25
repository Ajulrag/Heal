const express = require('express');
const router = express.Router();

router.get('/', (req, res) => res.render('dashboard'));
router.get('/treatment', (req, res) => res.render('treatment'));
router.get('/alerts', (req, res) => res.render('alerts'));
router.get('/settings', (req, res) => res.render('settings'));
router.get('/patients', (req, res) => res.render('patients'));
router.get('/prescriptions', (req, res) => res.render('prescriptions'));

module.exports = router;