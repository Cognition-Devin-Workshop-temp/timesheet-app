// Garbage Tracker Frontend Application

const API_BASE = '/api';
let map = null;
let markers = [];

// Navigation
document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const view = btn.dataset.view;
    switchView(view);
  });
});

function switchView(view) {
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.querySelector(`[data-view="${view}"]`).classList.add('active');
  document.getElementById(`${view}-view`).classList.add('active');

  if (view === 'map') initMap();
  if (view === 'dashboard') loadDashboard();
  if (view === 'list') loadReports();
}

// Toast notifications
function showToast(message, isError = false) {
  const toast = document.createElement('div');
  toast.className = `toast${isError ? ' error' : ''}`;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

// Dashboard
async function loadDashboard() {
  try {
    const res = await fetch(`${API_BASE}/stats`);
    const { data } = await res.json();

    document.getElementById('stat-total').textContent = data.total;
    document.getElementById('stat-reported').textContent = data.byStatus.reported || 0;
    document.getElementById('stat-progress').textContent = data.byStatus.in_progress || 0;
    document.getElementById('stat-cleaned').textContent = data.byStatus.cleaned || 0;
    document.getElementById('stat-week').textContent = data.lastWeek;
    document.getElementById('stat-week-cleaned').textContent = data.cleanedLastWeek;

    // Severity breakdown
    const severityDiv = document.getElementById('severity-breakdown');
    severityDiv.innerHTML = Object.entries(data.bySeverity)
      .map(([sev, count]) => `<p><span class="badge badge-${sev}">${sev}</span> ${count} reports</p>`)
      .join('') || '<p>No reports yet</p>';

    // Recent reports
    const recentDiv = document.getElementById('recent-reports');
    if (data.recentReports.length === 0) {
      recentDiv.innerHTML = '<p>No reports yet. Be the first to report garbage in your area!</p>';
    } else {
      recentDiv.innerHTML = data.recentReports.map(r => `
        <div class="report-item">
          <div class="report-info">
            <h4>${r.description.substring(0, 60)}${r.description.length > 60 ? '...' : ''}</h4>
            <p><span class="badge badge-${r.status}">${r.status.replace('_', ' ')}</span>
               <span class="badge badge-${r.severity}">${r.severity}</span></p>
            <p>${r.address || `${r.latitude.toFixed(4)}, ${r.longitude.toFixed(4)}`} &middot; ${timeAgo(r.created_at)}</p>
          </div>
        </div>
      `).join('');
    }
  } catch (err) {
    console.error('Failed to load dashboard:', err);
  }
}

// Map
function initMap() {
  if (map) {
    map.invalidateSize();
    loadMapMarkers();
    return;
  }

  map = L.map('map').setView([20.5937, 78.9629], 5); // Default to India

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map);

  // Try to center on user location
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(pos => {
      map.setView([pos.coords.latitude, pos.coords.longitude], 13);
    });
  }

  loadMapMarkers();
}

async function loadMapMarkers() {
  try {
    const res = await fetch(`${API_BASE}/reports`);
    const { data } = await res.json();

    // Clear existing markers
    markers.forEach(m => map.removeLayer(m));
    markers = [];

    data.forEach(report => {
      const color = getStatusColor(report.status);
      const marker = L.circleMarker([report.latitude, report.longitude], {
        radius: 8,
        fillColor: color,
        color: '#fff',
        weight: 2,
        opacity: 1,
        fillOpacity: 0.8
      }).addTo(map);

      marker.bindPopup(`
        <strong>${report.description.substring(0, 80)}</strong><br>
        <span style="color:${color};font-weight:bold">${report.status.replace('_', ' ')}</span> |
        Severity: ${report.severity}<br>
        ${report.address || `${report.latitude.toFixed(4)}, ${report.longitude.toFixed(4)}`}<br>
        <small>${timeAgo(report.created_at)}</small>
        ${report.photo_url ? `<br><img src="${report.photo_url}" style="max-width:150px;margin-top:5px;border-radius:4px">` : ''}
      `);

      markers.push(marker);
    });
  } catch (err) {
    console.error('Failed to load map markers:', err);
  }
}

function getStatusColor(status) {
  switch (status) {
    case 'reported': return '#e63946';
    case 'in_progress': return '#f77f00';
    case 'cleaned': return '#2d6a4f';
    case 'invalid': return '#6c757d';
    default: return '#6c757d';
  }
}

