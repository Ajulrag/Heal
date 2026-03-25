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