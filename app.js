// ==================================================
// HealTrack Prototype – app.js
// ==================================================

// === Global State ===
const state = {
    uvOn: false,
    readings: [],
    logs: [],
    alerts: [],
    treatments: [],
    prescriptions: [],
    patients: [],
    tempThreshold: 38.0,
    moistThreshold: 80,
    simInterval: 1500,
    currentPatient: null,
    nextSchedule: null,
    autoUvDuration: 45, // seconds for automatic UV treatment
    scheduledUvDuration: 60, // seconds for scheduled UV treatment
    manualUvDuration: 60, // seconds for manual UV treatment
    autoUvEnabled: true,
    maxUvPerDay: 8,
    uvIntensity: 'medium',
    currentUvTimer: null,
    uvStartTime: null
};

// === Charts ===
let doctorChart = null;
let simulationInterval = null;

// === Initialize App ===
function init() {
    console.log("🚀 Initializing HealTrack App...");
    
    // Initialize sample data FIRST
    initializeSampleData();
    
    // Setup ALL event listeners
    setupAllEventListeners();
    
    // Initialize charts
    initializeCharts();
    
    // Start simulation
    startSimulation();
    
    console.log("✅ App initialized successfully");
}

// === Initialize Sample Data ===
function initializeSampleData() {
    console.log("📊 Initializing sample data...");
    
    // Clear existing data
    state.readings = [];
    state.treatments = [];
    state.prescriptions = [];
    state.logs = [];
    state.alerts = [];
    state.patients = [];

    // Add initial patients with unique data patterns
    state.patients = [
        { 
            id: 'PT-001', 
            name: 'John Miller', 
            condition: 'Post-surgery wound', 
            status: 'healthy', 
            avatar: 'JM',
            baselineTemp: 36.5,
            baselineMoist: 65,
            tempVariation: 1.2,
            moistVariation: 15
        },
        { 
            id: 'PT-002', 
            name: 'Sarah Davis', 
            condition: 'Burn treatment', 
            status: 'warning', 
            avatar: 'SD',
            baselineTemp: 37.2,
            baselineMoist: 75,
            tempVariation: 1.8,
            moistVariation: 25
        },
        { 
            id: 'PT-003', 
            name: 'Robert Johnson', 
            condition: 'Diabetic ulcer', 
            status: 'critical', 
            avatar: 'RJ',
            baselineTemp: 38.1,
            baselineMoist: 85,
            tempVariation: 2.5,
            moistVariation: 35
        }
    ];
    
    // Set first patient as default
    state.currentPatient = state.patients[0].id;

    // Add initial readings for each patient
    state.patients.forEach(patient => {
        for (let i = 0; i < 20; i++) {
            const temp = patient.baselineTemp + Math.random() * patient.tempVariation;
            const moist = patient.baselineMoist + Math.random() * patient.moistVariation;
            const reading = {
                patientId: patient.id,
                ts: new Date(Date.now() - (20 - i) * 30000).toISOString(),
                temp: temp,
                moist: moist
            };
            state.readings.push(reading);
        }
    });
    
    // Add sample treatments for different patients
    state.treatments = [
        {
            patientId: 'PT-001',
            start: new Date(Date.now() - 3600000).toISOString(),
            stop: new Date(Date.now() - 3540000).toISOString(),
            duration: 60,
            mode: 'manual',
            status: 'Completed'
        },
        {
            patientId: 'PT-002',
            start: new Date(Date.now() - 7200000).toISOString(),
            stop: new Date(Date.now() - 7140000).toISOString(),
            duration: 60,
            mode: 'auto',
            status: 'Completed'
        },
        {
            patientId: 'PT-003',
            start: new Date(Date.now() - 10800000).toISOString(),
            stop: new Date(Date.now() - 10740000).toISOString(),
            duration: 60,
            mode: 'scheduled',
            status: 'Completed'
        }
    ];
    
    // Add sample prescriptions
    state.prescriptions = [
        {
            id: 'RX-001',
            patient: 'PT-001',
            date: '2025-03-15',
            medication: 'Amoxicillin 500mg - 1 tablet every 8 hours for 7 days',
            instructions: 'Take with food. Complete the full course even if symptoms improve.',
            notes: 'Monitor for any allergic reactions. Follow up in 7 days.',
            status: 'active',
            created: new Date('2025-03-15').toISOString()
        },
        {
            id: 'RX-002',
            patient: 'PT-002',
            date: '2025-03-10',
            medication: 'Silver Sulfadiazine cream - Apply twice daily',
            instructions: 'Clean wound with saline before application. Keep bandage dry.',
            notes: 'Significant improvement noted. Continue current treatment.',
            status: 'completed',
            created: new Date('2025-03-10').toISOString()
        },
        {
            id: 'RX-003',
            patient: 'PT-003',
            date: '2025-03-12',
            medication: 'Insulin - 10 units before breakfast and dinner',
            instructions: 'Monitor blood sugar levels 4 times daily. Report any hypoglycemia.',
            notes: 'Wound healing progressing slowly. Consider nutritional supplements.',
            status: 'active',
            created: new Date('2025-03-12').toISOString()
        }
    ];

    // Add initial logs
    state.logs = [
        { ts: new Date().toISOString(), msg: "System initialized successfully" },
        { ts: new Date(Date.now() - 300000).toISOString(), msg: "Patient vitals monitoring started" },
        { ts: new Date(Date.now() - 600000).toISOString(), msg: "UV treatment completed successfully" }
    ];

    // Add sample alerts
    state.alerts = [
        {
            patientId: 'PT-003',
            ts: new Date(Date.now() - 600000).toISOString(),
            msg: "High Temperature Alert - Patient temperature reached 39.2°C at 14:30. Infection risk detected.",
            type: 'critical'
        },
        {
            patientId: 'PT-002',
            ts: new Date(Date.now() - 7200000).toISOString(),
            msg: "Moisture Level High - Moisture level at 85%. Consider changing bandage.",
            type: 'warning'
        },
        {
            patientId: 'PT-001',
            ts: new Date(Date.now() - 18000000).toISOString(),
            msg: "UV Treatment Completed - Scheduled UV treatment completed successfully.",
            type: 'info'
        }
    ];

    console.log("✅ Sample data initialized");
}