// Report Form
document.getElementById('get-location-btn').addEventListener('click', () => {
  if (!navigator.geolocation) {
    showToast('Geolocation not supported by your browser', true);
    return;
  }

  navigator.geolocation.getCurrentPosition(
    pos => {
      document.getElementById('latitude').value = pos.coords.latitude.toFixed(6);
      document.getElementById('longitude').value = pos.coords.longitude.toFixed(6);
      showToast('Location detected!');
    },
    err => {
      showToast('Unable to get location: ' + err.message, true);
    }
  );
});

// Photo preview
document.getElementById('photo').addEventListener('change', (e) => {
  const file = e.target.files[0];
  const preview = document.getElementById('photo-preview');
  if (file) {
    const reader = new FileReader();
    reader.onload = (ev) => {
      preview.innerHTML = `<img src="${ev.target.result}" alt="Preview" />`;
    };
    reader.readAsDataURL(file);
  } else {
    preview.innerHTML = '';
  }
});

// Submit report
document.getElementById('report-form').addEventListener('submit', async (e) => {
  e.preventDefault();

  const formData = new FormData(e.target);

  try {
    const res = await fetch(`${API_BASE}/reports`, {
      method: 'POST',
      body: formData
    });

    const result = await res.json();

    if (result.success) {
      showToast('Report submitted successfully!');
      e.target.reset();
      document.getElementById('photo-preview').innerHTML = '';
      switchView('dashboard');
    } else {
      showToast(result.error || 'Failed to submit report', true);
    }
  } catch (err) {
    showToast('Network error. Please try again.', true);
  }
});

// Reports List
async function loadReports() {
  const status = document.getElementById('filter-status').value;
  const severity = document.getElementById('filter-severity').value;

  let url = `${API_BASE}/reports?`;
  if (status) url += `status=${status}&`;
  if (severity) url += `severity=${severity}&`;

  try {
    const res = await fetch(url);
    const { data } = await res.json();

    const listDiv = document.getElementById('reports-list');

    if (data.length === 0) {
      listDiv.innerHTML = '<div class="card"><p>No reports found.</p></div>';
      return;
    }

    listDiv.innerHTML = data.map(r => `
      <div class="report-item">
        ${r.photo_url ? `<img src="${r.photo_url}" class="report-photo" alt="Garbage photo" />` : ''}
        <div class="report-info">
          <h4>${r.description.substring(0, 100)}${r.description.length > 100 ? '...' : ''}</h4>
          <p>
            <span class="badge badge-${r.status}">${r.status.replace('_', ' ')}</span>
            <span class="badge badge-${r.severity}">${r.severity}</span>
          </p>
          <p>${r.address || `${r.latitude.toFixed(4)}, ${r.longitude.toFixed(4)}`}</p>
          <p>${timeAgo(r.created_at)}${r.reporter_name ? ` &middot; by ${r.reporter_name}` : ''}</p>
        </div>
        <div class="report-actions">
          <button class="btn btn-sm btn-secondary" onclick="openStatusModal(${r.id}, '${r.status}')">Update Status</button>
        </div>
      </div>
    `).join('');
  } catch (err) {
    console.error('Failed to load reports:', err);
  }
}

// Filters
document.getElementById('filter-status').addEventListener('change', loadReports);
document.getElementById('filter-severity').addEventListener('change', loadReports);

// Status Modal
function openStatusModal(reportId, currentStatus) {
  document.getElementById('modal-report-id').value = reportId;
  document.getElementById('modal-status').value = currentStatus;
  document.getElementById('modal-notes').value = '';
  document.getElementById('status-modal').classList.remove('hidden');
}

document.getElementById('modal-cancel').addEventListener('click', () => {
  document.getElementById('status-modal').classList.add('hidden');
});

document.getElementById('modal-save').addEventListener('click', async () => {
  const reportId = document.getElementById('modal-report-id').value;
  const status = document.getElementById('modal-status').value;
  const notes = document.getElementById('modal-notes').value;

  try {
    const res = await fetch(`${API_BASE}/reports/${reportId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, notes })
    });

    const result = await res.json();

    if (result.success) {
      showToast('Status updated!');
      document.getElementById('status-modal').classList.add('hidden');
      loadReports();
    } else {
      showToast(result.error || 'Failed to update status', true);
    }
  } catch (err) {
    showToast('Network error. Please try again.', true);
  }
});

// Utility
function timeAgo(dateStr) {
  const now = new Date();
  const date = new Date(dateStr);
  const seconds = Math.floor((now - date) / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return date.toLocaleDateString();
}

// Initialize
loadDashboard();
