const Reading = require('../models/reading.model');

exports.get = (req, res) => {
  Reading.getAll((err, data) => {
    if (err) return res.status(500).json(err);
    res.json(data);
  });
};

exports.add = (req, res) => {
  const { temp, moist } = req.body;

  Reading.create({ temp, moist }, (err) => {
    if (err) return res.status(500).json(err);
    res.json({ success: true });
  });
};