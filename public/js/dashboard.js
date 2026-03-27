let chart;
const MAX_POINTS = 60;
let labels = [];
let tempData = [];
let moistData = [];
let rawBuffer = []; // ascending by time
let selectedWindow = '1d';
let lastTempValue = null;
let lastMoistValue = null;

async function sendUvCommand(command) {
  const res = await fetch('/api/uv', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ command })
  });

  let data = {};
  try {
    data = await res.json();
  } catch (e) {
    data = {};
  }

  if (!res.ok) {
    const msg = data.error || 'UV command failed';
    throw new Error(msg);
  }

  return data;
}

function windowToMillis(key) {
  const n = v => Number(v);
  if (!key || key === 'all') return Infinity;
  // check longer suffixes before shorter ones
  if (key.endsWith('mo')) return n(key.replace('mo','')) * 30 * 24 * 60 * 60 * 1000;
  if (key.endsWith('m')) return n(key.replace('m','')) * 60 * 1000;
  if (key.endsWith('h')) return n(key.replace('h','')) * 60 * 60 * 1000;
  if (key.endsWith('d')) return n(key.replace('d','')) * 24 * 60 * 60 * 1000;
  if (key.endsWith('y')) return n(key.replace('y','')) * 365 * 24 * 60 * 60 * 1000;
  return Infinity;
}

async function loadRange(windowKey) {
  try {
    selectedWindow = windowKey || selectedWindow;
    const res = await fetch('/api/reading?window=' + encodeURIComponent(selectedWindow));
    const data = await res.json();
    if (!data) return;

    // model returns ascending order (oldest first)
    rawBuffer = data.slice();

    buildSeries();
    initChart();

    // set latest vitals/descriptions
    const latest = rawBuffer[rawBuffer.length - 1];
    if (latest) {
      const prev = rawBuffer[rawBuffer.length - 2];
      const prevTemp = prev ? Number(prev.temp) : null;
      const prevMoist = prev ? Number(prev.moist) : null;
      lastTempValue = Number(latest.temp);
      lastMoistValue = Number(latest.moist);
      const t = new Date(latest.created_at).toLocaleTimeString();
      const dTemp = prevTemp != null ? (lastTempValue - prevTemp) : 0;
      const dMoist = prevMoist != null ? (lastMoistValue - prevMoist) : 0;
      const tempDesc = document.getElementById('tempDesc');
      const moistDesc = document.getElementById('moistDesc');
      if (tempDesc) tempDesc.innerText = `Updated: ${t} • Δ ${dTemp >= 0 ? '+' : ''}${dTemp.toFixed(2)}°C`;
      if (moistDesc) moistDesc.innerText = `Updated: ${t} • Δ ${dMoist >= 0 ? '+' : ''}${dMoist.toFixed(2)}%`;
    }
  } catch (err) {
    console.error('Error loading range data', err);
  }
}

function initChart() {
  const el = document.getElementById('trendChart');
  if (!el) return;

  // chart container size is controlled by CSS for responsiveness

  // dispose previous echarts instance if exists
  try { if (chart && chart.dispose) chart.dispose(); } catch (e) {}

  chart = echarts.init(el, null, { renderer: 'canvas', useDirtyRect: true });

  const option = {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'cross' },
      formatter: function (params) {
        // params is array when trigger: 'axis'
        if (!Array.isArray(params)) return '';
        let out = params[0].axisValueLabel + '<br/>';
        params.forEach(p => {
          const name = p.seriesName;
          const val = p.data;
          if (name.toLowerCase().includes('temp')) out += `${p.marker} ${name}: ${val} °C<br/>`;
          else if (name.toLowerCase().includes('moist')) out += `${p.marker} ${name}: ${val} %<br/>`;
          else out += `${p.marker} ${name}: ${val}<br/>`;
        });
        return out;
      }
    },
    legend: { data: ['Temperature (°C)', 'Moisture (%)'], top: 8 },
    grid: { left: '8%', right: '8%', top: 48, bottom: 48 },
    xAxis: { type: 'category', boundaryGap: false, data: labels },
    yAxis: [
      { type: 'value', name: 'Temperature (°C)', position: 'left', axisLabel: { formatter: '{value} °C' } },
      { type: 'value', name: 'Moisture (%)', position: 'right', axisLabel: { formatter: '{value} %' }, min: 0, max: 100 }
    ],
    dataZoom: [{ type: 'inside' }, { type: 'slider' }],
    series: [
      {
        name: 'Temperature (°C)',
        type: 'line',
        smooth: true,
        showSymbol: false,
        data: tempData,
        yAxisIndex: 0,
        lineStyle: { width: 2, color: '#ef4444' },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(239,68,68,0.28)' },
            { offset: 1, color: 'rgba(239,68,68,0.02)' }
          ])
        }
      },
      {
        name: 'Moisture (%)',
        type: 'line',
        smooth: true,
        showSymbol: false,
        data: moistData,
        yAxisIndex: 1,
        lineStyle: { width: 2, color: '#3b82f6' },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(59,130,246,0.28)' },
            { offset: 1, color: 'rgba(59,130,246,0.02)' }
          ])
        }
      }
    ],
    animationDuration: 500
  };

  // set temperature axis range based on data with small padding
  if (tempData && tempData.length) {
    const tmin = Math.min(...tempData);
    const tmax = Math.max(...tempData);
    const pad = Math.max(1, (tmax - tmin) * 0.1);
    option.yAxis[0].min = Math.floor(tmin - pad);
    option.yAxis[0].max = Math.ceil(tmax + pad);
  } else {
    option.yAxis[0].min = 0;
    option.yAxis[0].max = 50;
  }

  chart.setOption(option);

  window.addEventListener('resize', () => { try { chart && chart.resize(); } catch (e) {} });
}

