const Reading = require('../models/reading.model');

// SSE clients
const clients = [];

exports.get = (req, res) => {
  const windowKey = req.query.window;
  if (windowKey) {
    Reading.getRange(windowKey, (err, data) => {
      if (err) return res.status(500).json(err);
      res.json(data);
    });
  } else {
    Reading.getAll((err, data) => {
      if (err) return res.status(500).json(err);
      res.json(data);
    });
  }
};

exports.stream = (req, res) => {
  // Headers for SSE
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive'
  });

  // send a comment to establish the stream
  res.write(': connected\n\n');

  clients.push(res);

  req.on('close', () => {
    const idx = clients.indexOf(res);
    if (idx !== -1) clients.splice(idx, 1);
  });
};

exports.add = (req, res) => {
  const { temp, moist } = req.body;

  Reading.create({ temp, moist }, (err, result) => {
    if (err) return res.status(500).json(err);

    // fetch the latest inserted reading and broadcast
    Reading.getLatest((err2, rows) => {
      if (!err2 && rows && rows.length) {
        const payload = rows[0];
        const dataStr = JSON.stringify(payload);
        clients.forEach(c => {
          try { c.write(`data: ${dataStr}\n\n`); } catch (e) { /* ignore */ }
        });
      }
    });

    res.json({ success: true });
  });
};