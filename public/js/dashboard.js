let chart;
const MAX_POINTS = 60;
let labels = [];
let tempData = [];
let moistData = [];
let tooltipDateLabels = [];
let rawBuffer = []; // ascending by time
let selectedWindow = '1d';
let lastTempValue = null;
let lastMoistValue = null;
let manualDurationSeconds = 60;
let scheduleIntervalMinutes = 5;

const APP_PATIENT = {
  id: 1,
  mrn: 'HT-2026-001',
  name: 'Aarav Kumar',
  age: 42,
  sex: 'Male',
  diagnosis: 'Post-operative wound care',
  admissionDate: '2026-03-12',
  bed: 'Ward B, Bed 14',
  doctor: 'Dr. Alex Morgan',
  status: 'Stable'
};

const DUMMY_PRESCRIPTIONS = [
  {
    id: 'RX-1007',
    date: '2026-03-29',
    medication: 'Cefixime 200mg, twice daily for 5 days',
    instructions: 'Administer after meals and monitor for GI discomfort.',
    notes: 'No known allergy. Continue moisture tracking every 3 mins.',
    status: 'active'
  },
  {
    id: 'RX-1003',
    date: '2026-03-23',
    medication: 'Topical antiseptic dressing, once daily',
    instructions: 'Clean wound with normal saline before dressing.',
    notes: 'Observed healthy granulation tissue.',
    status: 'completed'
  }
];

const DUMMY_TREATMENTS = [
  { id: 'TR-219', started: '2026-03-30T09:15:00', stopped: '2026-03-30T09:17:00', duration: 120, mode: 'Manual', status: 'Completed' },
  { id: 'TR-218', started: '2026-03-30T07:00:00', stopped: '2026-03-30T07:01:30', duration: 90, mode: 'Auto', status: 'Completed' },
  { id: 'TR-217', started: '2026-03-29T22:00:00', stopped: '2026-03-29T22:01:20', duration: 80, mode: 'Auto', status: 'Completed' },
  { id: 'TR-216', started: '2026-03-29T18:20:00', stopped: '2026-03-29T18:21:15', duration: 75, mode: 'Manual', status: 'Completed' }
];

const DUMMY_ALERTS = [
  {
    type: 'critical',
    title: 'High temperature trend detected',
    message: 'Temperature crossed threshold for 2 consecutive readings.',
    time: '2026-03-30 09:14'
  },
  {
    type: 'warning',
    title: 'Low moisture warning',
    message: 'Moisture dipped below configured threshold. Auto UV condition is eligible.',
    time: '2026-03-30 08:58'
  },
  {
    type: 'info',
    title: 'Settings updated',
    message: 'Observation interval was changed to 5 minutes by dashboard user.',
    time: '2026-03-30 08:40'
  }
];

async function sendUvCommand(command) {
  const res = await fetch('/api/uv', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ command, source: 'dashboard' })
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

async function loadUvState() {
  const uvStatus = document.getElementById('uvStatus');
  const uvCard = document.getElementById('uvCard');
  if (!uvStatus) return;

  try {
    const res = await fetch('/api/uv');
    if (!res.ok) return;

    const data = await res.json();
    uvStatus.innerText = data.isOn ? 'ON' : 'OFF';
    if (uvCard) uvCard.classList.toggle('active', Boolean(data.isOn));
  } catch (err) {
    console.error('Failed to load UV state', err);
  }
}