function handleIncomingReading(reading) {
  try {
    // append to rawBuffer (incoming is newest)
    rawBuffer.push(reading);

    // trim by window
    const winMs = windowToMillis(selectedWindow);
    if (winMs !== Infinity) {
      const cutoff = Date.now() - winMs;
      rawBuffer = rawBuffer.filter(r => new Date(r.created_at).getTime() >= cutoff);
    } else {
      // cap all to prevent growth
      if (rawBuffer.length > 10000) rawBuffer = rawBuffer.slice(rawBuffer.length - 10000);
    }

    // update UI latest values
    document.getElementById('tempVal') && (document.getElementById('tempVal').innerText = reading.temp + ' °C');
    document.getElementById('moistVal') && (document.getElementById('moistVal').innerText = reading.moist + ' %');
    document.getElementById('lastUpdate') && (document.getElementById('lastUpdate').innerText = new Date(reading.created_at).toLocaleTimeString());

    // update per-vital descriptions and track last values
    const tempDescEl = document.getElementById('tempDesc');
    const moistDescEl = document.getElementById('moistDesc');
    const prevTemp = lastTempValue;
    const prevMoist = lastMoistValue;
    lastTempValue = Number(reading.temp);
    lastMoistValue = Number(reading.moist);
    const timeStr = new Date(reading.created_at).toLocaleTimeString();
    if (tempDescEl) {
      const d = prevTemp != null ? (lastTempValue - prevTemp) : 0;
      tempDescEl.innerText = `Updated: ${timeStr} • Δ ${d >= 0 ? '+' : ''}${d.toFixed(2)}°C`;
    }
    if (moistDescEl) {
      const d2 = prevMoist != null ? (lastMoistValue - prevMoist) : 0;
      moistDescEl.innerText = `Updated: ${timeStr} • Δ ${d2 >= 0 ? '+' : ''}${d2.toFixed(2)}%`;
    }

    // rebuild and update chart
    buildSeries();
    try { chart.setOption({ xAxis: { data: labels }, series: [ { name: 'Temperature (°C)', data: tempData }, { name: 'Moisture (%)', data: moistData } ] }, false); } catch (e) { console.error('chart update failed', e); }
  } catch (e) { console.error('failed to handle reading', e); }
}

function buildSeries() {
  if (!rawBuffer || !rawBuffer.length) {
    labels = []; tempData = []; moistData = []; return;
  }

  // if buffer small enough, show raw points
  if (rawBuffer.length <= MAX_POINTS) {
    labels = rawBuffer.map(d => new Date(d.created_at).toLocaleTimeString());
    tempData = rawBuffer.map(d => d.temp);
    moistData = rawBuffer.map(d => d.moist);
    return;
  }

  // aggregate into MAX_POINTS buckets
  const buckets = MAX_POINTS;
  const times = rawBuffer.map(r => new Date(r.created_at).getTime());
  const minT = Math.min(...times);
  const maxT = Math.max(...times);
  const span = Math.max(1, maxT - minT);
  const bucketSize = span / buckets;

  const sumsTemp = new Array(buckets).fill(0);
  const sumsMoist = new Array(buckets).fill(0);
  const counts = new Array(buckets).fill(0);

  rawBuffer.forEach(r => {
    const t = new Date(r.created_at).getTime();
    let idx = Math.floor((t - minT) / bucketSize);
    if (idx < 0) idx = 0;
    if (idx >= buckets) idx = buckets - 1;
    sumsTemp[idx] += Number(r.temp);
    sumsMoist[idx] += Number(r.moist);
    counts[idx] += 1;
  });

  labels = [];
  tempData = [];
  moistData = [];

  for (let i = 0; i < buckets; i++) {
    if (counts[i] === 0) continue;
    const bucketStart = minT + i * bucketSize;
    labels.push(new Date(bucketStart).toLocaleTimeString());
    tempData.push(Number((sumsTemp[i] / counts[i]).toFixed(2)));
    moistData.push(Number((sumsMoist[i] / counts[i]).toFixed(2)));
  }
}