// === Setup ALL Event Listeners ===
function setupAllEventListeners() {
    console.log("🔗 Setting up ALL event listeners...");
    
    // Doctor controls
    document.getElementById('btnStartUV').addEventListener('click', () => startUV('manual'));
    document.getElementById('btnStopUV').addEventListener('click', () => stopUV('manual'));
    document.getElementById('btnSchedule').addEventListener('click', scheduleUV);
    document.getElementById('btnSetDuration').addEventListener('click', setManualDuration);
    document.getElementById('downloadCSV').addEventListener('click', downloadCSV);
    document.getElementById('clearLogs').addEventListener('click', clearLogs);
    document.getElementById('clearAlerts').addEventListener('click', clearAlerts);
    
    // Quick actions
    document.getElementById('quickPrescription').addEventListener('click', showPrescriptionForm);
    document.getElementById('quickReport').addEventListener('click', generateReport);
    document.getElementById('quickAlert').addEventListener('click', sendQuickAlert);
    document.getElementById('quickAnalyze').addEventListener('click', analyzeData);
    
    // Settings
    document.getElementById('applySettings').addEventListener('click', applySettings);
    document.getElementById('resetSettings').addEventListener('click', resetSettings);
    
    // Prescription form
    document.getElementById('newPrescriptionBtn').addEventListener('click', showPrescriptionForm);
    document.getElementById('savePrescription').addEventListener('click', savePrescription);
    document.getElementById('cancelPrescription').addEventListener('click', hidePrescriptionForm);
    
    // Patient selection
    document.getElementById('currentPatientSelect').addEventListener('change', handlePatientChange);
    
    // Mobile navigation
    document.getElementById('doctorMenuToggle').addEventListener('click', toggleDoctorSidebar);
    
    // Settings tabs
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const tabId = e.target.dataset.tab;
            switchSettingsTab(tabId);
        });
    });
    
    // Alert filters
    document.querySelectorAll('.alert-filters .btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const filter = e.target.dataset.filter;
            filterAlerts(filter);
        });
    });
    
    // Setup navigation
    setupNavigation();
    
    // Add patient button
    document.getElementById('addPatientBtn').addEventListener('click', addNewPatient);
    
    console.log("✅ All event listeners setup complete");
}

// === Patient Selection ===
function handlePatientChange(event) {
    const patientId = event.target.value;
    if (patientId) {
        state.currentPatient = patientId;
        addLogEntry(`Switched to patient: ${getPatientName(patientId)}`);
        
        // Update all displays for the new patient
        refreshDashboard();
        refreshTreatment();
        refreshAlerts();
        updateCurrentPatientInfo();
        
        // Update prescription form patient dropdown
        updatePrescriptionPatientDropdown();
    }
}

function updatePatientDropdown() {
    const patientSelect = document.getElementById('currentPatientSelect');
    const prescriptionPatientSelect = document.getElementById('patientSelect');
    
    if (patientSelect) {
        patientSelect.innerHTML = '<option value="">Select Patient</option>' +
            state.patients.map(patient => 
                `<option value="${patient.id}" ${patient.id === state.currentPatient ? 'selected' : ''}>
                    ${patient.name} (${patient.id}) - ${patient.condition}
                 </option>`
            ).join('');
    }
    
    if (prescriptionPatientSelect) {
        prescriptionPatientSelect.innerHTML = '<option value="">Select Patient</option>' +
            state.patients.map(patient => 
                `<option value="${patient.id}">
                    ${patient.name} (${patient.id})
                 </option>`
            ).join('');
    }
}

function updateCurrentPatientInfo() {
    const patientInfoElement = document.getElementById('currentPatientInfo');
    const currentPatientNameElement = document.getElementById('currentPatientName');
    
    if (state.currentPatient) {
        const patient = state.patients.find(p => p.id === state.currentPatient);
        if (patient) {
            if (patientInfoElement) {
                patientInfoElement.innerHTML = `
                    <div class="patient-badge">
                        <i class="fas fa-user-injured"></i>
                        ${patient.name} • ${patient.condition}
                        <span class="status-${patient.status}">
                            <i class="fas fa-circle"></i> ${patient.status.toUpperCase()}
                        </span>
                    </div>
                `;
            }
            if (currentPatientNameElement) {
                currentPatientNameElement.textContent = patient.name;
            }
        }
    } else {
        if (patientInfoElement) patientInfoElement.innerHTML = '';
        if (currentPatientNameElement) currentPatientNameElement.textContent = '—';
    }
}

