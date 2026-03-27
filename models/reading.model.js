const db = require('../config/db');

exports.getAll = (cb) => {
  db.query("SELECT * FROM readings ORDER BY created_at DESC LIMIT 50", cb);
};

exports.create = (data, cb) => {
  db.query("INSERT INTO readings SET ?", data, cb);
};

exports.getLatest = (cb) => {
  db.query("SELECT * FROM readings ORDER BY created_at DESC LIMIT 1", cb);
};

exports.getRange = (windowKey, cb) => {
  // windowKey examples: '10m','30m','1h','5h','10h','1d','7d','30d','3mo','6mo','1y','all'
  if (!windowKey || windowKey === 'all') {
    // return a sensible maximum to avoid huge responses
    return db.query("SELECT * FROM readings ORDER BY created_at ASC LIMIT 10000", cb);
  }

  const map = {
    '1m': "INTERVAL 1 MINUTE",
    '3m': "INTERVAL 3 MINUTE",
    '5m': "INTERVAL 5 MINUTE",
    '10m': "INTERVAL 10 MINUTE",
    '30m': "INTERVAL 30 MINUTE",
    '1h': "INTERVAL 1 HOUR",
    '5h': "INTERVAL 5 HOUR",
    '10h': "INTERVAL 10 HOUR",
    '1d': "INTERVAL 1 DAY",
    '7d': "INTERVAL 7 DAY",
    '30d': "INTERVAL 30 DAY",
    '3mo': "INTERVAL 3 MONTH",
    '6mo': "INTERVAL 6 MONTH",
    '1y': "INTERVAL 1 YEAR"
  };

  const interval = map[windowKey];
  if (!interval) return db.query("SELECT * FROM readings ORDER BY created_at ASC LIMIT 10000", cb);

  const sql = `SELECT * FROM readings WHERE created_at >= DATE_SUB(NOW(), ${interval}) ORDER BY created_at ASC LIMIT 10000`;
  return db.query(sql, cb);
};