// Wire SSE stream for live updates (no polling)
function setupStream() {
  if (!window.EventSource) return;
  const es = new EventSource('/api/reading/stream');
  es.onmessage = (e) => {
    if (!e.data) return;
    // ignore comments (SSE may send : connected)
    if (e.data.startsWith(':')) return;
    try {
      const obj = JSON.parse(e.data);
      handleIncomingReading(obj);
    } catch (err) {
      // sometimes server sends comments or non-json
    }
  };
  es.onerror = (err) => { console.warn('EventSource error', err); };
}

// initialize: load selected window and start SSE stream
loadRange(selectedWindow).then(() => setupStream());

// --- UI Interactions ---
function switchView(viewId) {
  document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
  const target = document.getElementById(viewId);
  if (target) target.classList.remove('hidden');
  document.querySelectorAll('.menu-btn').forEach(b => b.classList.remove('active'));
  const btn = document.querySelector(`.menu-btn[data-view="${viewId}"]`);
  if (btn) btn.classList.add('active');
}

function getDefaultSettings() {
  return {
    temperature: 38.0,
    moisture: 80,
    autoEnableUv: true,
    observationInterval: 5
  };
}

function setSettingsFormValues(values) {
  const temperature = document.getElementById('thTemp');
  const moisture = document.getElementById('thMoist');
  const autoEnableUv = document.getElementById('autoUvEnabled');
  const observationInterval = document.getElementById('observationInterval');

  if (temperature && values.temperature !== undefined && values.temperature !== null) {
    temperature.value = values.temperature;
  }
  if (moisture && values.moisture !== undefined && values.moisture !== null) {
    moisture.value = values.moisture;
  }
  if (autoEnableUv && values.autoEnableUv !== undefined && values.autoEnableUv !== null) {
    autoEnableUv.checked = Boolean(values.autoEnableUv);
  }
  if (observationInterval && values.observationInterval !== undefined && values.observationInterval !== null) {
    observationInterval.value = values.observationInterval;
  }
}

async function loadSettings() {
  try {
    const res = await fetch('/api/settings');
    if (!res.ok) return;
    const data = await res.json();
    setSettingsFormValues({
      temperature: data.temp_threshold,
      moisture: data.moist_threshold,
      autoEnableUv: data.auto_uv_enabled === 1 || data.auto_uv_enabled === true,
      observationInterval: data.observation_interval_minutes
    });
  } catch (err) {
    console.error('Failed to load settings', err);
  }
}

async function saveSettings() {
  const temperature = document.getElementById('thTemp');
  const moisture = document.getElementById('thMoist');
  const autoEnableUv = document.getElementById('autoUvEnabled');
  const observationInterval = document.getElementById('observationInterval');

  const payload = {
    temperature: temperature ? Number(temperature.value) : null,
    moisture: moisture ? Number(moisture.value) : null,
    autoEnableUv: autoEnableUv ? autoEnableUv.checked : null,
    observationInterval: observationInterval ? Number(observationInterval.value) : null
  };

  const res = await fetch('/api/settings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    throw new Error('Save failed');
  }
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
  if (btnStart) btnStart.addEventListener('click', async () => {
    try {
      await sendUvCommand('turnon');
      if (uvStatus) uvStatus.innerText = 'ON';
      if (logList) logList.innerText = 'UV turnon command sent\n' + logList.innerText;
    } catch (err) {
      console.error(err);
      alert('Failed to start UV: ' + err.message);
    }
  });
  if (btnStop) btnStop.addEventListener('click', async () => {
    try {
      await sendUvCommand('turnoff');
      if (uvStatus) uvStatus.innerText = 'OFF';
      if (logList) logList.innerText = 'UV turnoff command sent\n' + logList.innerText;
    } catch (err) {
      console.error(err);
      alert('Failed to stop UV: ' + err.message);
    }
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

  // Settings actions
  document.getElementById('applySettings')?.addEventListener('click', async () => {
    try {
      await saveSettings();
      alert('Settings saved successfully');
    } catch (err) {
      console.error(err);
      alert('Failed to save settings');
    }
  });

  document.getElementById('resetSettings')?.addEventListener('click', () => {
    setSettingsFormValues(getDefaultSettings());
  });

  setSettingsFormValues(getDefaultSettings());
  loadSettings();

  // Range selector
  const rangeSelect = document.getElementById('rangeSelect');
  if (rangeSelect) {
    rangeSelect.value = selectedWindow;
    rangeSelect.addEventListener('change', (e) => {
      const w = e.target.value;
      loadRange(w);
    });
  }
}

// Initialize UI when DOM ready
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', setupUI);
else setupUI();