function updatePrescriptionPatientDropdown() {
    const prescriptionPatientSelect = document.getElementById('patientSelect');
    if (prescriptionPatientSelect && state.currentPatient) {
        prescriptionPatientSelect.value = state.currentPatient;
    }
}

function getPatientName(patientId) {
    const patient = state.patients.find(p => p.id === patientId);
    return patient ? patient.name : 'Unknown Patient';
}

function getCurrentPatientReadings() {
    return state.readings.filter(reading => reading.patientId === state.currentPatient);
}

function getCurrentPatientTreatments() {
    return state.treatments.filter(treatment => treatment.patientId === state.currentPatient);
}

function getCurrentPatientAlerts() {
    return state.alerts.filter(alert => alert.patientId === state.currentPatient);
}

function getCurrentPatientPrescriptions() {
    return state.prescriptions.filter(prescription => prescription.patient === state.currentPatient);
}

// === Navigation Setup ===
function setupNavigation() {
    const menuButtons = document.querySelectorAll('.menu-btn');
    
    menuButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            const viewName = e.currentTarget.dataset.view;
            console.log(`🔄 Switching to ${viewName} view`);
            
            // Update active menu button
            menuButtons.forEach(btn => btn.classList.remove('active'));
            e.currentTarget.classList.add('active');
            
            // Hide all views
            const views = document.querySelectorAll('.view');
            views.forEach(view => view.classList.add('hidden'));
            
            // Show target view
            const targetView = document.getElementById(viewName);
            if (targetView) {
                targetView.classList.remove('hidden');
            }
            
            // Update page title
            const pageTitle = document.querySelector('.page-title');
            if (pageTitle) {
                const title = viewName.charAt(0).toUpperCase() + viewName.slice(1);
                pageTitle.textContent = title;
            }
            
            // Refresh the view data
            refreshView(viewName);
        });
    });
}

// === Refresh View Data ===
function refreshView(viewName) {
    console.log(`🔄 Refreshing ${viewName}`);
    
    switch(viewName) {
        case 'dashboard':
            refreshDashboard();
            break;
        case 'prescriptions':
            refreshPrescriptions();
            break;
        case 'treatment':
            refreshTreatment();
            break;
        case 'alerts':
            refreshAlerts();
            break;
        case 'patients':
            refreshPatients();
            break;
        case 'settings':
            refreshSettings();
            break;
    }
}

// === Refresh Functions ===
function refreshDashboard() {
    console.log("📊 Refreshing dashboard...");
    
    // Update patient dropdown and info
    updatePatientDropdown();
    updateCurrentPatientInfo();
    
    // Update vitals display with latest reading for current patient
    const currentReadings = getCurrentPatientReadings();
    if (currentReadings.length > 0) {
        const lastReading = currentReadings[currentReadings.length - 1];
        updateVitalsDisplay(lastReading);
    } else {
        // No readings for current patient
        updateVitalsDisplay({ temp: 0, moist: 0, ts: new Date().toISOString() });
    }
    
    // Update UV status
    updateUVDisplay();
    
    // Update health status
    updateHealthStatus();
    
    // Update charts
    updateCharts();
    
    // Update logs
    refreshLogs();
}

function refreshTreatment() {
    console.log("💊 Refreshing treatment view...");
    
    const doctorTable = document.querySelector('#treatmentTable tbody');
    const currentTreatments = getCurrentPatientTreatments();
    
    if (doctorTable) {
        if (currentTreatments.length === 0) {
            doctorTable.innerHTML = `<tr><td colspan="7" class="muted" style="text-align: center;">No treatments recorded for current patient</td></tr>`;
        } else {
            doctorTable.innerHTML = currentTreatments.map((treatment, index) => `
                <tr>
                    <td>${index + 1}</td>
                    <td>${getPatientName(treatment.patientId)}</td>
                    <td>${formatTime(treatment.start)}</td>
                    <td>${treatment.stop ? formatTime(treatment.stop) : '-'}</td>
                    <td>${treatment.duration ? treatment.duration.toFixed(1) : '-'}</td>
                    <td>${treatment.mode}</td>
                    <td><span class="status-badge ${treatment.status === 'Completed' ? 'completed' : 'in-progress'}">${treatment.status}</span></td>
                </tr>
            `).join('');
        }
    }
    
    // Update treatment stats for current patient
    updateTreatmentStats();
}

function refreshPrescriptions() {
    console.log("📝 Refreshing prescriptions...");
    
    const doctorList = document.getElementById('prescriptionsList');
    const currentPrescriptions = getCurrentPatientPrescriptions();
    
    if (doctorList) {
        if (currentPrescriptions.length === 0) {
            doctorList.innerHTML = '<div class="muted">No prescriptions for current patient. Create your first one!</div>';
        } else {
            doctorList.innerHTML = currentPrescriptions.map(prescription => {
                const patient = state.patients.find(p => p.id === prescription.patient);
                return `
                    <div class="prescription-item">
                        <div class="prescription-header">
                            <div>
                                <h4>${prescription.medication.split(' - ')[0] || 'Prescription'}</h4>
                                <p class="muted">For: ${patient ? patient.name : prescription.patient} • Date: ${prescription.date}</p>
                            </div>
                            <div class="prescription-status ${prescription.status}">${prescription.status.charAt(0).toUpperCase() + prescription.status.slice(1)}</div>
                        </div>
                        <div class="prescription-content">
                            <p><strong>Medication:</strong> ${prescription.medication}</p>
                            ${prescription.instructions ? `<p><strong>Instructions:</strong> ${prescription.instructions}</p>` : ''}
                            ${prescription.notes ? `<p><strong>Notes:</strong> ${prescription.notes}</p>` : ''}
                        </div>
                    </div>
                `;
            }).join('');
        }
    }
}

