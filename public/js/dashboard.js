let chart;

// Fetch data from backend
async function loadData() {
  try {
    const res = await fetch('/api/reading');
    const data = await res.json();

    if (!data.length) return;

    const latest = data[0];

    // 🔥 UPDATE UI (MATCH YOUR EXISTING HTML IDs)
    if (document.getElementById('tempVal'))
      document.getElementById('tempVal').innerText = latest.temp + " °C";

    if (document.getElementById('moistVal'))
      document.getElementById('moistVal').innerText = latest.moist + " %";

    if (document.getElementById('lastUpdate'))
      document.getElementById('lastUpdate').innerText =
        new Date(latest.created_at).toLocaleTimeString();

    // 🔥 UPDATE CHART
    updateChart(data);

  } catch (err) {
    console.error("Error:", err);
  }
}

// Chart update
function updateChart(data) {
  const labels = data.map(d =>
    new Date(d.created_at).toLocaleTimeString()
  ).reverse();

  const tempData = data.map(d => d.temp).reverse();
  const moistData = data.map(d => d.moist).reverse();

  const ctx = document.getElementById('trendChart');

  if (!ctx) return;

  // destroy old chart (important)
  if (chart) chart.destroy();

  chart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Temperature',
          data: tempData,
          borderColor: 'red',
          tension: 0.3
        },
        {
          label: 'Moisture',
          data: moistData,
          borderColor: 'blue',
          tension: 0.3
        }
      ]
    }
  });
}

// Auto refresh every 2 seconds
setInterval(loadData, 2000);

// First load
loadData();

// --- UI Interactions ---
function switchView(viewId) {
  document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
  const target = document.getElementById(viewId);
  if (target) target.classList.remove('hidden');
  document.querySelectorAll('.menu-btn').forEach(b => b.classList.remove('active'));
  const btn = document.querySelector(`.menu-btn[data-view="${viewId}"]`);
  if (btn) btn.classList.add('active');
}

function setupUI() {
  // Menu buttons
  document.querySelectorAll('.menu-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const v = btn.getAttribute('data-view');
      if (v) switchView(v);
    });
  });

  // Mobile toggle
  const menuToggle = document.getElementById('doctorMenuToggle');
  if (menuToggle) {
    menuToggle.addEventListener('click', () => {
      const sb = document.querySelector('.sidebar');
      if (sb) sb.classList.toggle('open');
    });
  }

  // Populate patient selects with sample data if no API
  const patients = [
    { id: 1, name: 'John Doe' },
    { id: 2, name: 'Jane Smith' },
    { id: 3, name: 'Emily Harris' }
  ];

  const currentSelect = document.getElementById('currentPatientSelect');
  const patientSelect = document.getElementById('patientSelect');
  if (currentSelect) {
    patients.forEach(p => {
      const o = document.createElement('option');
      o.value = p.id; o.text = p.name; currentSelect.appendChild(o);
    });
    currentSelect.addEventListener('change', (e) => {
      const sel = e.target; const name = sel.options[sel.selectedIndex].text;
      const nameEl = document.getElementById('currentPatientName');
      if (nameEl) nameEl.innerText = name || '—';
    });
  }
  if (patientSelect) {
    patients.forEach(p => {
      const o = document.createElement('option');
      o.value = p.id; o.text = p.name; patientSelect.appendChild(o);
    });
  }

  // UV controls
  const uvStatus = document.getElementById('uvStatus');
  const btnStart = document.getElementById('btnStartUV');
  const btnStop = document.getElementById('btnStopUV');
  const logList = document.getElementById('logList');
  if (btnStart) btnStart.addEventListener('click', () => {
    if (uvStatus) uvStatus.innerText = 'ON';
    if (logList) logList.innerText = 'UV started\n' + logList.innerText;
  });
  if (btnStop) btnStop.addEventListener('click', () => {
    if (uvStatus) uvStatus.innerText = 'OFF';
    if (logList) logList.innerText = 'UV stopped\n' + logList.innerText;
  });

  // Quick actions
  document.getElementById('quickPrescription')?.addEventListener('click', () => {
    alert('Open new prescription form');
  });
  document.getElementById('quickReport')?.addEventListener('click', () => {
    alert('Generate report');
  });
  document.getElementById('quickAlert')?.addEventListener('click', () => {
    alert('Send alert to patient');
  });
  document.getElementById('quickAnalyze')?.addEventListener('click', () => {
    alert('Analyzing data...');
  });

  // Logs actions
  document.getElementById('clearLogs')?.addEventListener('click', () => {
    if (logList) logList.innerText = '—';
  });
  document.getElementById('downloadCSV')?.addEventListener('click', () => {
    alert('Download CSV (not implemented)');
  });

  // Settings tabs
  document.querySelectorAll('.tab-btn').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const tabId = tab.getAttribute('data-tab');
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      document.getElementById(tabId + 'Tab')?.classList.add('active');
    });
  });
}

// Initialize UI when DOM ready
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', setupUI);
else setupUI();