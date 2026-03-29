let uvState = {
  isOn: false,
  command: 'turnoff',
  source: 'system',
  updatedAt: new Date().toISOString()
};

exports.getState = (_req, res) => {
  return res.json(uvState);
};

exports.control = (req, res) => {
  const command = (req.body?.command || '').toLowerCase().trim();
  const source = (req.body?.source || 'web').toString();

  if (command !== 'turnon' && command !== 'turnoff') {
    return res.status(400).json({ error: 'Use command: turnon or turnoff' });
  }

  uvState = {
    isOn: command === 'turnon',
    command,
    source,
    updatedAt: new Date().toISOString()
  };

  return res.json({ ok: true, ...uvState });
};