function refreshAlerts() {
    console.log("🚨 Refreshing alerts...");
    
    const alertsList = document.getElementById('alertsList');
    const currentAlerts = getCurrentPatientAlerts();
    
    if (alertsList) {
        if (currentAlerts.length === 0) {
            alertsList.innerHTML = '<div class="muted">No alerts for current patient — system is quiet.</div>';
        } else {
            alertsList.innerHTML = currentAlerts.map(alert => `
                <div class="alert-item ${alert.type}">
                    <div class="alert-icon">
                        <i class="fas ${alert.type === 'critical' ? 'fa-exclamation-triangle' : alert.type === 'warning' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
                    </div>
                    <div class="alert-content">
                        <h4>${alert.type.charAt(0).toUpperCase() + alert.type.slice(1)} Alert</h4>
                        <p>${alert.msg}</p>
                        <span class="alert-time">${formatTime(alert.ts)}</span>
                    </div>
                    <div class="alert-actions">
                        <button class="btn small resolve-alert">
                            <i class="fas fa-check"></i> <span>Resolve</span>
                        </button>
                    </div>
                </div>
            `).join('');
            
            // Add event listeners for resolve buttons
            document.querySelectorAll('.resolve-alert').forEach(btn => {
                btn.addEventListener('click', function() {
                    const alertItem = this.closest('.alert-item');
                    const alertText = alertItem.querySelector('p').textContent;
                    
                    // Remove from state
                    state.alerts = state.alerts.filter(a => a.msg !== alertText);
                    
                    // Remove from DOM
                    alertItem.remove();
                    
                    // Show no alerts message if empty
                    if (document.querySelectorAll('.alert-item').length === 0) {
                        alertsList.innerHTML = '<div class="muted">No alerts for current patient — system is quiet.</div>';
                    }
                });
            });
        }
    }
}

function refreshLogs() {
    console.log("📋 Refreshing logs...");
    
    const logList = document.getElementById('logList');
    if (logList) {
        logList.innerHTML = state.logs.map(log => `
            <div class="log-item">${formatTime(log.ts)} — ${log.msg}</div>
        `).join('');
    }
}

function refreshPatients() {
    console.log("👥 Refreshing patients...");
    
    const patientsList = document.getElementById('patientsList');
    if (patientsList) {
        if (state.patients.length === 0) {
            patientsList.innerHTML = '<div class="muted">No patients yet. Add your first patient!</div>';
        } else {
            patientsList.innerHTML = state.patients.map(patient => `
                <div class="patient-card">
                    <div class="patient-info">
                        <div class="patient-avatar">${patient.avatar}</div>
                        <div class="patient-details">
                            <h4>${patient.name}</h4>
                            <p class="muted">ID: ${patient.id} • ${patient.condition}</p>
                            <div class="patient-status ${patient.status}">
                                <i class="fas fa-circle"></i> ${patient.status === 'healthy' ? 'Stable' : patient.status === 'warning' ? 'Needs attention' : 'Critical'}
                            </div>
                            <div class="patient-quick-stats">
                                <div class="quick-stat">
                                    <div class="quick-stat-value">${getCurrentPatientReadings().length}</div>
                                    <div class="quick-stat-label">Readings</div>
                                </div>
                                <div class="quick-stat">
                                    <div class="quick-stat-value">${getCurrentPatientTreatments().length}</div>
                                    <div class="quick-stat-label">Treatments</div>
                                </div>
                                <div class="quick-stat">
                                    <div class="quick-stat-value">${getCurrentPatientAlerts().length}</div>
                                    <div class="quick-stat-label">Alerts</div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="patient-actions">
                        <button class="btn small set-current-patient" data-id="${patient.id}"><i class="fas fa-eye"></i> <span class="action-text">View</span></button>
                        <button class="btn small edit-patient" data-id="${patient.id}"><i class="fas fa-edit"></i> <span class="action-text">Edit</span></button>
                    </div>
                </div>
            `).join('');
            
            // Add event listeners for patient buttons
            document.querySelectorAll('.set-current-patient').forEach(btn => {
                btn.addEventListener('click', function() {
                    const patientId = this.dataset.id;
                    document.getElementById('currentPatientSelect').value = patientId;
                    handlePatientChange({ target: document.getElementById('currentPatientSelect') });
                });
            });
            
            document.querySelectorAll('.edit-patient').forEach(btn => {
                btn.addEventListener('click', function() {
                    const patientId = this.dataset.id;
                    editPatient(patientId);
                });
            });
        }
    }
}

function refreshSettings() {
    console.log("⚙️ Refreshing settings...");
    
    // Populate UV settings
    document.getElementById('autoUvDuration').value = state.autoUvDuration;
    document.getElementById('scheduledUvDuration').value = state.scheduledUvDuration;
    document.getElementById('autoUvEnabled').checked = state.autoUvEnabled;
    document.getElementById('maxUvPerDay').value = state.maxUvPerDay;
    document.getElementById('uvIntensity').value = state.uvIntensity;
}

