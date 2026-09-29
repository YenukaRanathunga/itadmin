// NexusIT Operations - Main Application Controller

// --- Storage Keys ---
const STORAGE_KEYS = {
  ASSETS: 'nexusit_assets_v1',
  BRANCHES: 'nexusit_branches_v1',
  VISITS: 'nexusit_visits_v1'
};

let isServerConnected = false;

function getApiEndpoint(endpoint) {
  if (window.location.protocol === 'http:' || window.location.protocol === 'https:') {
    return endpoint;
  }
  return `http://localhost:5000${endpoint}`;
}

// Sync with local backend server (database.json)
async function syncWithServer(isRetry = false) {
  try {
    const url = getApiEndpoint('/api/data');
    const res = await fetch(url, { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      if (data.assets && data.branches && data.visits) {
        localStorage.setItem(STORAGE_KEYS.ASSETS, JSON.stringify(data.assets));
        localStorage.setItem(STORAGE_KEYS.BRANCHES, JSON.stringify(data.branches));
        localStorage.setItem(STORAGE_KEYS.VISITS, JSON.stringify(data.visits));
        isServerConnected = true;
        updateServerStatusBadge(true);
        if (isRetry) {
          renderDashboard();
          renderAssets();
          renderBranchesList();
          renderVisits();
        }
        return true;
      }
    }
  } catch (e) {
    // Server not running or unreachable
    isServerConnected = false;
  }
  updateServerStatusBadge(false);
  return false;
}

// Persist data directly to disk (database.json) via backend API
async function persistToServer() {
  try {
    const payload = {
      branches: getBranches(),
      assets: getAssets(),
      visits: getVisits()
    };
    const url = getApiEndpoint('/api/save');
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload, null, 2)
    });
    if (res.ok) {
      isServerConnected = true;
      updateServerStatusBadge(true);
    }
  } catch (err) {
    console.warn('Could not persist to server:', err);
    isServerConnected = false;
    updateServerStatusBadge(false);
  }
}

function updateServerStatusBadge(connected) {
  const badge = document.getElementById('serverStatusBadge');
  if (!badge) return;
  if (connected) {
    badge.className = 'badge badge-success';
    badge.innerHTML = '🟢 Server: database.json (Saved & Synced)';
    badge.title = 'Live local server connected! All changes are permanently saved to database.json on your computer.';
    badge.onclick = null;
    badge.style.cursor = 'default';
  } else {
    badge.className = 'badge badge-warning';
    badge.innerHTML = '⚠️ Local Server Offline (Click to fix)';
    badge.title = 'Local server is not connected. Click for instructions.';
    badge.style.cursor = 'pointer';
    badge.onclick = () => {
      alert('Local server is not running on http://localhost:5000.\n\nPlease double-click "start.bat" in your it-asset-manager folder to start the server and enable permanent saving to database.json!');
    };
  }
}

// --- Data Accessors ---
function getAssets() {
  const data = localStorage.getItem(STORAGE_KEYS.ASSETS);
  if (data) {
    try { return JSON.parse(data); } catch(e) {}
  }
  localStorage.setItem(STORAGE_KEYS.ASSETS, JSON.stringify(initialData.assets));
  return [...initialData.assets];
}

function saveAssets(assets) {
  localStorage.setItem(STORAGE_KEYS.ASSETS, JSON.stringify(assets));
  persistToServer();
}

function getBranches() {
  const data = localStorage.getItem(STORAGE_KEYS.BRANCHES);
  if (data) {
    try { return JSON.parse(data); } catch(e) {}
  }
  localStorage.setItem(STORAGE_KEYS.BRANCHES, JSON.stringify(initialData.branches));
  return [...initialData.branches];
}

function saveBranches(branches) {
  localStorage.setItem(STORAGE_KEYS.BRANCHES, JSON.stringify(branches));
  persistToServer();
}

function getVisits() {
  const data = localStorage.getItem(STORAGE_KEYS.VISITS);
  if (data) {
    try { return JSON.parse(data); } catch(e) {}
  }
  localStorage.setItem(STORAGE_KEYS.VISITS, JSON.stringify(initialData.visits));
  return [...initialData.visits];
}

function saveVisits(visits) {
  localStorage.setItem(STORAGE_KEYS.VISITS, JSON.stringify(visits));
  persistToServer();
}

// --- Application Initialization ---
document.addEventListener('DOMContentLoaded', async () => {
  // Sync with server if running on http://localhost:5000
  await syncWithServer();

  // Background auto-reconnect polling in case server starts after page load
  setInterval(() => {
    if (!isServerConnected) {
      syncWithServer(true);
    }
  }, 4000);

  // Ensure default data exists
  getBranches();
  getAssets();
  getVisits();

  // Populate branch dropdowns
  populateBranchDropdowns();

  // Render initial views
  renderDashboard();
  renderAssets();
  renderBranchesList();
  renderVisits();
  populateHandoverSelectors();

  // Setup tab navigation
  setupTabs();

  // Setup search & filter listeners
  setupFilters();
});

// --- Tab Management ---
function setupTabs() {
  const tabs = document.querySelectorAll('.nav-tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const targetTab = tab.getAttribute('data-tab');
      switchTab(targetTab);
    });
  });
}

function switchTab(tabId) {
  document.querySelectorAll('.nav-tab').forEach(t => {
    t.classList.toggle('active', t.getAttribute('data-tab') === tabId);
  });

  document.querySelectorAll('.tab-pane').forEach(p => {
    p.classList.toggle('active', p.id === tabId);
  });

  if (tabId === 'map-view') {
    initOfficeMap();
  }
  if (tabId === 'dashboard') {
    renderDashboard();
  }
}

