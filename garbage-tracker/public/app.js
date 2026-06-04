// GarbageGuard — Smart Waste Reporting App

const API_BASE = '/api';
let map = null;
let markers = [];

// Navigation
document.querySelectorAll('.nav-item').forEach(btn => {
  btn.addEventListener('click', () => {
    const view = btn.dataset.view;
    switchView(view);
  });
});

function switchView(view) {
  document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.querySelector(`.nav-item[data-view="${view}"]`).classList.add('active');
  document.getElementById(`${view}-view`).classList.add('active');

  if (view === 'map') initMap();
  if (view === 'dashboard') loadDashboard();
  if (view === 'list') loadReports();
}

// Toast notifications
function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  const icon = type === 'success'
    ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>'
    : '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>';
  toast.innerHTML = `${icon} ${message}`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    toast.style.transition = '0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// Animated counter
function animateCounter(el, target) {
  const duration = 1000;
  const start = parseInt(el.textContent) || 0;
  const increment = (target - start) / (duration / 16);
  let current = start;

  function step() {
    current += increment;
    if ((increment > 0 && current >= target) || (increment < 0 && current <= target)) {
      el.textContent = target;
      return;
    }
    el.textContent = Math.round(current);
    requestAnimationFrame(step);
  }
  step();
}

// Dashboard
async function loadDashboard() {
  try {
    const res = await fetch(`${API_BASE}/stats`);
    const { data } = await res.json();

    // Animate counters
    animateCounter(document.getElementById('stat-total'), data.total);
    animateCounter(document.getElementById('stat-reported'), data.byStatus.reported || 0);
    animateCounter(document.getElementById('stat-progress'), data.byStatus.in_progress || 0);
    animateCounter(document.getElementById('stat-cleaned'), data.byStatus.cleaned || 0);
    animateCounter(document.getElementById('stat-week'), data.lastWeek);
    animateCounter(document.getElementById('stat-week-cleaned'), data.cleanedLastWeek);

    // Update activity rings
    const total = data.total || 1;
    const newPct = Math.min((data.lastWeek / Math.max(total, 1)) * 100, 100);
    const cleanPct = Math.min((data.cleanedLastWeek / Math.max(data.lastWeek, 1)) * 100, 100);
    
    setTimeout(() => {
      const newRing = document.querySelector('.new-ring');
      const cleanRing = document.querySelector('.clean-ring');
      if (newRing) newRing.style.strokeDasharray = `${newPct}, 100`;
      if (cleanRing) cleanRing.style.strokeDasharray = `${cleanPct}, 100`;
    }, 300);

    // Severity breakdown
    const severityDiv = document.getElementById('severity-breakdown');
    const maxCount = Math.max(...Object.values(data.bySeverity || { x: 1 }), 1);
    
    if (Object.keys(data.bySeverity).length === 0) {
      severityDiv.innerHTML = '<p style="color: var(--text-muted); font-size: 0.85rem;">No data yet</p>';
    } else {
      severityDiv.innerHTML = ['low', 'medium', 'high']
        .filter(sev => data.bySeverity[sev])
        .map(sev => {
          const count = data.bySeverity[sev] || 0;
          const pct = (count / maxCount) * 100;
          return `
            <div class="severity-bar-item">
              <span class="severity-bar-label">${sev}</span>
              <div class="severity-bar">
                <div class="severity-bar-fill ${sev}" style="width: 0%;" data-width="${pct}%"></div>
              </div>
              <span class="severity-bar-count">${count}</span>
            </div>
          `;
        }).join('');

      // Animate bars
      setTimeout(() => {
        document.querySelectorAll('.severity-bar-fill').forEach(bar => {
          bar.style.width = bar.dataset.width;
        });
      }, 100);
    }

    // Recent reports
    const recentDiv = document.getElementById('recent-reports');
    if (data.recentReports.length === 0) {
      recentDiv.innerHTML = `
        <div class="empty-state">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M3 6h18l-2 13H5L3 6z"/><path d="M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
          </svg>
          <p>No reports yet. Start by reporting garbage in your area!</p>
        </div>
      `;
    } else {
      recentDiv.innerHTML = data.recentReports.map((r, i) => `
        <div class="recent-item" style="animation-delay: ${i * 0.05}s">
          <div class="recent-item-icon severity-${r.severity}">
            ${r.severity === 'high' ? '⚠️' : r.severity === 'medium' ? '⚡' : '💡'}
          </div>
          <div class="recent-item-info">
            <div class="recent-item-title">${r.description}</div>
            <div class="recent-item-meta">${r.address || `${r.latitude.toFixed(4)}, ${r.longitude.toFixed(4)}`} · ${timeAgo(r.created_at)}</div>
          </div>
          <div class="recent-item-badge">
            <span class="badge badge-${r.status}">${r.status.replace('_', ' ')}</span>
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

  map = L.map('map', {
    zoomControl: false
  }).setView([20.5937, 78.9629], 5);

  L.control.zoom({ position: 'topright' }).addTo(map);

  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; OpenStreetMap &copy; CARTO',
    maxZoom: 19
  }).addTo(map);

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

    markers.forEach(m => map.removeLayer(m));
    markers = [];

    data.forEach(report => {
      const color = getStatusColor(report.status);
      const marker = L.circleMarker([report.latitude, report.longitude], {
        radius: 10,
        fillColor: color,
        color: color,
        weight: 2,
        opacity: 0.8,
        fillOpacity: 0.4
      }).addTo(map);

      // Glowing effect with outer ring
      const glow = L.circleMarker([report.latitude, report.longitude], {
        radius: 16,
        fillColor: color,
        color: 'transparent',
        fillOpacity: 0.1
      }).addTo(map);

      marker.bindPopup(`
        <div style="font-family: Inter, sans-serif; padding: 0.5rem;">
          <strong style="font-size: 0.9rem;">${report.description.substring(0, 80)}</strong><br>
          <span style="color:${color}; font-weight: 600; font-size: 0.8rem; text-transform: uppercase;">${report.status.replace('_', ' ')}</span>
          <span style="opacity: 0.6; font-size: 0.8rem;"> · ${report.severity}</span><br>
          <span style="opacity: 0.7; font-size: 0.8rem;">${report.address || `${report.latitude.toFixed(4)}, ${report.longitude.toFixed(4)}`}</span><br>
          <small style="opacity: 0.5;">${timeAgo(report.created_at)}</small>
          ${report.photo_url ? `<br><img src="${report.photo_url}" style="max-width:160px;margin-top:8px;border-radius:8px;">` : ''}
        </div>
      `);

      markers.push(marker, glow);
    });
  } catch (err) {
    console.error('Failed to load map markers:', err);
  }
}

function getStatusColor(status) {
  switch (status) {
    case 'reported': return '#ef4444';
    case 'in_progress': return '#f59e0b';
    case 'cleaned': return '#10b981';
    case 'invalid': return '#6b7280';
    default: return '#6b7280';
  }
}

// Geolocation
document.getElementById('get-location-btn').addEventListener('click', () => {
  const btn = document.getElementById('get-location-btn');
  if (!navigator.geolocation) {
    showToast('Geolocation not supported', 'error');
    return;
  }

  btn.innerHTML = '<svg class="spinner" width="18" height="18" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" fill="none" stroke-dasharray="30 70"/></svg> Detecting...';

  navigator.geolocation.getCurrentPosition(
    pos => {
      document.getElementById('latitude').value = pos.coords.latitude.toFixed(6);
      document.getElementById('longitude').value = pos.coords.longitude.toFixed(6);
      btn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/><line x1="12" y1="2" x2="12" y2="4"/><line x1="12" y1="20" x2="12" y2="22"/><line x1="2" y1="12" x2="4" y2="12"/><line x1="20" y1="12" x2="22" y2="12"/></svg> Detect';
      showToast('Location detected successfully!');
    },
    err => {
      btn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/><line x1="12" y1="2" x2="12" y2="4"/><line x1="12" y1="20" x2="12" y2="22"/><line x1="2" y1="12" x2="4" y2="12"/><line x1="20" y1="12" x2="22" y2="12"/></svg> Detect';
      showToast('Unable to detect location', 'error');
    }
  );
});

// Photo preview
document.getElementById('photo').addEventListener('change', (e) => {
  const file = e.target.files[0];
  const preview = document.getElementById('photo-preview');
  const uploadArea = document.getElementById('file-upload-area');

  if (file) {
    const reader = new FileReader();
    reader.onload = (ev) => {
      preview.innerHTML = `<img src="${ev.target.result}" alt="Preview" />`;
      uploadArea.querySelector('.upload-placeholder').style.display = 'none';
    };
    reader.readAsDataURL(file);
  } else {
    preview.innerHTML = '';
    uploadArea.querySelector('.upload-placeholder').style.display = 'block';
  }
});

// Submit report
document.getElementById('report-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = e.target.querySelector('.btn-submit');
  btn.classList.add('loading');

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
      const placeholder = document.querySelector('.upload-placeholder');
      if (placeholder) placeholder.style.display = 'block';
      setTimeout(() => switchView('dashboard'), 500);
    } else {
      showToast(result.error || 'Failed to submit report', 'error');
    }
  } catch (err) {
    showToast('Network error. Please try again.', 'error');
  } finally {
    btn.classList.remove('loading');
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
      listDiv.innerHTML = `
        <div class="empty-state">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <circle cx="12" cy="12" r="10"/><line x1="8" y1="15" x2="16" y2="15"/>
            <line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/>
          </svg>
          <p>No reports found matching your filters.</p>
        </div>
      `;
      return;
    }

    listDiv.innerHTML = data.map((r, i) => `
      <div class="report-card" style="animation-delay: ${i * 0.05}s">
        ${r.photo_url ? `<img src="${r.photo_url}" class="report-card-photo" alt="Evidence" />` : ''}
        <div class="report-card-info">
          <div class="report-card-title">${r.description}</div>
          <div class="report-card-meta">
            <span class="badge badge-${r.status}">${r.status.replace('_', ' ')}</span>
            <span class="badge badge-${r.severity}" style="background: rgba(255,255,255,0.05); color: var(--text-secondary);">${r.severity}</span>
            <span>${r.address || `${r.latitude.toFixed(4)}, ${r.longitude.toFixed(4)}`}</span>
            <span>·</span>
            <span>${timeAgo(r.created_at)}</span>
            ${r.reporter_name ? `<span>· ${r.reporter_name}</span>` : ''}
          </div>
        </div>
        <div class="report-card-actions">
          <button class="btn-update" onclick="openStatusModal(${r.id}, '${r.status}')">Update</button>
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

document.getElementById('modal-cancel').addEventListener('click', closeModal);
document.getElementById('modal-cancel-btn').addEventListener('click', closeModal);
document.querySelector('.modal-backdrop').addEventListener('click', closeModal);

function closeModal() {
  document.getElementById('status-modal').classList.add('hidden');
}

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
      closeModal();
      loadReports();
    } else {
      showToast(result.error || 'Failed to update', 'error');
    }
  } catch (err) {
    showToast('Network error', 'error');
  }
});

// Utility
function timeAgo(dateStr) {
  const now = new Date();
  const date = new Date(dateStr + 'Z');
  const seconds = Math.floor((now - date) / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return date.toLocaleDateString();
}

// Initialize
loadDashboard();
