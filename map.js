// Interactive Map Module for NexusIT Operations using Leaflet.js
let mapInstance = null;
let markersLayer = null;
let routesLayer = null;

function initOfficeMap() {
  const mapElement = document.getElementById('officeMap');
  if (!mapElement) return;

  // Prevent multiple initializations
  if (mapInstance) {
    setTimeout(() => mapInstance.invalidateSize(), 200);
    renderMapMarkers();
    return;
  }

  // Centered on Sri Lanka
  mapInstance = L.map('officeMap', {
    zoomControl: true,
    attributionControl: true
  }).setView([7.8731, 80.7718], 7.5);

  // High quality OpenStreetMap tiles
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  }).addTo(mapInstance);

  markersLayer = L.layerGroup().addTo(mapInstance);
  routesLayer = L.layerGroup().addTo(mapInstance);

  // Map click event for adding new branch location
  mapInstance.on('click', function(e) {
    const latInput = document.getElementById('branchLat');
    const lngInput = document.getElementById('branchLng');
    if (latInput && lngInput && document.getElementById('branchModal').classList.contains('active')) {
      latInput.value = e.latlng.lat.toFixed(5);
      lngInput.value = e.latlng.lng.toFixed(5);
      showToast(`Selected coordinates: ${e.latlng.lat.toFixed(4)}, ${e.latlng.lng.toFixed(4)}`, 'info');
    }
  });

  renderMapMarkers();
}

function renderMapMarkers() {
  if (!mapInstance || !markersLayer) return;

  markersLayer.clearLayers();
  routesLayer.clearLayers();

  const branches = getBranches();
  const assets = getAssets();
  const visits = getVisits();

  // Find HQ for drawing connecting routes
  const hqBranch = branches.find(b => b.type === 'Headquarters') || branches[0];

  branches.forEach(branch => {
    if (!branch.lat || !branch.lng) return;

    // Calculate asset statistics for this branch
    const branchAssets = assets.filter(a => a.branchId === branch.id);
    const inStockCount = branchAssets.filter(a => a.status === 'In Stock').length;
    const assignedCount = branchAssets.filter(a => a.status === 'Assigned').length;
    const repairCount = branchAssets.filter(a => a.status === 'Maintenance').length;
    const pendingVisits = visits.filter(v => v.branchId === branch.id && v.status === 'Scheduled');

    const isHQ = branch.type === 'Headquarters';
    const markerColor = isHQ ? '#2563eb' : (repairCount > 0 ? '#d97706' : '#059669');

    // Custom SVG Marker Icon
    const customIcon = L.divIcon({
      className: 'custom-map-pin',
      html: `
        <div style="
          background-color: ${markerColor};
          width: 38px;
          height: 38px;
          border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 10px rgba(0,0,0,0.3);
          border: 3px solid #ffffff;
        ">
          <span style="
            transform: rotate(45deg);
            color: #ffffff;
            font-size: 14px;
            font-weight: bold;
          ">${isHQ ? '🏢' : '📍'}</span>
        </div>
      `,
      iconSize: [38, 38],
      iconAnchor: [19, 38],
      popupAnchor: [0, -36]
    });

    const marker = L.marker([branch.lat, branch.lng], { icon: customIcon });

    // Rich popup content
    const popupContent = `
      <div class="map-popup-card">
        <div class="popup-header" style="border-bottom: 2px solid ${markerColor}; padding-bottom: 6px; margin-bottom: 8px;">
          <h4 style="margin: 0; font-size: 15px; font-weight: 700; color: var(--text-main);">${escapeHtml(branch.name)}</h4>
          <span class="badge ${isHQ ? 'badge-primary' : 'badge-neutral'}" style="font-size: 11px; margin-top: 3px; display: inline-block;">
            ${isHQ ? 'Main Office / IT Base' : escapeHtml(branch.code || 'Branch')}
          </span>
        </div>
        
        <p style="margin: 4px 0; font-size: 12px; color: var(--text-muted);">
          <strong>📍 Address:</strong> ${escapeHtml(branch.address)}
        </p>
        <p style="margin: 4px 0; font-size: 12px; color: var(--text-muted);">
          <strong>👤 Contact:</strong> ${escapeHtml(branch.contactPerson || 'N/A')}
        </p>
        <p style="margin: 4px 0; font-size: 12px; color: var(--text-muted);">
          <strong>📞 Phone:</strong> <a href="tel:${branch.phone}" style="color: var(--primary); text-decoration: none;">${escapeHtml(branch.phone || 'N/A')}</a>
        </p>
        
        <div class="map-popup-stats" style="background: var(--bg-subtle); border: 1px solid var(--border); border-radius: 6px; padding: 6px 10px; margin: 8px 0; display: flex; justify-content: space-between; font-size: 12px;">
          <div><strong style="color: var(--success);">💻 Total:</strong> ${branchAssets.length}</div>
          <div><strong style="color: var(--primary);">⚡ In-Use:</strong> ${assignedCount}</div>
          ${inStockCount > 0 ? `<div><strong style="color: var(--success);">📦 Stock:</strong> ${inStockCount}</div>` : ''}
          ${repairCount > 0 ? `<div><strong style="color: var(--warning);">⚠️ Repair:</strong> ${repairCount}</div>` : ''}
        </div>

        ${pendingVisits.length > 0 ? `
          <div style="background: #fffbeb; border: 1px solid #fef3c7; border-radius: 4px; padding: 4px 8px; margin-bottom: 8px; font-size: 11px; color: #b45309;">
            🗓️ <strong>Scheduled IT Visit:</strong> ${pendingVisits[0].date} (${escapeHtml(pendingVisits[0].purpose.substring(0, 30))}...)
          </div>
        ` : ''}

        <div style="display: flex; gap: 6px; margin-top: 8px;">
          <button class="btn btn-sm btn-outline" onclick="filterAssetsByBranch('${branch.id}')" style="flex: 1; font-size: 11px; padding: 4px 6px;">
            💻 View Laptops
          </button>
          <button class="btn btn-sm btn-primary" onclick="openScheduleVisitForBranch('${branch.id}')" style="flex: 1; font-size: 11px; padding: 4px 6px;">
            🚗 Schedule Visit
          </button>
        </div>
      </div>
    `;

    marker.bindPopup(popupContent, { maxWidth: 300 });
    markersLayer.addLayer(marker);

    // Optional subtle dashed route lines from HQ to branches
    if (!isHQ && hqBranch && hqBranch.lat && hqBranch.lng) {
      const line = L.polyline([
        [hqBranch.lat, hqBranch.lng],
        [branch.lat, branch.lng]
      ], {
        color: '#94a3b8',
        weight: 1.5,
        dashArray: '4, 8',
        opacity: 0.6
      });
      routesLayer.addLayer(line);
    }
  });
}

function flyToBranch(lat, lng) {
  if (!mapInstance) return;
  // Switch to Map tab first if not visible
  switchTab('map-view');
  setTimeout(() => {
    mapInstance.invalidateSize();
    mapInstance.flyTo([lat, lng], 13, { duration: 1.5 });
  }, 150);
}

function filterAssetsByBranch(branchId) {
  switchTab('assets');
  const branchFilter = document.getElementById('filterBranch');
  if (branchFilter) {
    branchFilter.value = branchId;
    renderAssets();
  }
}

function openScheduleVisitForBranch(branchId) {
  openModal('visitModal');
  const branchSelect = document.getElementById('visitBranch');
  if (branchSelect) {
    branchSelect.value = branchId;
  }
}
