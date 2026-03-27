exports.control = (req, res) => {
  const command = (req.body?.command || '').toLowerCase().trim();

  if (command !== 'turnon' && command !== 'turnoff') {
    return res.status(400).json({ error: 'Use command: turnon or turnoff' });
  }

  return res.json({ command });
};