// --- Populate Dropdowns ---
function populateBranchDropdowns() {
  const branches = getBranches();
  const dropdownIds = ['filterBranch', 'assetBranch', 'visitBranch', 'handoverBranchSelect'];
  
  dropdownIds.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;

    const currentValue = el.value;
    // Keep the first option if it's "All Branches"
    const hasAll = el.querySelector('option[value=""]');
    el.innerHTML = hasAll ? '<option value="">All Branches</option>' : '';

    branches.forEach(b => {
      const opt = document.createElement('option');
      opt.value = b.id;
      opt.textContent = `${b.name} (${b.city})`;
      el.appendChild(opt);
    });

    if (currentValue) el.value = currentValue;
  });
}

// --- Dashboard View ---
function renderDashboard() {
  const assets = getAssets();
  const branches = getBranches();
  const visits = getVisits();

  const totalAssets = assets.length;
  const inStock = assets.filter(a => a.status === 'In Stock').length;
  const assigned = assets.filter(a => a.status === 'Assigned').length;
  const maintenance = assets.filter(a => a.status === 'Maintenance').length;
  const upcomingVisits = visits.filter(v => v.status === 'Scheduled').length;

  document.getElementById('statTotalAssets').textContent = totalAssets;
  document.getElementById('statInStock').textContent = inStock;
  document.getElementById('statAssigned').textContent = assigned;
  document.getElementById('statMaintenance').textContent = maintenance;
  document.getElementById('statBranches').textContent = branches.length;
  document.getElementById('statUpcomingVisits').textContent = upcomingVisits;

  // Render Attention / Recent section on dashboard
  const alertsTableBody = document.getElementById('dashboardAlertsBody');
  if (alertsTableBody) {
    alertsTableBody.innerHTML = '';

    const attentionItems = [];

    // Laptops in maintenance
    assets.filter(a => a.status === 'Maintenance').forEach(a => {
      attentionItems.push({
        type: '⚠️ Hardware Repair',
        badge: 'badge-danger',
        desc: `${a.model} (${a.serial}) is in Maintenance. Issue: ${a.notes || 'Hardware diagnosis'}`,
        action: 'Inspect Repair',
        linkTab: 'assets'
      });
    });

    // Upcoming visits in next 14 days
    visits.filter(v => v.status === 'Scheduled').forEach(v => {
      attentionItems.push({
        type: '🚗 Scheduled Field Visit',
        badge: 'badge-warning',
        desc: `Trip to ${v.branchName} on ${v.date}. Purpose: ${v.purpose}`,
        action: 'View Trip Log',
        linkTab: 'visits'
      });
    });

    // Low stock warning (if < 2 laptops available in stock)
    if (assets.length > 0 && inStock <= 2) {
      attentionItems.push({
        type: '📦 Low Stock Alert',
        badge: 'badge-warning',
        desc: `Only ${inStock} laptop(s) available in IT Stock ready for issue. Consider procurement.`,
        action: 'View Stock',
        linkTab: 'assets'
      });
    }

    if (attentionItems.length === 0) {
      if (assets.length === 0 && branches.length === 0) {
        alertsTableBody.innerHTML = `<tr><td colspan="3" style="text-align: center; color: #64748b; padding: 28px;">✨ System is clean & ready! Click <strong>"+ Add Laptop"</strong> or <strong>"🏢 Add Office"</strong> to start entering your live IT data.</td></tr>`;
      } else {
        alertsTableBody.innerHTML = `<tr><td colspan="3" style="text-align: center; color: #10b981; padding: 20px;">✅ All systems normal! No urgent laptop issues or pending alerts.</td></tr>`;
      }
    } else {
      attentionItems.forEach(item => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td><span class="badge ${item.badge}">${item.type}</span></td>
          <td>${escapeHtml(item.desc)}</td>
          <td>
            <button class="btn btn-sm btn-outline" onclick="switchTab('${item.linkTab}')">${item.action}</button>
          </td>
        `;
        alertsTableBody.appendChild(tr);
      });
    }
  }

  // Render Quick Branch Distribution summary
  const branchSummaryEl = document.getElementById('dashboardBranchDistribution');
  if (branchSummaryEl) {
    branchSummaryEl.innerHTML = '';
    if (branches.length === 0) {
      branchSummaryEl.innerHTML = `<div style="text-align: center; color: #94a3b8; padding: 28px 12px; font-size: 12px;">No branches added yet.<br><button class="btn btn-sm btn-primary" style="margin-top: 10px;" onclick="openAddBranchModal()">➕ Add Office</button></div>`;
    } else {
      branches.forEach(b => {
        const bAssets = assets.filter(a => a.branchId === b.id);
        const bStock = bAssets.filter(a => a.status === 'In Stock').length;
        const bInUse = bAssets.filter(a => a.status === 'Assigned').length;

        const card = document.createElement('div');
        card.className = 'stat-card';
        card.style.cursor = 'pointer';
        card.onclick = () => flyToBranch(b.lat, b.lng);
        card.innerHTML = `
          <div class="stat-icon ${b.type === 'Headquarters' ? 'blue' : 'indigo'}">
            ${b.type === 'Headquarters' ? '🏢' : '📍'}
          </div>
          <div class="stat-details">
            <p style="font-weight: 700; color: #1e293b; margin-bottom: 2px;">${escapeHtml(b.name)}</p>
            <p style="font-size: 11px; color: #64748b;">${escapeHtml(b.city)} • ${escapeHtml(b.contactPerson || 'No Contact')}</p>
            <div style="font-size: 12px; margin-top: 4px; font-weight: 600;">
              <span style="color: #2563eb;">${bInUse} In-Use</span>
              ${bStock > 0 ? ` • <span style="color: #059669;">${bStock} In-Stock</span>` : ''}
            </div>
          </div>
        `;
        branchSummaryEl.appendChild(card);
      });
    }
  }
}

// --- Asset Inventory View ---
function renderAssets() {
  const assets = getAssets();
  const branches = getBranches();
  const tableBody = document.getElementById('assetsTableBody');
  if (!tableBody) return;

  const searchQuery = (document.getElementById('searchAsset')?.value || '').toLowerCase().trim();
  const statusFilter = document.getElementById('filterStatus')?.value || '';
  const branchFilter = document.getElementById('filterBranch')?.value || '';

  tableBody.innerHTML = '';

  const filtered = assets.filter(a => {
    // Status filter
    if (statusFilter && a.status !== statusFilter) return false;
    // Branch filter
    if (branchFilter && a.branchId !== branchFilter) return false;
    // Search query
    if (searchQuery) {
      const combined = `${a.id} ${a.model} ${a.serial} ${a.specs} ${a.assignedTo} ${a.previousUser || ''} ${a.assignedDept} ${a.notes}`.toLowerCase();
      if (!combined.includes(searchQuery)) return false;
    }
    return true;
  });

  document.getElementById('assetsCount').textContent = `Showing ${filtered.length} of ${assets.length} laptops`;

  if (filtered.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="8" style="text-align: center; padding: 40px; color: #64748b;">
          ${assets.length === 0 ? '💻 No laptops in inventory yet. Click <strong style="color: #2563eb;">"+ Add Laptop"</strong> to register your first laptop stock!' : '🔍 No laptops found matching your filters. Try resetting search.'}
        </td>
      </tr>
    `;
    return;
  }

  filtered.forEach(asset => {
    const branch = branches.find(b => b.id === asset.branchId) || { name: 'Unassigned Branch' };
    
    let badgeClass = 'badge-neutral';
    if (asset.status === 'In Stock') badgeClass = 'badge-success';
    else if (asset.status === 'Assigned') badgeClass = 'badge-primary';
    else if (asset.status === 'Maintenance') badgeClass = 'badge-warning';
    else if (asset.status === 'Decommissioned') badgeClass = 'badge-danger';

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>
        <span class="asset-tag-badge" style="cursor: pointer;" title="Click to Edit" onclick="openEditAssetModal('${asset.id}')">${escapeHtml(asset.id)}</span>
      </td>
      <td>
        <div style="font-weight: 700; color: #1e293b; cursor: pointer;" title="Click to Edit" onclick="openEditAssetModal('${asset.id}')">${escapeHtml(asset.model)}</div>
        ${asset.serial ? `
          <div style="font-size: 11px; color: #64748b; font-family: monospace;">S/N: ${escapeHtml(asset.serial)}</div>
        ` : `
          <div style="font-size: 11px; color: #d97706; font-style: italic;">⚠️ S/N: Not Entered (Click Edit to add)</div>
        `}
        <div style="font-size: 11px; color: #475569; margin-top: 2px;">${escapeHtml(asset.specs || 'N/A')}</div>
      </td>
      <td>
        <span class="badge ${badgeClass}">${escapeHtml(asset.status)}</span>
        <div style="font-size: 11px; color: #64748b; margin-top: 4px;">Cond: ${escapeHtml(asset.condition || 'Good')}</div>
      </td>
      <td>
        <div style="font-weight: 600; color: #334155;">📍 ${escapeHtml(branch.name)}</div>
      </td>
      <td>
        ${asset.status === 'Assigned' && asset.assignedTo ? `
          <div style="font-weight: 600; color: #1e293b;">👤 ${escapeHtml(asset.assignedTo)}</div>
          <div style="font-size: 11px; color: #64748b;">Dept: ${escapeHtml(asset.assignedDept || 'General')}</div>
          ${asset.assignedDate ? `<div style="font-size: 11px; color: #94a3b8;">Since: ${asset.assignedDate}</div>` : ''}
        ` : `
          <span style="color: #94a3b8; font-style: italic;">${asset.status === 'In Stock' ? 'Available in Store' : 'N/A'}</span>
        `}
      </td>
      <td>
        ${asset.previousUser ? `
          <div style="font-weight: 600; color: #2563eb;">👤 ${escapeHtml(asset.previousUser)}</div>
        ` : `
          <span style="color: #cbd5e1;">-</span>
        `}
      </td>
      <td>
        <div style="font-size: 11px; color: #475569; max-width: 180px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${escapeHtml(asset.notes || '')}">
          ${escapeHtml(asset.notes || '-')}
        </div>
      </td>
      <td>
        <div style="display: flex; gap: 4px; align-items: center;">
          <button class="btn btn-sm btn-outline" style="color: #2563eb; border-color: #93c5fd; font-weight: 600; padding: 4px 8px;" title="Edit Laptop Details" onclick="openEditAssetModal('${asset.id}')">
            ✏️ Edit
          </button>
          <button class="btn btn-sm btn-outline" title="Print Handover / Gate Pass" onclick="openHandoverForAsset('${asset.id}')">
            📄 Form
          </button>
          <button class="btn btn-sm btn-danger" style="padding: 4px 6px;" title="Delete" onclick="deleteAsset('${asset.id}')">
            🗑️
          </button>
        </div>
      </td>
    `;
    tableBody.appendChild(tr);
  });
}

function setupFilters() {
  const searchInput = document.getElementById('searchAsset');
  const statusFilter = document.getElementById('filterStatus');
  const branchFilter = document.getElementById('filterBranch');

  if (searchInput) searchInput.addEventListener('input', renderAssets);
  if (statusFilter) statusFilter.addEventListener('change', renderAssets);
  if (branchFilter) branchFilter.addEventListener('change', renderAssets);
}

// --- Asset CRUD Modals ---
function openAddAssetModal() {
  document.getElementById('assetModalTitle').textContent = '➕ Add New IT Asset / Laptop';
  const submitBtn = document.getElementById('assetModalSubmitBtn');
  if (submitBtn) submitBtn.textContent = 'Save Asset';

  document.getElementById('assetForm').reset();
  document.getElementById('assetEditId').value = '';
  if (document.getElementById('assetPreviousUser')) document.getElementById('assetPreviousUser').value = '';
  
  // Generate next Asset ID
  const assets = getAssets();
  const nextNum = assets.length > 0 ? Math.max(...assets.map(a => parseInt(a.id.replace('AST-', '')) || 1000)) + 1 : 1001;
  document.getElementById('assetCustomId').value = `AST-${nextNum}`;

  toggleAssignedFields();
  openModal('assetModal');
}

function openEditAssetModal(assetId) {
  const assets = getAssets();
  const asset = assets.find(a => a.id === assetId);
  if (!asset) return;

  document.getElementById('assetModalTitle').textContent = `✏️ Edit Laptop (${asset.id})`;
  const submitBtn = document.getElementById('assetModalSubmitBtn');
  if (submitBtn) submitBtn.textContent = '💾 Update Laptop Details';

  document.getElementById('assetEditId').value = asset.id;
  document.getElementById('assetCustomId').value = asset.id;
  document.getElementById('assetModel').value = asset.model || '';
  document.getElementById('assetSerial').value = asset.serial || '';
  document.getElementById('assetSpecs').value = asset.specs || '';
  document.getElementById('assetBranch').value = asset.branchId || '';
  document.getElementById('assetStatus').value = asset.status || 'In Stock';
  document.getElementById('assetCondition').value = asset.condition || 'Good';
  if (document.getElementById('assetPreviousUser')) document.getElementById('assetPreviousUser').value = asset.previousUser || '';
  document.getElementById('assetAssignedTo').value = asset.assignedTo || '';
  document.getElementById('assetAssignedDept').value = asset.assignedDept || '';
  document.getElementById('assetAssignedDate').value = asset.assignedDate || '';
  document.getElementById('assetPurchaseDate').value = asset.purchaseDate || '';
  document.getElementById('assetWarrantyDate').value = asset.warrantyExpiry || '';
  document.getElementById('assetNotes').value = asset.notes || '';

  toggleAssignedFields();
  openModal('assetModal');
}

function toggleAssignedFields() {
  const status = document.getElementById('assetStatus').value;
  const assignedSection = document.getElementById('assignedDetailsSection');
  if (assignedSection) {
    assignedSection.style.display = (status === 'Assigned') ? 'grid' : 'none';
  }
}

function handleSaveAsset(event) {
  event.preventDefault();
  try {
    const assets = getAssets();
    const editId = document.getElementById('assetEditId')?.value || '';
    const customId = document.getElementById('assetCustomId')?.value?.trim() || '';
    const assetId = customId || editId || `AST-${Date.now().toString().slice(-4)}`;

    const newAssetData = {
      id: assetId,
      model: document.getElementById('assetModel')?.value?.trim() || '',
      serial: document.getElementById('assetSerial')?.value?.trim() || '',
      category: "Laptop",
      specs: document.getElementById('assetSpecs')?.value?.trim() || '',
      branchId: document.getElementById('assetBranch')?.value || '',
      status: document.getElementById('assetStatus')?.value || 'In Stock',
      condition: document.getElementById('assetCondition')?.value || 'Good',
      previousUser: document.getElementById('assetPreviousUser')?.value?.trim() || '',
      assignedTo: document.getElementById('assetAssignedTo')?.value?.trim() || '',
      assignedDept: document.getElementById('assetAssignedDept')?.value?.trim() || '',
      assignedDate: document.getElementById('assetAssignedDate')?.value || '',
      purchaseDate: document.getElementById('assetPurchaseDate')?.value || '',
      warrantyExpiry: document.getElementById('assetWarrantyDate')?.value || '',
      notes: document.getElementById('assetNotes')?.value?.trim() || ''
    };

    if (!newAssetData.model) {
      showToast('Please enter Laptop Model & Brand (e.g. HP / Dell)!', 'warning');
      return;
    }

    if (editId) {
      const index = assets.findIndex(a => a.id === editId);
      if (index !== -1) {
        // Check duplicate ID if ID changed
        if (assetId !== editId && assets.some(a => a.id.toLowerCase() === assetId.toLowerCase())) {
          showToast(`An asset with Tag / ID "${assetId}" already exists!`, 'warning');
          return;
        }
        // Check duplicate serial only if user entered a serial
        if (newAssetData.serial && assets.some(a => a.id !== editId && a.serial && a.serial.toLowerCase() === newAssetData.serial.toLowerCase())) {
          showToast(`Another laptop with Serial Number "${newAssetData.serial}" already exists!`, 'warning');
          return;
        }
        assets[index] = newAssetData;
        showToast(`Laptop ${assetId} updated successfully!`, 'success');
      }
    } else {
      // Check duplicate ID
      if (assets.some(a => a.id.toLowerCase() === newAssetData.id.toLowerCase())) {
        showToast(`An asset with Tag / ID "${newAssetData.id}" already exists!`, 'warning');
        return;
      }
      // Check duplicate serial only if serial is entered
      if (newAssetData.serial && assets.some(a => a.serial && a.serial.toLowerCase() === newAssetData.serial.toLowerCase())) {
        showToast(`A laptop with Serial Number "${newAssetData.serial}" already exists!`, 'warning');
        return;
      }
      assets.unshift(newAssetData);
      showToast(`Laptop ${newAssetData.model} (${newAssetData.id}) saved!`, 'success');
    }

    saveAssets(assets);
    closeModal('assetModal');
    renderAssets();
    renderDashboard();
    renderBranchesList();
    if (mapInstance) renderMapMarkers();
  } catch (err) {
    console.error('Error saving asset:', err);
    showToast('Error saving asset: ' + err.message, 'danger');
  }
}

function deleteAsset(assetId) {
  if (!confirm(`Are you sure you want to delete asset "${assetId}" from inventory?`)) return;

  let assets = getAssets();
  assets = assets.filter(a => a.id !== assetId);
  saveAssets(assets);
  showToast(`Asset ${assetId} deleted.`, 'info');
  renderAssets();
  renderDashboard();
  renderBranchesList();
  if (mapInstance) renderMapMarkers();
}

// --- Branch Office Management ---
function renderBranchesList() {
  const branches = getBranches();
  const assets = getAssets();
  const listContainer = document.getElementById('branchSidebarList');
  if (!listContainer) return;

  listContainer.innerHTML = '';
  document.getElementById('branchCountBadge').textContent = `${branches.length} Offices`;

  if (branches.length === 0) {
    listContainer.innerHTML = `
      <div style="text-align: center; padding: 36px 16px; color: #64748b;">
        <div style="font-size: 32px; margin-bottom: 8px;">🏢</div>
        <div style="font-weight: 700; color: #1e293b; margin-bottom: 4px; font-size: 14px;">No Offices Added Yet</div>
        <div style="font-size: 11px; margin-bottom: 14px;">Add your Head Office or external branches to see them plotted on the map.</div>
        <button class="btn btn-sm btn-primary" onclick="openAddBranchModal()">➕ Add Office</button>
      </div>
    `;
    return;
  }

  branches.forEach(b => {
    const bAssets = assets.filter(a => a.branchId === b.id);
    const inStock = bAssets.filter(a => a.status === 'In Stock').length;
    const assigned = bAssets.filter(a => a.status === 'Assigned').length;
    const repair = bAssets.filter(a => a.status === 'Maintenance').length;

    const div = document.createElement('div');
    div.className = 'branch-card';
    div.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: flex-start;">
        <div>
          <h4 style="font-size: 14px; font-weight: 700; color: #1e293b; margin: 0;">${escapeHtml(b.name)}</h4>
          <span style="font-size: 11px; color: #64748b;">📍 ${escapeHtml(b.city)} • Code: ${escapeHtml(b.code || b.id)}</span>
        </div>
        <span class="badge ${b.type === 'Headquarters' ? 'badge-primary' : 'badge-neutral'}">${escapeHtml(b.type)}</span>
      </div>

      <p style="font-size: 12px; color: #475569; margin: 6px 0 2px 0;">
        👤 ${escapeHtml(b.contactPerson || 'No contact assigned')} | 📞 ${escapeHtml(b.phone || '-')}
      </p>
      
      <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 8px; font-size: 11px; border-top: 1px dashed #e2e8f0; padding-top: 6px;">
        <div>
          <strong style="color: #2563eb;">${assigned}</strong> in-use
          ${inStock > 0 ? ` | <strong style="color: #059669;">${inStock}</strong> stock` : ''}
          ${repair > 0 ? ` | <strong style="color: #ea580c;">${repair}</strong> repair` : ''}
        </div>
        <div style="display: flex; gap: 4px;">
          <button class="btn btn-sm btn-outline" style="padding: 2px 6px;" onclick="event.stopPropagation(); flyToBranch(${b.lat}, ${b.lng})">
            🗺️ Locate
          </button>
          <button class="btn btn-sm btn-outline" style="padding: 2px 6px;" onclick="event.stopPropagation(); openEditBranchModal('${b.id}')">
            ✏️
          </button>
        </div>
      </div>
    `;
    div.onclick = () => flyToBranch(b.lat, b.lng);
    listContainer.appendChild(div);
  });
}

function openAddBranchModal() {
  document.getElementById('branchModalTitle').textContent = '🏢 Add New Branch Office';
  document.getElementById('branchForm').reset();
  document.getElementById('branchEditId').value = '';
  openModal('branchModal');
}

function openEditBranchModal(branchId) {
  const branches = getBranches();
  const branch = branches.find(b => b.id === branchId);
  if (!branch) return;

  document.getElementById('branchModalTitle').textContent = `✏️ Edit Office (${branch.name})`;
  document.getElementById('branchEditId').value = branch.id;
  document.getElementById('branchName').value = branch.name || '';
  document.getElementById('branchCode').value = branch.code || '';
  document.getElementById('branchCity').value = branch.city || '';
  document.getElementById('branchAddress').value = branch.address || '';
  document.getElementById('branchLat').value = branch.lat || '';
  document.getElementById('branchLng').value = branch.lng || '';
  document.getElementById('branchContact').value = branch.contactPerson || '';
  document.getElementById('branchPhone').value = branch.phone || '';
  document.getElementById('branchType').value = branch.type || 'Branch Office';
  document.getElementById('branchNotes').value = branch.notes || '';

  openModal('branchModal');
}

function handleSaveBranch(event) {
  event.preventDefault();
  const branches = getBranches();
  const editId = document.getElementById('branchEditId').value;
  const branchId = editId || `BR-${(branches.length + 1).toString().padStart(2, '0')}`;

  const branchData = {
    id: branchId,
    name: document.getElementById('branchName').value.trim(),
    code: document.getElementById('branchCode').value.trim(),
    city: document.getElementById('branchCity').value.trim(),
    address: document.getElementById('branchAddress').value.trim(),
    lat: parseFloat(document.getElementById('branchLat').value) || 6.9271,
    lng: parseFloat(document.getElementById('branchLng').value) || 79.8612,
    contactPerson: document.getElementById('branchContact').value.trim(),
    phone: document.getElementById('branchPhone').value.trim(),
    type: document.getElementById('branchType').value,
    notes: document.getElementById('branchNotes').value.trim()
  };

  if (!branchData.name || !branchData.city) {
    showToast('Office Name and City are required!', 'warning');
    return;
  }

  if (editId) {
    const idx = branches.findIndex(b => b.id === editId);
    if (idx !== -1) {
      branches[idx] = branchData;
      showToast(`Branch ${branchData.name} updated!`, 'success');
    }
  } else {
    branches.push(branchData);
    showToast(`New Branch ${branchData.name} added!`, 'success');
  }

  saveBranches(branches);
  closeModal('branchModal');
  populateBranchDropdowns();
  renderBranchesList();
  renderDashboard();
  if (mapInstance) renderMapMarkers();
}

// --- Field Visits & On-Site Trips ---
function renderVisits() {
  const visits = getVisits();
  const branches = getBranches();
  const tableBody = document.getElementById('visitsTableBody');
  if (!tableBody) return;

  tableBody.innerHTML = '';
  document.getElementById('visitsCount').textContent = `${visits.length} field trips recorded`;

  if (visits.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align: center; padding: 40px; color: #64748b;">
          🚗 No external office visits logged yet. Click "Schedule New Trip" to log your on-site visits!
        </td>
      </tr>
    `;
    return;
  }

  // Sort visits by date descending
  const sorted = [...visits].sort((a, b) => new Date(b.date) - new Date(a.date));

  sorted.forEach(visit => {
    let badgeClass = 'badge-warning';
    if (visit.status === 'Completed') badgeClass = 'badge-success';
    else if (visit.status === 'In Progress') badgeClass = 'badge-primary';

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>
        <div style="font-weight: 700; color: #1e293b;">📅 ${visit.date}</div>
        <div style="font-size: 11px; color: #64748b;">ID: ${visit.id}</div>
      </td>
      <td>
        <div style="font-weight: 700; color: #2563eb;">🏢 ${escapeHtml(visit.branchName)}</div>
        <div style="font-size: 11px; color: #64748b;">IT Staff: ${escapeHtml(visit.itStaff || 'IT Admin')}</div>
      </td>
      <td>
        <div style="font-weight: 600; color: #1e293b;">${escapeHtml(visit.purpose)}</div>
        <div style="font-size: 12px; color: #475569; margin-top: 3px;">${escapeHtml(visit.notes || '')}</div>
      </td>
      <td>
        <span class="badge ${badgeClass}">${escapeHtml(visit.status)}</span>
      </td>
      <td>
        ${visit.tasks && visit.tasks.length > 0 ? `
          <div style="font-size: 11px;">
            ${visit.tasks.map((t, idx) => `
              <div style="margin-bottom: 2px;">
                <input type="checkbox" ${t.done ? 'checked' : ''} onchange="toggleTaskDone('${visit.id}', ${idx})">
                <span style="${t.done ? 'text-decoration: line-through; color: #94a3b8;' : 'color: #334155;'}">${escapeHtml(t.desc)}</span>
              </div>
            `).join('')}
          </div>
        ` : '<span style="color: #94a3b8; font-size: 11px;">No checklist</span>'}
      </td>
      <td>
        <div style="display: flex; gap: 4px;">
          ${visit.status !== 'Completed' ? `
            <button class="btn btn-sm btn-success" title="Mark Completed" onclick="markVisitCompleted('${visit.id}')">
              ✅ Done
            </button>
          ` : ''}
          <button class="btn btn-sm btn-danger" title="Delete" onclick="deleteVisit('${visit.id}')">
            🗑️
          </button>
        </div>
      </td>
    `;
    tableBody.appendChild(tr);
  });
}

function openAddVisitModal() {
  document.getElementById('visitForm').reset();
  // Default to today's date
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('visitDate').value = today;
  openModal('visitModal');
}

function handleSaveVisit(event) {
  event.preventDefault();
  const visits = getVisits();
  const branches = getBranches();

  const branchId = document.getElementById('visitBranch').value;
  const branch = branches.find(b => b.id === branchId);
  const branchName = branch ? branch.name : 'Branch Office';

  const rawTasks = document.getElementById('visitTasks').value.split('\n').filter(t => t.trim().length > 0);
  const taskList = rawTasks.map(t => ({ desc: t.trim(), done: false }));

  const newVisit = {
    id: `VST-${(visits.length + 101)}`,
    branchId: branchId,
    branchName: branchName,
    date: document.getElementById('visitDate').value,
    itStaff: document.getElementById('visitStaff').value.trim() || 'IT Admin',
    purpose: document.getElementById('visitPurpose').value.trim(),
    status: document.getElementById('visitStatus').value,
    notes: document.getElementById('visitNotes').value.trim(),
    tasks: taskList
  };

  if (!newVisit.purpose || !newVisit.date) {
    showToast('Visit Date and Purpose are required!', 'warning');
    return;
  }

  visits.unshift(newVisit);
  saveVisits(visits);
  closeModal('visitModal');
  showToast(`Field visit to ${branchName} scheduled!`, 'success');
  renderVisits();
  renderDashboard();
  if (mapInstance) renderMapMarkers();
}

function toggleTaskDone(visitId, taskIndex) {
  const visits = getVisits();
  const visit = visits.find(v => v.id === visitId);
  if (visit && visit.tasks && visit.tasks[taskIndex]) {
    visit.tasks[taskIndex].done = !visit.tasks[taskIndex].done;
    saveVisits(visits);
    renderVisits();
  }
}

function markVisitCompleted(visitId) {
  const visits = getVisits();
  const visit = visits.find(v => v.id === visitId);
  if (visit) {
    visit.status = 'Completed';
    if (visit.tasks) {
      visit.tasks.forEach(t => t.done = true);
    }
    saveVisits(visits);
    showToast(`Trip ${visit.id} marked as Completed!`, 'success');
    renderVisits();
    renderDashboard();
  }
}

function deleteVisit(visitId) {
  if (!confirm(`Delete visit log "${visitId}"?`)) return;
  let visits = getVisits();
  visits = visits.filter(v => v.id !== visitId);
  saveVisits(visits);
  showToast('Visit record deleted.', 'info');
  renderVisits();
  renderDashboard();
}

// --- Printable Handover Slip & Gate Pass (Say Goodbye to Notebooks!) ---
function populateHandoverSelectors() {
  const assets = getAssets();
  const select = document.getElementById('handoverAssetSelect');
  if (!select) return;

  select.innerHTML = '<option value="">-- Choose a Laptop / Asset --</option>';
  assets.forEach(a => {
    const opt = document.createElement('option');
    opt.value = a.id;
    opt.textContent = `${a.id} - ${a.model} (S/N: ${a.serial}) [${a.status}]`;
    select.appendChild(opt);
  });
}

function openHandoverForAsset(assetId) {
  switchTab('handover');
  const select = document.getElementById('handoverAssetSelect');
  if (select) {
    select.value = assetId;
    loadHandoverAssetData();
  }
}

function loadHandoverAssetData() {
  const assetId = document.getElementById('handoverAssetSelect').value;
  const assets = getAssets();
  const branches = getBranches();
  const asset = assets.find(a => a.id === assetId);

  if (!asset) return;

  document.getElementById('handoverRecipientName').value = asset.assignedTo || '';
  document.getElementById('handoverDepartment').value = asset.assignedDept || '';
  if (asset.branchId) {
    document.getElementById('handoverBranchSelect').value = asset.branchId;
  }
  document.getElementById('handoverCondition').value = asset.condition || 'Good';

  generateHandoverPreview();
}

function generateHandoverPreview() {
  const assetId = document.getElementById('handoverAssetSelect').value;
  const assets = getAssets();
  const branches = getBranches();
  const asset = assets.find(a => a.id === assetId);

  const container = document.getElementById('handoverPreviewContainer');
  if (!asset) {
    container.innerHTML = `<div style="text-align: center; color: #94a3b8; padding: 40px;">Select a laptop above to generate an official handover slip!</div>`;
    return;
  }

  const recipient = document.getElementById('handoverRecipientName').value || '___________________________';
  const dept = document.getElementById('handoverDepartment').value || 'General / Branch Staff';
  const branchId = document.getElementById('handoverBranchSelect').value;
  const branch = branches.find(b => b.id === branchId) || { name: 'Main Office' };
  const handoverDate = document.getElementById('handoverDate').value || new Date().toISOString().split('T')[0];
  const condition = document.getElementById('handoverCondition').value;
  const accessories = document.getElementById('handoverAccessories').value || 'Power Adapter & Power Cord, Laptop Carrying Bag';

  container.innerHTML = `
    <div id="printSection" style="background: #ffffff; padding: 24px; border: 2px solid #0f172a; border-radius: 8px; font-family: Arial, sans-serif; color: #000000; max-width: 750px; margin: 0 auto;">
      <!-- Header -->
      <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #000; padding-bottom: 12px; margin-bottom: 16px;">
        <div>
          <h2 style="margin: 0; font-size: 20px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px;">OFFICIAL IT ASSET HANDOVER & GATE PASS</h2>
          <p style="margin: 2px 0 0 0; font-size: 12px; color: #333;">IT Department • Hardware Inventory & Branch Management System</p>
        </div>
        <div style="text-align: right;">
          <div style="font-weight: bold; font-size: 13px;">Ref: SLIP-${asset.id}</div>
          <div style="font-size: 11px; color: #444;">Date: ${handoverDate}</div>
        </div>
      </div>

      <!-- Recipient & Office Info -->
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 12px;">
        <tr style="background: #f1f5f9;">
          <td style="padding: 8px; border: 1px solid #cbd5e1; font-weight: bold; width: 25%;">Recipient Name:</td>
          <td style="padding: 8px; border: 1px solid #cbd5e1; width: 25%; font-weight: bold; color: #1e293b;">${escapeHtml(recipient)}</td>
          <td style="padding: 8px; border: 1px solid #cbd5e1; font-weight: bold; width: 25%;">Department:</td>
          <td style="padding: 8px; border: 1px solid #cbd5e1; width: 25%;">${escapeHtml(dept)}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border: 1px solid #cbd5e1; font-weight: bold;">Branch / Location:</td>
          <td style="padding: 8px; border: 1px solid #cbd5e1;">${escapeHtml(branch.name)}</td>
          <td style="padding: 8px; border: 1px solid #cbd5e1; font-weight: bold;">Issue Date:</td>
          <td style="padding: 8px; border: 1px solid #cbd5e1;">${handoverDate}</td>
        </tr>
      </table>

      <!-- Asset Specifications -->
      <h4 style="margin: 0 0 6px 0; font-size: 13px; text-transform: uppercase;">Equipment / Laptop Details</h4>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 12px;">
        <tr style="background: #f8fafc;">
          <th style="padding: 6px 8px; border: 1px solid #cbd5e1; text-align: left;">Asset Tag</th>
          <th style="padding: 6px 8px; border: 1px solid #cbd5e1; text-align: left;">Model Description</th>
          <th style="padding: 6px 8px; border: 1px solid #cbd5e1; text-align: left;">Serial Number (S/N)</th>
          <th style="padding: 6px 8px; border: 1px solid #cbd5e1; text-align: left;">Condition</th>
        </tr>
        <tr>
          <td style="padding: 8px; border: 1px solid #cbd5e1; font-weight: bold;">${asset.id}</td>
          <td style="padding: 8px; border: 1px solid #cbd5e1;">
            <strong>${escapeHtml(asset.model)}</strong>
            <div style="font-size: 11px; color: #475569;">${escapeHtml(asset.specs || '')}</div>
          </td>
          <td style="padding: 8px; border: 1px solid #cbd5e1; font-family: monospace; font-weight: bold;">${escapeHtml(asset.serial)}</td>
          <td style="padding: 8px; border: 1px solid #cbd5e1;">${escapeHtml(condition)}</td>
        </tr>
      </table>

      <!-- Accessories Included -->
      <div style="font-size: 12px; margin-bottom: 16px;">
        <strong>Included Accessories:</strong> ${escapeHtml(accessories)}
      </div>

      <!-- Undertaking / Agreement -->
      <div style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 10px; border-radius: 4px; font-size: 11px; color: #334155; line-height: 1.4; margin-bottom: 24px;">
        <strong>Acknowledgment & Responsibility:</strong>
        <p style="margin: 4px 0 0 0;">
          I acknowledge receipt of the IT equipment listed above in satisfactory working condition. I agree to use this device strictly for authorized company duties, adhere to information security guidelines, report any hardware damage/theft immediately to the IT Administrator, and return this equipment upon request or termination of employment.
        </p>
      </div>

      <!-- Dual Signature Lines -->
      <div style="display: flex; justify-content: space-between; margin-top: 40px; font-size: 12px;">
        <div style="width: 42%; text-align: center; border-top: 1px solid #000; padding-top: 6px;">
          <strong>IT Administrator / Issuer</strong>
          <p style="margin: 2px 0 0 0; font-size: 11px; color: #64748b;">Signature & Date</p>
        </div>
        <div style="width: 42%; text-align: center; border-top: 1px solid #000; padding-top: 6px;">
          <strong>Employee / Recipient</strong>
          <p style="margin: 2px 0 0 0; font-size: 11px; color: #64748b;">Signature & Date</p>
        </div>
      </div>
    </div>
  `;
}

function printHandoverSlip() {
  window.print();
}

// --- CSV / Excel Export & Backup ---
function exportAssetsToCSV() {
  const assets = getAssets();
  const branches = getBranches();

  const headers = ['Asset ID', 'Model', 'Serial Number', 'Specs', 'Status', 'Condition', 'Branch Location', 'Current User', 'Previous User', 'Department', 'Assigned Date', 'Purchase Date', 'Warranty Expiry', 'Notes'];

  const rows = assets.map(a => {
    const branch = branches.find(b => b.id === a.branchId) || { name: '' };
    return [
      a.id,
      `"${(a.model || '').replace(/"/g, '""')}"`,
      `"${(a.serial || '').replace(/"/g, '""')}"`,
      `"${(a.specs || '').replace(/"/g, '""')}"`,
      a.status,
      a.condition,
      `"${(branch.name || '').replace(/"/g, '""')}"`,
      `"${(a.assignedTo || '').replace(/"/g, '""')}"`,
      `"${(a.previousUser || '').replace(/"/g, '""')}"`,
      `"${(a.assignedDept || '').replace(/"/g, '""')}"`,
      a.assignedDate,
      a.purchaseDate,
      a.warrantyExpiry,
      `"${(a.notes || '').replace(/"/g, '""')}"`
    ];
  });

  const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `IT_Laptops_Inventory_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  showToast('IT Assets exported to CSV for Microsoft Excel!', 'success');
}

function exportVisitsToCSV() {
  const visits = getVisits();
  const headers = ['Visit ID', 'Date', 'Branch Name', 'IT Staff', 'Purpose', 'Status', 'Notes'];
  const rows = visits.map(v => [
    v.id,
    v.date,
    `"${(v.branchName || '').replace(/"/g, '""')}"`,
    `"${(v.itStaff || '').replace(/"/g, '""')}"`,
    `"${(v.purpose || '').replace(/"/g, '""')}"`,
    v.status,
    `"${(v.notes || '').replace(/"/g, '""')}"`
  ]);

  const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `Field_Office_Visits_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  showToast('Field Visits exported to CSV!', 'success');
}

function backupAllDataJSON() {
  const backup = {
    exportDate: new Date().toISOString(),
    assets: getAssets(),
    branches: getBranches(),
    visits: getVisits()
  };

  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backup, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute("href", dataStr);
  downloadAnchor.setAttribute("download", `NexusIT_Complete_Backup_${new Date().toISOString().split('T')[0]}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();

  showToast('Full system backup JSON saved safely!', 'success');
}

function restoreDataFromJSON(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const data = JSON.parse(e.target.result);
      if (data.assets && data.branches && data.visits) {
        saveAssets(data.assets);
        saveBranches(data.branches);
        saveVisits(data.visits);
        showToast('System data successfully restored from backup!', 'success');
        setTimeout(() => location.reload(), 1000);
      } else {
        showToast('Invalid backup file format!', 'danger');
      }
    } catch(err) {
      showToast('Error reading backup file: ' + err.message, 'danger');
    }
  };
  reader.readAsText(file);
}

function clearAllData() {
  if (!confirm('Are you sure you want to clear ALL records and start completely empty?')) return;
  saveAssets([]);
  saveBranches([]);
  saveVisits([]);
  showToast('All records cleared. System is now empty!', 'info');
  setTimeout(() => location.reload(), 400);
}

// --- UI Utility Functions ---
function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.add('active');
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.remove('active');
}

function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <span>${message}</span>
  `;

  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
