const db = require('../config/db');

exports.getAll = (cb) => {
  db.query("SELECT * FROM readings ORDER BY created_at DESC LIMIT 50", cb);
};

exports.create = (data, cb) => {
  db.query("INSERT INTO readings SET ?", data, cb);
};