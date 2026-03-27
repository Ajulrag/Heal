document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('thresholdForm');
  if (!form) return;
  const temperature = document.getElementById('temperature');
  const moisture = document.getElementById('moisture');
  const interval = document.getElementById('interval');
  const status = document.getElementById('saveStatus');

  async function load() {
    try {
      const res = await fetch('/api/settings');
      if (!res.ok) { status.textContent = 'Failed to load'; return; }
      const data = await res.json();
      if (data.temp_threshold !== undefined && data.temp_threshold !== null) temperature.value = data.temp_threshold;
      if (data.moist_threshold !== undefined && data.moist_threshold !== null) moisture.value = data.moist_threshold;
      if (data.interval_key !== undefined && data.interval_key !== null) interval.value = data.interval_key;
    } catch (err) {
      status.textContent = 'Load error';
    }
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    status.textContent = 'Saving...';
    const payload = {
      temperature: temperature.value || null,
      moisture: moisture.value || null,
      interval: interval.value || null
    };
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        status.textContent = 'Saved';
        setTimeout(() => status.textContent = '', 2000);
      } else {
        status.textContent = 'Save failed';
      }
    } catch (err) {
      status.textContent = 'Save error';
    }
  });

  load();
});