// === UV Control Functions ===
function startUV(mode = "manual") {
    if (state.uvOn) return;
    
    state.uvOn = true;
    state.uvStartTime = new Date();
    
    // Determine duration based on mode
    let duration;
    if (mode === 'auto') {
        duration = state.autoUvDuration;
    } else if (mode === 'scheduled') {
        duration = state.scheduledUvDuration;
    } else {
        duration = state.manualUvDuration;
    }
    
    addLogEntry(`UV light turned ON (${mode}) for ${duration} seconds for patient ${getPatientName(state.currentPatient)}`);
    
    state.treatments.push({
        patientId: state.currentPatient,
        start: new Date().toISOString(),
        stop: null,
        duration: null,
        mode: mode,
        status: 'In Progress',
        scheduledDuration: duration
    });
    
    updateUVDisplay();
    refreshTreatment();
    addAlert(`UV treatment started (${mode}) for ${duration} seconds`, 'info');
    
    // Set auto-stop timer if not manual stop
    if (mode !== 'manual') {
        state.currentUvTimer = setTimeout(() => {
            stopUV(mode);
        }, duration * 1000);
    }
    
    // Update duration display
    updateUvDurationDisplay(duration);
}

function stopUV(mode = "manual") {
    if (!state.uvOn) return;
    
    state.uvOn = false;
    
    // Clear any running timer
    if (state.currentUvTimer) {
        clearTimeout(state.currentUvTimer);
        state.currentUvTimer = null;
    }
    
    const actualDuration = state.uvStartTime ? 
        Math.round((new Date() - state.uvStartTime) / 1000) : 0;
    
    addLogEntry(`UV light turned OFF (${mode}) after ${actualDuration} seconds for patient ${getPatientName(state.currentPatient)}`);
    
    // Update the last treatment
    const lastTreatment = state.treatments[state.treatments.length - 1];
    if (lastTreatment && !lastTreatment.stop) {
        lastTreatment.stop = new Date().toISOString();
        lastTreatment.duration = actualDuration;
        lastTreatment.status = 'Completed';
    }
    
    updateUVDisplay();
    refreshTreatment();
    addAlert(`UV treatment completed (${mode}) - ${actualDuration} seconds`, 'info');
    
    // Clear duration display
    updateUvDurationDisplay(null);
}

function scheduleUV() {
    const minsInput = document.getElementById('scheduleMins');
    const mins = parseInt(minsInput.value) || 5;
    const delay = mins * 60000;
    const nextTime = new Date(Date.now() + delay);
    
    state.nextSchedule = nextTime;
    
    addLogEntry(`UV scheduled in ${mins} minutes for ${state.scheduledUvDuration} seconds for patient ${getPatientName(state.currentPatient)}`);
    addAlert(`UV scheduled for ${formatTime(nextTime)} (${state.scheduledUvDuration} seconds)`, 'info');
    
    // Update next schedule display
    const nextScheduleElement = document.getElementById('nextSchedule');
    if (nextScheduleElement) nextScheduleElement.textContent = formatTime(nextTime);
    
    // Schedule the UV treatment
    setTimeout(() => {
        startUV('scheduled');
    }, delay);
}

function setManualDuration() {
    const durationInput = document.getElementById('manualDuration');
    const duration = parseInt(durationInput.value) || 60;
    
    if (duration < 5 || duration > 300) {
        alert('Duration must be between 5 and 300 seconds');
        return;
    }
    
    state.manualUvDuration = duration;
    addLogEntry(`Manual UV duration set to ${duration} seconds`);
    addAlert(`Manual UV duration updated to ${duration} seconds`, 'info');
    
    // If UV is currently on, update the display
    if (state.uvOn) {
        updateUvDurationDisplay(duration);
    }
}

function updateUvDurationDisplay(duration) {
    const durationElement = document.getElementById('uvDuration');
    if (durationElement) {
        if (duration) {
            durationElement.textContent = `Duration: ${duration}s`;
            durationElement.style.display = 'block';
        } else {
            durationElement.textContent = 'Duration: --';
            durationElement.style.display = 'none';
        }
    }
}

// === Prescription Functions ===
function showPrescriptionForm() {
    const form = document.getElementById('prescriptionForm');
    const newBtn = document.getElementById('newPrescriptionBtn');
    
    if (form) form.classList.remove('hidden');
    if (newBtn) newBtn.style.display = 'none';
    
    // Set default date and current patient
    const dateInput = document.getElementById('prescriptionDate');
    if (dateInput) {
        dateInput.value = new Date().toISOString().split('T')[0];
    }
    
    updatePrescriptionPatientDropdown();
}

function hidePrescriptionForm() {
    const form = document.getElementById('prescriptionForm');
    const newBtn = document.getElementById('newPrescriptionBtn');
    
    if (form) {
        form.classList.add('hidden');
        form.reset();
    }
    if (newBtn) newBtn.style.display = 'block';
}

function savePrescription() {
    const patientSelect = document.getElementById('patientSelect');
    const dateInput = document.getElementById('prescriptionDate');
    const medicationInput = document.getElementById('medication');
    const instructionsInput = document.getElementById('instructions');
    const notesInput = document.getElementById('notes');
    
    if (!patientSelect.value || !medicationInput.value) {
        alert('Please fill in patient and medication fields.');
        return;
    }
    
    const newPrescription = {
        id: 'RX-' + Date.now(),
        patient: patientSelect.value,
        date: dateInput.value,
        medication: medicationInput.value,
        instructions: instructionsInput.value,
        notes: notesInput.value,
        status: 'active',
        created: new Date().toISOString()
    };
    
    state.prescriptions.unshift(newPrescription);
    addLogEntry(`New prescription created for patient ${getPatientName(patientSelect.value)}`);
    addAlert(`New prescription created`, 'info');
    
    hidePrescriptionForm();
    refreshPrescriptions();
}