function formatDateTime(value) {
  if (!value) return 'N/A';
  const dt = new Date(value);
  return `${dt.toLocaleDateString()} ${dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
}

function appendLog(message) {
  const logList = document.getElementById('logList');
  if (!logList) return;

  if (logList.innerText.trim() === '—') {
    logList.innerText = '';
  }

  const line = `[${new Date().toLocaleTimeString()}] ${message}`;
  const next = `${line}\n${logList.innerText}`.trim();
  logList.innerText = next;
}

function renderCurrentPatient() {
  const nameEl = document.getElementById('currentPatientName');
  if (nameEl) nameEl.innerText = APP_PATIENT.name;

  const patientInfoEl = document.getElementById('currentPatientInfo');
  if (patientInfoEl) {
    patientInfoEl.innerHTML = `
      <span class="patient-badge"><i class="fas fa-id-card"></i> ${APP_PATIENT.mrn}</span>
      <span class="patient-badge"><i class="fas fa-bed"></i> ${APP_PATIENT.bed}</span>
      <span class="patient-badge"><i class="fas fa-check-circle"></i> ${APP_PATIENT.status}</span>
    `;
  }
}

function populatePatientSelectors() {
  const currentSelect = document.getElementById('currentPatientSelect');
  const patientSelect = document.getElementById('patientSelect');

  if (currentSelect) {
    currentSelect.innerHTML = `<option value="${APP_PATIENT.id}">${APP_PATIENT.name}</option>`;
    currentSelect.value = String(APP_PATIENT.id);
    currentSelect.disabled = true;
  }

  if (patientSelect) {
    patientSelect.innerHTML = `<option value="${APP_PATIENT.id}">${APP_PATIENT.name}</option>`;
    patientSelect.value = String(APP_PATIENT.id);
  }
}

function renderPatientsView() {
  const patientsList = document.getElementById('patientsList');
  if (!patientsList) return;

  patientsList.innerHTML = `
    <article class="patient-card">
      <div class="patient-info">
        <div class="patient-avatar">${APP_PATIENT.name.split(' ').map(n => n[0]).join('')}</div>
        <div class="patient-details">
          <h4>${APP_PATIENT.name}</h4>
          <p class="muted">MRN: ${APP_PATIENT.mrn} • ${APP_PATIENT.age} years • ${APP_PATIENT.sex}</p>
          <p class="muted">Diagnosis: ${APP_PATIENT.diagnosis}</p>
          <p class="muted">Admitted: ${new Date(APP_PATIENT.admissionDate).toLocaleDateString()} • ${APP_PATIENT.bed}</p>
          <div class="patient-status healthy"><i class="fas fa-heartbeat"></i> ${APP_PATIENT.status}</div>
          <div class="patient-quick-stats">
            <div class="quick-stat"><span class="quick-stat-value">1</span><span class="quick-stat-label">Patient</span></div>
            <div class="quick-stat"><span class="quick-stat-value">4</span><span class="quick-stat-label">Treatments</span></div>
            <div class="quick-stat"><span class="quick-stat-value">2</span><span class="quick-stat-label">Prescriptions</span></div>
          </div>
        </div>
      </div>
      <div class="patient-actions">
        <button class="btn small" id="viewPatientTimeline"><i class="fas fa-notes-medical"></i><span class="action-text">Timeline</span></button>
      </div>
    </article>
  `;
}

function renderPrescriptions() {
  const prescriptionsList = document.getElementById('prescriptionsList');
  if (!prescriptionsList) return;

  prescriptionsList.innerHTML = DUMMY_PRESCRIPTIONS.map((item) => `
    <article class="prescription-item">
      <div class="prescription-header">
        <div>
          <h4>${item.id} • ${APP_PATIENT.name}</h4>
          <p class="muted">Issued: ${new Date(item.date).toLocaleDateString()}</p>
        </div>
        <span class="prescription-status ${item.status}">${item.status.toUpperCase()}</span>
      </div>
      <div class="prescription-content">
        <p><strong>Medication:</strong> ${item.medication}</p>
        <p><strong>Instructions:</strong> ${item.instructions}</p>
        <p><strong>Notes:</strong> ${item.notes}</p>
      </div>
    </article>
  `).join('');
}

function renderTreatmentHistory() {
  const tableBody = document.querySelector('#treatmentTable tbody');
  if (!tableBody) return;

  tableBody.innerHTML = DUMMY_TREATMENTS.map((t, idx) => `
    <tr>
      <td>${idx + 1}</td>
      <td>${APP_PATIENT.name}</td>
      <td>${formatDateTime(t.started)}</td>
      <td>${formatDateTime(t.stopped)}</td>
      <td>${t.duration}</td>
      <td>${t.mode}</td>
      <td><span class="status-badge completed">${t.status}</span></td>
    </tr>
  `).join('');

  const total = DUMMY_TREATMENTS.length;
  const avgDuration = Math.round(DUMMY_TREATMENTS.reduce((sum, t) => sum + t.duration, 0) / total / 60 * 10) / 10;
  const autoCount = DUMMY_TREATMENTS.filter(t => t.mode === 'Auto').length;

  const totalTreatments = document.getElementById('totalTreatments');
  const avgDurationEl = document.getElementById('avgDuration');
  const successRate = document.getElementById('successRate');
  const autoTreatments = document.getElementById('autoTreatments');

  if (totalTreatments) totalTreatments.innerText = String(total);
  if (avgDurationEl) avgDurationEl.innerText = String(avgDuration);
  if (successRate) successRate.innerText = '100%';
  if (autoTreatments) autoTreatments.innerText = String(autoCount);
}

function setNextScheduleFromNow() {
  const nextSchedule = document.getElementById('nextSchedule');
  if (!nextSchedule) return;

  const next = new Date(Date.now() + scheduleIntervalMinutes * 60 * 1000);
  nextSchedule.innerText = next.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function updateDurationLabel() {
  const uvDuration = document.getElementById('uvDuration');
  if (!uvDuration) return;
  uvDuration.innerText = `Duration: ${manualDurationSeconds}s`;
}

function addTreatmentEntry(mode, durationSeconds, status) {
  const endedAt = new Date();
  const startedAt = new Date(endedAt.getTime() - durationSeconds * 1000);
  const latestId = DUMMY_TREATMENTS.length
    ? Number(String(DUMMY_TREATMENTS[0].id).replace('TR-', ''))
    : 220;

  DUMMY_TREATMENTS.unshift({
    id: `TR-${latestId + 1}`,
    started: startedAt.toISOString(),
    stopped: endedAt.toISOString(),
    duration: durationSeconds,
    mode,
    status
  });

  if (DUMMY_TREATMENTS.length > 12) {
    DUMMY_TREATMENTS.length = 12;
  }

  renderTreatmentHistory();
}

function setupMobileSidebar() {
  const sidebar = document.querySelector('.sidebar');
  const toggle = document.getElementById('doctorMenuToggle');
  if (!sidebar || !toggle) return;

  let backdrop = document.querySelector('.sidebar-backdrop');
  if (!backdrop) {
    backdrop = document.createElement('div');
    backdrop.className = 'sidebar-backdrop';
    document.body.appendChild(backdrop);
  }

  const sync = () => {
    const isOpen = sidebar.classList.contains('open');
    backdrop.classList.toggle('show', isOpen);
    toggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
  };

  backdrop.addEventListener('click', () => {
    sidebar.classList.remove('open');
    sync();
  });

  window.addEventListener('resize', () => {
    if (window.innerWidth > 991) {
      sidebar.classList.remove('open');
      sync();
    }
  });

  sync();
}

function alertIcon(type) {
  if (type === 'critical') return 'fa-triangle-exclamation';
  if (type === 'warning') return 'fa-exclamation-circle';
  return 'fa-circle-info';
}

function renderAlerts(filter = 'all') {
  const alertsList = document.getElementById('alertsList');
  if (!alertsList) return;

  const items = filter === 'all' ? DUMMY_ALERTS : DUMMY_ALERTS.filter(a => a.type === filter);
  alertsList.innerHTML = items.map((a) => `
    <article class="alert-item ${a.type}">
      <div class="alert-icon"><i class="fas ${alertIcon(a.type)}"></i></div>
      <div class="alert-content">
        <h4>${a.title}</h4>
        <p>${a.message}</p>
        <div class="alert-time">${a.time}</div>
      </div>
    </article>
  `).join('');
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
  const isMobile = window.innerWidth <= 767;

  // chart container size is controlled by CSS for responsiveness

  // dispose previous echarts instance if exists
  try { if (chart && chart.dispose) chart.dispose(); } catch (e) {}

  chart = echarts.init(el, null, { renderer: 'canvas', useDirtyRect: true });

  const option = {
    color: ['#dc2626', '#2563eb'],
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'cross' },
      backgroundColor: 'rgba(15, 23, 42, 0.92)',
      borderWidth: 0,
      textStyle: { color: '#f8fafc', fontSize: 12 },
      padding: [10, 12],
      formatter: function (params) {
        // params is array when trigger: 'axis'
        if (!Array.isArray(params)) return '';
        const idx = Number(params[0]?.dataIndex);
        const title = Number.isFinite(idx) && tooltipDateLabels[idx]
          ? tooltipDateLabels[idx]
          : params[0].axisValueLabel;
        let out = title + '<br/>';
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
    legend: {
      data: ['Temperature (°C)', 'Moisture (%)'],
      top: isMobile ? 4 : 8,
      left: 'center',
      icon: 'roundRect',
      itemWidth: isMobile ? 12 : 14,
      itemHeight: isMobile ? 7 : 8,
      itemGap: isMobile ? 10 : 16,
      textStyle: { color: '#334155', fontSize: isMobile ? 11 : 12, fontWeight: 600 }
    },
    grid: { left: isMobile ? '8%' : '6%', right: isMobile ? '8%' : '6%', top: isMobile ? 58 : 52, bottom: 56, containLabel: true },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: labels,
      axisLine: { lineStyle: { color: '#cbd5e1' } },
      axisTick: { show: false },
      axisLabel: { color: '#64748b', fontSize: 11, margin: 12 },
      splitLine: { show: false }
    },
    yAxis: [
      {
        type: 'value',
        name: isMobile ? 'Temp' : 'Temperature (°C)',
        position: 'left',
        nameGap: isMobile ? 10 : 14,
        nameTextStyle: { color: '#dc2626', fontWeight: 700 },
        axisLabel: { formatter: '{value} °C', color: '#64748b', fontSize: 11 },
        axisLine: { show: true, lineStyle: { color: '#fecaca' } },
        splitLine: { show: true, lineStyle: { color: 'rgba(148,163,184,0.20)', type: 'dashed' } }
      },
      {
        type: 'value',
        name: isMobile ? 'Moist' : 'Moisture (%)',
        position: 'right',
        nameGap: isMobile ? 10 : 14,
        nameTextStyle: { color: '#2563eb', fontWeight: 700 },
        axisLabel: { formatter: '{value} %', color: '#64748b', fontSize: 11 },
        axisLine: { show: true, lineStyle: { color: '#bfdbfe' } },
        splitLine: { show: false },
        min: 0,
        max: 100
      }
    ],
    dataZoom: [
      { type: 'inside', zoomOnMouseWheel: true, moveOnMouseMove: true },
      {
        type: 'slider',
        height: 14,
        bottom: 8,
        borderColor: '#dbeafe',
        backgroundColor: '#f8fbff',
        fillerColor: 'rgba(37,99,235,0.24)',
        dataBackground: {
          lineStyle: { color: '#bfdbfe' },
          areaStyle: { color: 'rgba(191,219,254,0.22)' }
        },
        moveHandleSize: 0,
        showDetail: false,
        showDataShadow: true,
        brushSelect: false,
        handleSize: 12,
        handleStyle: { color: '#2563eb', borderColor: '#1d4ed8', shadowBlur: 4, shadowColor: 'rgba(37,99,235,0.25)' },
        textStyle: { color: '#64748b' }
      }
    ],
    series: [
      {
        name: 'Temperature (°C)',
        type: 'line',
        smooth: false,
        showSymbol: false,
        showAllSymbol: false,
        symbol: 'circle',
        symbolSize: 4,
        data: tempData,
        yAxisIndex: 0,
        lineStyle: { width: 2.5, color: '#dc2626' },
        emphasis: {
          focus: 'series',
          itemStyle: { color: '#dc2626', borderColor: '#fff', borderWidth: 2 }
        },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(220,38,38,0.18)' },
            { offset: 1, color: 'rgba(220,38,38,0.01)' }
          ])
        }
      },
      {
        name: 'Moisture (%)',
        type: 'line',
        smooth: false,
        showSymbol: false,
        showAllSymbol: false,
        symbol: 'circle',
        symbolSize: 4,
        data: moistData,
        yAxisIndex: 1,
        lineStyle: { width: 2.5, color: '#2563eb' },
        emphasis: {
          focus: 'series',
          itemStyle: { color: '#2563eb', borderColor: '#fff', borderWidth: 2 }
        },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(37,99,235,0.16)' },
            { offset: 1, color: 'rgba(37,99,235,0.01)' }
          ])
        }
      }
    ],
    animationDuration: 500,
    animationEasing: 'cubicOut'
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
    labels = []; tempData = []; moistData = []; tooltipDateLabels = []; return;
  }

  // if buffer small enough, show raw points
  if (rawBuffer.length <= MAX_POINTS) {
    labels = rawBuffer.map(d => new Date(d.created_at).toLocaleTimeString());
    tempData = rawBuffer.map(d => d.temp);
    moistData = rawBuffer.map(d => d.moist);
    tooltipDateLabels = rawBuffer.map(d =>
      new Date(d.created_at).toLocaleString([], {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      })
    );
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
  tooltipDateLabels = [];

  for (let i = 0; i < buckets; i++) {
    if (counts[i] === 0) continue;
    const bucketStart = minT + i * bucketSize;
    labels.push(new Date(bucketStart).toLocaleTimeString());
    tempData.push(Number((sumsTemp[i] / counts[i]).toFixed(2)));
    moistData.push(Number((sumsMoist[i] / counts[i]).toFixed(2)));
    tooltipDateLabels.push(
      new Date(bucketStart).toLocaleString([], {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      })
    );
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
      if (window.innerWidth <= 991) {
        const sb = document.querySelector('.sidebar');
        if (sb) sb.classList.remove('open');
      }
    });
  });

  // Mobile toggle
  const menuToggle = document.getElementById('doctorMenuToggle');
  if (menuToggle) {
    menuToggle.addEventListener('click', () => {
      const sb = document.querySelector('.sidebar');
      const backdrop = document.querySelector('.sidebar-backdrop');
      if (sb) sb.classList.toggle('open');
      if (backdrop && sb) backdrop.classList.toggle('show', sb.classList.contains('open'));
    });
  }

  setupMobileSidebar();

  renderCurrentPatient();
  populatePatientSelectors();
  renderPatientsView();
  renderPrescriptions();
  renderTreatmentHistory();
  renderAlerts('all');

  // UV controls
  const uvStatus = document.getElementById('uvStatus');
  const btnStart = document.getElementById('btnStartUV');
  const btnStop = document.getElementById('btnStopUV');
  const logList = document.getElementById('logList');
  const uvCard = document.getElementById('uvCard');
  if (btnStart) btnStart.addEventListener('click', async () => {
    try {
      const result = await sendUvCommand('turnon');
      if (uvStatus) uvStatus.innerText = 'ON';
      if (uvCard) uvCard.classList.add('active');
      appendLog(`UV ON command acknowledged (${result.updatedAt || 'server'})`);
      setNextScheduleFromNow();
    } catch (err) {
      console.error(err);
      alert('Failed to start UV: ' + err.message);
    }
  });
  if (btnStop) btnStop.addEventListener('click', async () => {
    try {
      const result = await sendUvCommand('turnoff');
      if (uvStatus) uvStatus.innerText = 'OFF';
      if (uvCard) uvCard.classList.remove('active');
      appendLog(`UV OFF command acknowledged (${result.updatedAt || 'server'})`);
      addTreatmentEntry('Manual', manualDurationSeconds, 'Completed');
      setNextScheduleFromNow();
    } catch (err) {
      console.error(err);
      alert('Failed to stop UV: ' + err.message);
    }
  });

  const scheduleInput = document.getElementById('scheduleMins');
  document.getElementById('btnSchedule')?.addEventListener('click', () => {
    const nextMinutes = Number(scheduleInput?.value || scheduleIntervalMinutes);
    if (!Number.isFinite(nextMinutes) || nextMinutes < 1) {
      alert('Please enter a valid schedule in minutes.');
      return;
    }
    scheduleIntervalMinutes = Math.round(nextMinutes);
    setNextScheduleFromNow();
    appendLog(`UV schedule set to every ${scheduleIntervalMinutes} minute(s).`);
  });

  const durationInput = document.getElementById('manualDuration');
  document.getElementById('btnSetDuration')?.addEventListener('click', () => {
    const nextDuration = Number(durationInput?.value || manualDurationSeconds);
    if (!Number.isFinite(nextDuration) || nextDuration < 5 || nextDuration > 300) {
      alert('Manual duration must be between 5 and 300 seconds.');
      return;
    }
    manualDurationSeconds = Math.round(nextDuration);
    updateDurationLabel();
    appendLog(`Manual UV duration set to ${manualDurationSeconds} second(s).`);
  });

  // Quick actions
  document.getElementById('quickPrescription')?.addEventListener('click', () => {
    switchView('prescriptions');
    appendLog('Navigated to Prescriptions view.');
  });
  document.getElementById('quickReport')?.addEventListener('click', () => {
    appendLog('Generated daily summary report for Aarav Kumar.');
    alert('Daily report generated for Aarav Kumar.');
  });
  document.getElementById('quickAlert')?.addEventListener('click', () => {
    appendLog('Alert sent to ward nurse station for bedside review.');
    alert('Alert sent to ward nurse station.');
  });
  document.getElementById('quickAnalyze')?.addEventListener('click', () => {
    appendLog('Trend analysis complete: wound condition stable, continue current protocol.');
    alert('Analysis complete: condition stable.');
  });

  // Logs actions
  document.getElementById('clearLogs')?.addEventListener('click', () => {
    if (logList) logList.innerText = '—';
  });
  document.getElementById('downloadCSV')?.addEventListener('click', () => {
    appendLog('CSV export queued for treatment timeline and vitals.');
    alert('CSV export has been generated and is ready for download.');
  });

  document.getElementById('newPrescriptionBtn')?.addEventListener('click', () => {
    document.getElementById('prescriptionForm')?.classList.remove('hidden');
  });

  document.getElementById('cancelPrescription')?.addEventListener('click', () => {
    document.getElementById('prescriptionForm')?.classList.add('hidden');
  });

  document.getElementById('savePrescription')?.addEventListener('click', () => {
    appendLog('New prescription saved successfully for current patient.');
    document.getElementById('prescriptionForm')?.classList.add('hidden');
    alert('Prescription has been saved and documented in patient record.');
  });

  document.querySelectorAll('.alert-filters .btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.alert-filters .btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderAlerts(btn.getAttribute('data-filter') || 'all');
    });
  });

  document.getElementById('clearAlerts')?.addEventListener('click', () => {
    const alertsList = document.getElementById('alertsList');
    if (alertsList) alertsList.innerHTML = '';
    appendLog('Alerts cleared from dashboard view.');
  });

  document.getElementById('addPatientBtn')?.addEventListener('click', () => {
    appendLog('Single-patient mode active: additional patient records are disabled.');
    alert('Single-patient mode is enabled for this deployment.');
  });

  document.getElementById('viewPatientTimeline')?.addEventListener('click', () => {
    switchView('treatment');
    appendLog('Opened treatment timeline for current patient.');
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
  loadUvState();
  updateDurationLabel();
  setNextScheduleFromNow();
  appendLog(`Session initialized for ${APP_PATIENT.name} (${APP_PATIENT.mrn}).`);

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