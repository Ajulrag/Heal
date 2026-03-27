const Settings = require('../models/settings.model');

function toNullableNumber(value) {
  if (value === undefined || value === null || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toBoolInt(value) {
  if (value === true || value === 'true' || value === 1 || value === '1' || value === 'yes') return 1;
  if (value === false || value === 'false' || value === 0 || value === '0' || value === 'no') return 0;
  return null;
}

exports.get = (req, res) => {
  Settings.get((err, results) => {
    if (err) return res.status(500).json({ error: 'DB error' });
    if (!results || results.length === 0) return res.json({});
    res.json(results[0]);
  });
};

exports.save = (req, res) => {
  const body = req.body || {};

  const observationInput =
    body.observationInterval !== undefined ? body.observationInterval :
    (body.interval !== undefined ? body.interval : null);

  const parsedObservation = toNullableNumber(observationInput);

  const data = {
    temp_threshold: toNullableNumber(body.temperature),
    moist_threshold: toNullableNumber(body.moisture),
    auto_uv_enabled: toBoolInt(body.autoEnableUv),
    observation_interval_minutes: parsedObservation
  };

  // Keep this legacy field in sync for older UI consumers.
  data.interval_key = parsedObservation !== null ? `${parsedObservation}m` : null;

  Settings.save(data, (err) => {
    if (err) return res.status(500).json({ error: 'DB error' });
    Settings.get((err2, results) => {
      if (err2) return res.status(500).json({ error: 'DB error' });
      res.json(results[0] || {});
    });
  });
};