// === Patient Functions ===
function addNewPatient() {
    const name = prompt("Enter patient name:");
    if (!name) return;
    
    const condition = prompt("Enter patient condition:");
    if (!condition) return;
    
    const id = 'PT-' + (state.patients.length + 1).toString().padStart(3, '0');
    const avatar = name.split(' ').map(n => n[0]).join('').toUpperCase();
    
    const newPatient = {
        id: id,
        name: name,
        condition: condition,
        status: 'healthy',
        avatar: avatar,
        baselineTemp: 36.5 + Math.random() * 1.5,
        baselineMoist: 60 + Math.random() * 20,
        tempVariation: 1.0 + Math.random() * 1.5,
        moistVariation: 15 + Math.random() * 20
    };
    
    state.patients.push(newPatient);
    addLogEntry(`New patient added: ${name}`);
    addAlert(`Patient ${name} added successfully`, 'info');
    
    // Add some initial readings for the new patient
    for (let i = 0; i < 10; i++) {
        const temp = newPatient.baselineTemp + Math.random() * newPatient.tempVariation;
        const moist = newPatient.baselineMoist + Math.random() * newPatient.moistVariation;
        const reading = {
            patientId: id,
            ts: new Date(Date.now() - (10 - i) * 30000).toISOString(),
            temp: temp,
            moist: moist
        };
        state.readings.push(reading);
    }
    
    refreshPatients();
    updatePatientDropdown();
}

function editPatient(patientId) {
    const patient = state.patients.find(p => p.id === patientId);
    if (patient) {
        const newName = prompt("Edit patient name:", patient.name);
        if (newName) patient.name = newName;
        
        const newCondition = prompt("Edit patient condition:", patient.condition);
        if (newCondition) patient.condition = newCondition;
        
        addLogEntry(`Patient ${patientId} updated`);
        addAlert(`Patient ${patient.name} updated successfully`, 'info');
        
        refreshPatients();
        updatePatientDropdown();
        updateCurrentPatientInfo();
    }
}

// === Quick Actions ===
function generateReport() {
    addLogEntry(`Patient report generated for ${getPatientName(state.currentPatient)}`);
    addAlert('Report generated successfully', 'info');
    
    // Simulate report generation
    setTimeout(() => {
        alert(`Report generated for ${getPatientName(state.currentPatient)}! This would typically download a PDF or CSV file.`);
    }, 1000);
}

function sendQuickAlert() {
    const message = prompt('Enter alert message for patient:');
    if (message) {
        addLogEntry(`Doctor alert sent for ${getPatientName(state.currentPatient)}: ${message}`);
        addAlert(`Doctor: ${message}`, 'warning');
    }
}

function analyzeData() {
    addLogEntry(`Data analysis completed for ${getPatientName(state.currentPatient)}`);
    addAlert('Analysis complete - no critical issues found', 'info');
    
    // Simulate analysis
    setTimeout(() => {
        alert(`Data analysis completed for ${getPatientName(state.currentPatient)}. All parameters within normal ranges.`);
    }, 1500);
}

// === Settings Functions ===
function applySettings() {
    const tempThreshold = parseFloat(document.getElementById('thTemp').value);
    const moistThreshold = parseInt(document.getElementById('thMoist').value);
    const simInterval = parseInt(document.getElementById('simInterval').value);
    const autoUvDuration = parseInt(document.getElementById('autoUvDuration').value);
    const scheduledUvDuration = parseInt(document.getElementById('scheduledUvDuration').value);
    const autoUvEnabled = document.getElementById('autoUvEnabled').checked;
    const maxUvPerDay = parseInt(document.getElementById('maxUvPerDay').value);
    const uvIntensity = document.getElementById('uvIntensity').value;
    
    if (!isNaN(tempThreshold)) state.tempThreshold = tempThreshold;
    if (!isNaN(moistThreshold)) state.moistThreshold = moistThreshold;
    if (!isNaN(simInterval)) state.simInterval = simInterval;
    if (!isNaN(autoUvDuration) && autoUvDuration >= 5 && autoUvDuration <= 300) {
        state.autoUvDuration = autoUvDuration;
    }
    if (!isNaN(scheduledUvDuration) && scheduledUvDuration >= 5 && scheduledUvDuration <= 300) {
        state.scheduledUvDuration = scheduledUvDuration;
    }
    if (!isNaN(maxUvPerDay) && maxUvPerDay >= 1 && maxUvPerDay <= 20) {
        state.maxUvPerDay = maxUvPerDay;
    }
    
    state.autoUvEnabled = autoUvEnabled;
    state.uvIntensity = uvIntensity;
    
    addLogEntry('Settings updated');
    addAlert('Settings applied successfully', 'info');
    
    // Restart simulation with new interval
    stopSimulation();
    startSimulation();
}

function resetSettings() {
    document.getElementById('thTemp').value = 38.0;
    document.getElementById('thMoist').value = 80;
    document.getElementById('simInterval').value = 1500;
    document.getElementById('autoUvDuration').value = 45;
    document.getElementById('scheduledUvDuration').value = 60;
    document.getElementById('autoUvEnabled').checked = true;
    document.getElementById('maxUvPerDay').value = 8;
    document.getElementById('uvIntensity').value = 'medium';
    
    addLogEntry('Settings reset to defaults');
    addAlert('Settings reset', 'info');
}

