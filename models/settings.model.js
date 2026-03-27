const db = require('../config/db');

exports.get = (cb) => {
  db.query("SELECT * FROM settings ORDER BY id DESC LIMIT 1", cb);
};

// data: { temp_threshold, moist_threshold, auto_uv_enabled, observation_interval_minutes, interval_key }
exports.save = (data, cb) => {
  db.query("SELECT id FROM settings ORDER BY id DESC LIMIT 1", (err, results) => {
    if (err) return cb(err);
    if (results && results.length) {
      const id = results[0].id;
      db.query("UPDATE settings SET ? WHERE id = ?", [data, id], cb);
    } else {
      db.query("INSERT INTO settings SET ?", data, cb);
    }
  });
};