function switchSettingsTab(tabId) {
    // Update active tab
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelector(`.tab-btn[data-tab="${tabId}"]`).classList.add('active');
    
    // Show corresponding content
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    document.getElementById(tabId + 'Tab').classList.add('active');
}

function filterAlerts(filter) {
    const alertItems = document.querySelectorAll('.alert-item');
    const filterButtons = document.querySelectorAll('.alert-filters .btn');
    
    // Update active filter button
    filterButtons.forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    
    // Show/hide alerts based on filter
    alertItems.forEach(item => {
        if (filter === 'all' || item.classList.contains(filter)) {
            item.style.display = 'flex';
        } else {
            item.style.display = 'none';
        }
    });
}

// === Data Functions ===
function downloadCSV() {
    const currentReadings = getCurrentPatientReadings();
    const csv = ['timestamp,temp,moist'];
    currentReadings.forEach(reading => {
        csv.push(`${reading.ts},${reading.temp.toFixed(2)},${reading.moist.toFixed(1)}`);
    });
    
    const blob = new Blob([csv.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `healtrack_data_${state.currentPatient}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    
    addLogEntry(`CSV data downloaded for ${getPatientName(state.currentPatient)}`);
    addAlert('Data exported successfully', 'info');
}

function clearLogs() {
    state.logs = [];
    refreshLogs();
    addLogEntry('Logs cleared');
}

function clearAlerts() {
    state.alerts = state.alerts.filter(alert => alert.patientId !== state.currentPatient);
    refreshAlerts();
    addLogEntry('Alerts cleared for current patient');
}

// === Display Update Functions ===
function updateVitalsDisplay(reading) {
    // Update doctor view
    const doctorElements = {
        tempVal: document.getElementById('tempVal'),
        moistVal: document.getElementById('moistVal'),
        tempDesc: document.getElementById('tempDesc'),
        moistDesc: document.getElementById('moistDesc'),
        lastUpdate: document.getElementById('lastUpdate')
    };
    
    // Update doctor elements
    if (doctorElements.tempVal) {
        doctorElements.tempVal.textContent = reading.temp > 0 ? `${reading.temp.toFixed(1)} °C` : '-- °C';
    }
    if (doctorElements.moistVal) {
        doctorElements.moistVal.textContent = reading.moist > 0 ? `${reading.moist.toFixed(0)} %` : '-- %';
    }
    if (doctorElements.tempDesc) {
        doctorElements.tempDesc.textContent = reading.temp >= state.tempThreshold ? 'High' : 'Normal';
        doctorElements.tempDesc.style.color = reading.temp >= state.tempThreshold ? '#d32f2f' : '#2e7d32';
    }
    if (doctorElements.moistDesc) {
        doctorElements.moistDesc.textContent = reading.moist >= state.moistThreshold ? 'High' : 'Normal';
        doctorElements.moistDesc.style.color = reading.moist >= state.moistThreshold ? '#d32f2f' : '#2e7d32';
    }
    if (doctorElements.lastUpdate) doctorElements.lastUpdate.textContent = formatTime(reading.ts);
}

function updateUVDisplay() {
    const uvStatusElement = document.getElementById('uvStatus');
    const uvCardElement = document.getElementById('uvCard');
    
    if (uvStatusElement) uvStatusElement.textContent = state.uvOn ? 'ON' : 'OFF';
    
    if (uvCardElement) {
        if (state.uvOn) {
            uvCardElement.classList.add('active');
        } else {
            uvCardElement.classList.remove('active');
        }
    }
    
    // Update next schedule
    const nextScheduleElement = document.getElementById('nextSchedule');
    if (nextScheduleElement && state.nextSchedule) {
        nextScheduleElement.textContent = formatTime(state.nextSchedule);
    }
}

function updateHealthStatus() {
    const currentReadings = getCurrentPatientReadings();
    if (currentReadings.length === 0) return;
    
    const lastReading = currentReadings[currentReadings.length - 1];
    const isInfected = lastReading.temp >= state.tempThreshold || lastReading.moist >= state.moistThreshold;
    
    const healthIcon = document.getElementById('healthIcon');
    const healthLabel = document.getElementById('healthLabel');
    
    if (isInfected) {
        if (healthIcon) healthIcon.innerHTML = '<i class="fas fa-heartbeat" style="color: #d32f2f;"></i>';
        if (healthLabel) {
            healthLabel.textContent = 'AT RISK';
            healthLabel.style.color = '#d32f2f';
        }
        
        // Auto-start UV treatment if enabled
        if (state.autoUvEnabled && !state.uvOn) {
            startUV('auto');
        }
    } else {
        if (healthIcon) healthIcon.innerHTML = '<i class="fas fa-heartbeat" style="color: #2e7d32;"></i>';
        if (healthLabel) {
            healthLabel.textContent = 'HEALTHY';
            healthLabel.style.color = '#2e7d32';
        }
    }
}

function updateTreatmentStats() {
    const currentTreatments = getCurrentPatientTreatments();
    const totalTreatments = currentTreatments.length;
    const completedTreatments = currentTreatments.filter(t => t.status === 'Completed').length;
    const autoTreatments = currentTreatments.filter(t => t.mode === 'auto').length;
    const totalDuration = currentTreatments.reduce((sum, t) => sum + (t.duration || 0), 0);
    const avgDuration = completedTreatments > 0 ? (totalDuration / completedTreatments / 60).toFixed(1) : '0';
    const successRate = totalTreatments > 0 ? Math.round((completedTreatments / totalTreatments) * 100) : 0;
    
    // Update doctor stats
    const doctorStats = {
        totalTreatments: document.getElementById('totalTreatments'),
        avgDuration: document.getElementById('avgDuration'),
        successRate: document.getElementById('successRate'),
        autoTreatments: document.getElementById('autoTreatments')
    };
    
    if (doctorStats.totalTreatments) doctorStats.totalTreatments.textContent = totalTreatments;
    if (doctorStats.avgDuration) doctorStats.avgDuration.textContent = avgDuration;
    if (doctorStats.successRate) doctorStats.successRate.textContent = `${successRate}%`;
    if (doctorStats.autoTreatments) doctorStats.autoTreatments.textContent = autoTreatments;
}

// === Chart Functions ===
function initializeCharts() {
    console.log("📈 Initializing charts...");
    
    // Doctor chart
    const doctorCtx = document.getElementById('trendChart');
    if (doctorCtx) {
        doctorChart = new Chart(doctorCtx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [
                    {
                        label: 'Temperature (°C)',
                        data: [],
                        borderColor: '#d32f2f',
                        backgroundColor: 'rgba(211, 47, 47, 0.1)',
                        tension: 0.3,
                        fill: true,
                        yAxisID: 'y'
                    },
                    {
                        label: 'Moisture (%)',
                        data: [],
                        borderColor: '#1976d2',
                        backgroundColor: 'rgba(25, 118, 210, 0.1)',
                        tension: 0.3,
                        fill: true,
                        yAxisID: 'y1'
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: { display: false },
                    y: {
                        type: 'linear',
                        display: true,
                        position: 'left',
                        title: {
                            display: true,
                            text: 'Temperature (°C)'
                        }
                    },
                    y1: {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        title: {
                            display: true,
                            text: 'Moisture (%)'
                        },
                        grid: {
                            drawOnChartArea: false
                        }
                    }
                },
                plugins: {
                    legend: { position: 'bottom' }
                }
            }
        });
    }
    
    console.log("✅ Charts initialized");
}

function updateCharts() {
    if (doctorChart) {
        const currentReadings = getCurrentPatientReadings();
        doctorChart.data.labels = currentReadings.map((_, i) => '');
        doctorChart.data.datasets[0].data = currentReadings.map(r => r.temp);
        doctorChart.data.datasets[1].data = currentReadings.map(r => r.moist);
        doctorChart.update('none');
    }
}

// === Simulation ===
function startSimulation() {
    if (simulationInterval) {
        clearInterval(simulationInterval);
    }
    
    simulationInterval = setInterval(() => {
        if (state.currentPatient) {
            const patient = state.patients.find(p => p.id === state.currentPatient);
            if (patient) {
                const temp = patient.baselineTemp + Math.random() * patient.tempVariation;
                const moist = patient.baselineMoist + Math.random() * patient.moistVariation;
                
                const newReading = {
                    patientId: state.currentPatient,
                    ts: new Date().toISOString(),
                    temp: temp,
                    moist: moist
                };
                
                state.readings.push(newReading);
                
                // Keep only last 120 readings per patient
                const patientReadings = state.readings.filter(r => r.patientId === state.currentPatient);
                if (patientReadings.length > 120) {
                    const excess = patientReadings.length - 120;
                    state.readings = state.readings.filter((r, index) => 
                        r.patientId !== state.currentPatient || index >= excess
                    );
                }
                
                // Update displays
                updateVitalsDisplay(newReading);
                updateHealthStatus();
                updateCharts();
            }
        }
    }, state.simInterval);
    
    addLogEntry('Simulation started');
}

function stopSimulation() {
    if (simulationInterval) {
        clearInterval(simulationInterval);
        simulationInterval = null;
        addLogEntry('Simulation stopped');
    }
}

// === Utility Functions ===
function addLogEntry(message) {
    const logEntry = {
        ts: new Date().toISOString(),
        msg: message
    };
    
    state.logs.unshift(logEntry);
    
    // Keep only last 50 logs
    if (state.logs.length > 50) {
        state.logs.pop();
    }
    
    refreshLogs();
}

function addAlert(message, type = 'info') {
    const alert = {
        patientId: state.currentPatient,
        ts: new Date().toISOString(),
        msg: message,
        type: type
    };
    
    state.alerts.unshift(alert);
    refreshAlerts();
}

function formatTime(timestamp) {
    return new Date(timestamp).toLocaleTimeString('en-US', {
        hour12: true,
        hour: '2-digit',
        minute: '2-digit'
    });
}

// === Mobile Navigation ===
function toggleDoctorSidebar() {
    const sidebar = document.querySelector('.sidebar');
    sidebar.classList.toggle('open');
}

// Close sidebar when clicking outside on mobile
document.addEventListener('click', (event) => {
    if (window.innerWidth <= 991) {
        const sidebar = document.querySelector('.sidebar');
        const toggle = document.getElementById('doctorMenuToggle');
        
        if (sidebar && sidebar.classList.contains('open') &&
            !sidebar.contains(event.target) &&
            !toggle.contains(event.target)) {
            sidebar.classList.remove('open');
        }
    }
});

// === Initialize App ===
document.addEventListener('DOMContentLoaded', init);