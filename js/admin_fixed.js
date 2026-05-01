/**
 * GINOVA - Admin Panel Operations
 * PREMIUM EDITION - CLEAN & STABLE
 * Full CRUD, Reports, Dashboard, Dark Mode, Export
 */

let consoleChartInstance = null;
let omzetChartInstance = null;
let categoryChartInstance = null;
let currentReportTransactions = [];

// ============================================
// DEFENSIVE DB HELPER (Prevent JSON parse errors)
// ============================================
function safeDbGet(key) {
  try {
    var raw = localStorage.getItem(key);
    if (!raw) return [];
    var parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.warn('[safeDbGet] Corrupt data for key:', key, e);
    localStorage.removeItem(key);
    return [];
  }
}

function safeDbGetObject(key) {
  try {
    var raw = localStorage.getItem(key);
    if (!raw) return null;
    var parsed = JSON.parse(raw);
    return (parsed && !Array.isArray(parsed)) ? parsed : null;
  } catch (e) {
    console.warn('[safeDbGetObject] Corrupt data for key:', key, e);
    localStorage.removeItem(key);
    return null;
  }
}

// ============================================
// PREMIUM UTILITIES
// ============================================
function showToast(message, type = 'success') {
  const toastContainer = document.getElementById('toastContainer');
  if (!toastContainer) return;
  
  const toast = document.createElement('div');
  toast.className = `gn-toast ${type}`;
  const iconMap = {
    success: 'bi-check-circle-fill text-success',
    error: 'bi-x-circle-fill text-danger',
    warning: 'bi-exclamation-triangle-fill text-warning',
    info: 'bi-info-circle-fill text-info'
  };
  toast.innerHTML = `
    <i class="bi ${iconMap[type] || iconMap.info} fs-4"></i>
    <div class="flex-grow-1">
      <div class="fw-semibold" style="font-size:0.95rem;">${message}</div>
    </div>
    <button class="btn btn-link text-muted p-0" onclick="this.parentElement.remove()">
      <i class="bi bi-x-lg"></i>
    </button>
  `;
  toastContainer.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('removing');
    setTimeout(() => toast.remove(), 350);
  }, 4000);
}

function animateCountUp(element, targetValue, isRupiah = false, duration = 1200) {
  if (!element) return;
  const startTime = performance.now();
  function update(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const easeOut = 1 - Math.pow(1 - progress, 3);
    const current = Math.floor(targetValue * easeOut);
    element.textContent = isRupiah ? utils.formatRupiah(current) : current.toLocaleString('id-ID');
    if (progress < 1) requestAnimationFrame(update);
  }
  requestAnimationFrame(update);
}

// ============================================
// DARK MODE
// ============================================
function toggleDarkMode() {
  const isDark = document.body.classList.contains('dark-mode');
  document.body.classList.toggle('dark-mode');
  const darkModeIcon = document.getElementById('darkModeIcon');
  if (darkModeIcon) {
    darkModeIcon.className = isDark ? 'bi bi-moon-stars' : 'bi bi-sun-fill';
  }
  localStorage.setItem('ginova_dark_mode', isDark ? '0' : '1');
}

function initDarkMode() {
  const saved = localStorage.getItem('ginova_dark_mode');
  const darkModeIcon = document.getElementById('darkModeIcon');
  if (saved === '1') {
    document.body.classList.add('dark-mode');
    if (darkModeIcon) darkModeIcon.className = 'bi bi-sun-fill';
  }
}

function toggleSidebar() {
  const sidebar = document.getElementById('adminSidebar');
  const overlay = document.getElementById('sidebarOverlay');
  sidebar.classList.toggle('show');
  if (overlay) overlay.classList.toggle('d-none');
}

function updateClock() {
  const clock = document.getElementById('headerClock');
  if (clock) {
    const now = new Date();
    clock.textContent = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }
}

function exportReportToExcel() {
  if (currentReportTransactions.length === 0) {
    showToast('Tidak ada data untuk diekspor. Tampilkan laporan terlebih dahulu.', 'warning');
    return;
  }
  const dateStr = document.getElementById('reportDate').value;
  const data = currentReportTransactions.map(tx => {
    const consoleData = db.getById(DB_KEYS.CONSOLES, tx.console_id);
    const pkg = db.getById(DB_KEYS.PACKAGES, tx.package_id);
    const items = getTransactionItems(tx.id);
    const fnbTotal = items.reduce((sum, item) => sum + (item.price * item.qty), 0);
    const duration = calculateDurationForReport(tx);
    const user = db.getById(DB_KEYS.USERS, tx.created_by);
    return {
      Tanggal: utils.formatDate(tx.paid_at),
      Transaksi: `${consoleData ? consoleData.name : '-'} - ${pkg ? pkg.name : '-'} (${duration})`,
      'F&B': fnbTotal,
      Total: tx.total_price || 0,
      'Metode Pembayaran': tx.payment_method || 'Cash',
      Kasir: user ? user.name : '-'
    };
  });
  const totalOmzet = currentReportTransactions.reduce((sum, tx) => sum + (tx.total_price || 0), 0);
  const totalFnB = currentReportTransactions.reduce((sum, tx) => {
    const items = getTransactionItems(tx.id);
    return sum + items.reduce((itemSum, item) => itemSum + (item.price * item.qty), 0);
  }, 0);
  data.push({ Tanggal: 'TOTAL', Transaksi: '', 'F&B': totalFnB, Total: totalOmzet, 'Metode Pembayaran': '', Kasir: '' });
  const ws = XLSX.utils.json_to_sheet(data);
  ws['!cols'] = [{ wch: 12 }, { wch: 25 }, { wch: 10 }, { wch: 12 }, { wch: 15 }, { wch: 15 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Laporan');
  XLSX.writeFile(wb, `Laporan_GiNova_${dateStr || 'semua'}.xlsx`);
  showToast('Laporan berhasil diekspor ke Excel!', 'success');
}

// ============================================
// KEYBOARD SHORTCUTS
// ============================================
document.addEventListener('keydown', (e) => {
  if (e.ctrlKey && e.key === 'd') {
    e.preventDefault();
    toggleDarkMode();
  }
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal.show').forEach(modalEl => {
      const modal = bootstrap.Modal.getInstance(modalEl);
      if (modal) modal.hide();
    });
  }
  if (e.ctrlKey && e.key === 's') {
    e.preventDefault();
    const openModal = document.querySelector('.modal.show');
    if (openModal) {
      const saveBtn = openModal.querySelector('.btn-gn-primary');
      if (saveBtn) saveBtn.click();
    }
  }
});

// ============================================
// INIT
// ============================================
document.addEventListener('DOMContentLoaded', () => {
  initDarkMode();
  updateClock();
  setInterval(updateClock, 1000);
  document.querySelectorAll('.btn-logout').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      if (confirm('Yakin ingin keluar?')) Auth.logout();
    });
  });
});

// ============================================
// SECTION NAVIGATION
// ============================================
function showSection(sectionName, evt) {
  document.querySelectorAll('.admin-section').forEach(sec => {
    sec.style.display = 'none';
    sec.classList.remove('fade-up');
  });
  const target = document.getElementById(`section-${sectionName}`) || document.getElementById('section-dashboard');
  target.style.display = 'block';
  setTimeout(() => target.classList.add('fade-up'), 10);
  document.querySelectorAll('.sidebar-nav .nav-link').forEach(link => link.classList.remove('active'));
  if (evt && evt.target) {
    evt.target.closest('.nav-link').classList.add('active');
  }

  // Sinkronisasi data saat berpindah seksi agar tabel selalu update
  if (sectionName === 'dashboard') renderAdminDashboard();
  if (sectionName === 'consoles') renderConsolesTable();
  if (sectionName === 'packages') renderPackagesTable();
  if (sectionName === 'products') renderProductsTable();
  if (sectionName === 'users') renderUsersTable();
  if (sectionName === 'void-audit') renderVoidAudit();

  const titles = {
    dashboard: 'Dashboard Admin',
    consoles: 'Kelola Unit PS',
    packages: 'Kelola Paket',
    products: 'Kelola Produk F&B',
    users: 'Kelola Pengguna',
    reports: 'Laporan Keuangan',
    'void-audit': 'Audit Void F&B'
  };
  const pageTitle = document.getElementById('pageTitle');
  if (pageTitle) pageTitle.textContent = titles[sectionName] || 'Admin Panel';
  if (window.innerWidth < 992) toggleSidebar();
}

// ============================================
// ADMIN DASHBOARD RENDERING
// ============================================
function renderAdminDashboard(options = {}) {
  const today = utils.getToday();
  const transactions = safeDbGet(DB_KEYS.TRANSACTIONS).filter(tx => {
    if (!tx.paid_at) return false;
    return tx.paid_at.split('T')[0] === today;
  });
  const consoles = options.apiUnits || safeDbGet(DB_KEYS.CONSOLES);
  const users = safeDbGet(DB_KEYS.USERS);
  const totalOmzet = options.revenueToday && typeof options.revenueToday.total === 'number'
    ? options.revenueToday.total
    : transactions.reduce((sum, tx) => sum + (tx.total_price || 0), 0);
  renderAdminDashboardSummary({
    totalOmzet: totalOmzet,
    totalTransaksi: transactions.length,
    totalPS: consoles.length,
    totalUser: users.length
  });
  renderConsoleChart(consoles);
  renderOmzetChart();
}

function renderAdminDashboardSummary(data) {
  const container = document.getElementById('adminDashboardSummaryContainer');
  if (!container) return;
  const consoles = safeDbGet(DB_KEYS.CONSOLES);
  const available = consoles.filter(c => c.status === 'available').length;
  const busy = consoles.filter(c => c.status === 'busy').length;
  container.innerHTML = `
    <div class="summary-card">
      <div class="summary-icon"><i class="bi bi-cash-stack"></i></div>
      <div class="summary-content">
        <div class="summary-value">${typeof data.totalOmzet === 'number' ? utils.formatRupiah(data.totalOmzet) : data.totalOmzet}</div>
        <div class="summary-label">Total Omzet Hari Ini</div>
      </div>
    </div>
    <div class="summary-card">
      <div class="summary-icon"><i class="bi bi-receipt"></i></div>
      <div class="summary-content">
        <div class="summary-value">${data.totalTransaksi}</div>
        <div class="summary-label">Transaksi Hari Ini</div>
      </div>
    </div>
    <div class="summary-card">
      <div class="summary-icon"><i class="bi bi-controller"></i></div>
      <div class="summary-content">
        <div class="summary-value">${data.totalPS}</div>
        <div class="summary-label">Total Unit PS</div>
        <div class="summary-subtext">
          <span class="text-success">${available} tersedia</span> • 
          <span class="text-warning">${busy} digunakan</span>
        </div>
      </div>
    </div>
    <div class="summary-card">
      <div class="summary-icon"><i class="bi bi-people"></i></div>
      <div class="summary-content">
        <div class="summary-value">${data.totalUser}</div>
        <div class="summary-label">Total Pengguna</div>
      </div>
    </div>
  `;
}

function renderConsoleChart(consoles) {
  const canvas = document.getElementById('consoleChart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const isDark = document.body.classList.contains('dark-mode');
  const available = consoles.filter(c => c.status === 'available').length;
  const busy = consoles.filter(c => c.status === 'busy').length;
  if (consoleChartInstance) consoleChartInstance.destroy();
  consoleChartInstance = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Tersedia', 'Terpakai'],
      datasets: [{
        data: [available, busy],
        backgroundColor: isDark ? ['#10b981', '#f59e0b'] : ['#198754', '#ffc107'],
        borderWidth: 4,
        borderColor: isDark ? '#1e293b' : '#ffffff',
        hoverOffset: 12
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '65%',
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: isDark ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255,255,255,0.95)',
          titleColor: isDark ? '#f1f5f9' : '#212529',
          bodyColor: isDark ? '#e2e8f0' : '#212529',
          borderColor: isDark ? 'rgba(148,163,184,0.2)' : 'rgba(25,135,84,0.2)',
          borderWidth: 1,
          padding: 14,
          cornerRadius: 12,
          displayColors: true,
          boxPadding: 6
        }
      },
      animation: {
        animateScale: true,
        animateRotate: true,
        duration: 1000,
        easing: 'easeOutQuart'
      }
    }
  });
  const legendContainer = document.getElementById('consoleLegend');
  if (legendContainer) {
    legendContainer.innerHTML = `
      <div class="legend-item"><span class="legend-bullet available"></span><span>Tersedia (${available})</span></div>
      <div class="legend-item"><span class="legend-bullet busy"></span><span>Terpakai (${busy})</span></div>
    `;
  }
}

function renderOmzetChart() {
  const canvas = document.getElementById('omzetChart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const isDark = document.body.classList.contains('dark-mode');
  const labels = [];
  const data = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    labels.push(d.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric' }));
    const dayTransactions = safeDbGet(DB_KEYS.TRANSACTIONS).filter(tx => {
      if (!tx.paid_at) return false;
      return tx.paid_at.split('T')[0] === dateStr;
    });
    const dayOmzet = dayTransactions.reduce((sum, tx) => sum + (tx.total_price || 0), 0);
    data.push(dayOmzet);
  }
  if (omzetChartInstance) omzetChartInstance.destroy();
  const gradient = ctx.createLinearGradient(0, 0, 0, 300);
  gradient.addColorStop(0, isDark ? 'rgba(134, 239, 172, 0.4)' : 'rgba(134, 239, 172, 0.5)');
  gradient.addColorStop(1, isDark ? 'rgba(16, 185, 129, 0.02)' : 'rgba(255, 255, 255, 0)');
  omzetChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'Omzet',
        data: data,
        borderColor: isDark ? '#10b981' : '#198754',
        backgroundColor: gradient,
        fill: true,
        tension: 0.45,
        pointBackgroundColor: isDark ? '#0f172a' : '#ffffff',
        pointBorderColor: isDark ? '#10b981' : '#198754',
        pointBorderWidth: 3,
        pointRadius: 6,
        pointHoverRadius: 9,
        pointHoverBackgroundColor: isDark ? '#10b981' : '#198754',
        pointHoverBorderColor: isDark ? '#f1f5f9' : '#ffffff',
        pointHoverBorderWidth: 3
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { intersect: false, mode: 'index' },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: isDark ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255,255,255,0.95)',
          titleColor: isDark ? '#f1f5f9' : '#212529',
          bodyColor: isDark ? '#e2e8f0' : '#212529',
          borderColor: isDark ? 'rgba(148,163,184,0.2)' : 'rgba(25,135,84,0.2)',
          borderWidth: 1,
          padding: 14,
          cornerRadius: 12,
          callbacks: {
            label: function(context) {
              return 'Omzet: ' + utils.formatRupiah(context.raw);
            }
          }
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: {
            color: isDark ? '#94a3b8' : '#6c757d',
            font: { size: 12 }
          }
        },
        y: {
          beginAtZero: true,
          border: { display: false },
          grid: {
            color: isDark ? 'rgba(148,163,184,0.08)' : 'rgba(0,0,0,0.05)',
            drawBorder: false
          },
          ticks: {
            color: isDark ? '#94a3b8' : '#6c757d',
            callback: function(value) {
              if (value >= 1000000) return 'Rp ' + (value/1000000).toFixed(1) + 'jt';
              if (value >= 1000) return 'Rp ' + (value/1000).toFixed(0) + 'k';
              return 'Rp ' + value;
            },
            font: { size: 11 }
          }
        }
      },
      animation: {
        duration: 1200,
        easing: 'easeOutQuart'
      }
    }
  });
}

// ============================================
// DEFENSIVE API FETCH
// ============================================
async function fetchDashboardApiData() {
  const response = await fetch(`api/get_dashboard.php?ts=${Date.now()}`, { cache: 'no-store' });
  if (!response.ok) throw new Error('Gagal memuat data dashboard dari server');
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    const rawText = await response.text();
    console.warn('[fetchDashboardApiData] Server returned non-JSON:', rawText.substring(0, 200));
    throw new Error('Server mengembalikan respons non-JSON (mungkin error page)');
  }
  let payload;
  try {
    payload = await response.json();
  } catch (jsonErr) {
    console.error('[fetchDashboardApiData] JSON parse error:', jsonErr);
    throw new Error('Gagal parse data JSON dari server');
  }
  if (payload.status !== 'success') throw new Error(payload.message || 'Respon API tidak valid');
  return payload.data;
}

function setRefreshLoading(isLoading) {
  const btn = document.getElementById('btnAdminRefresh');
  const icon = document.getElementById('refreshAdminIcon');
  if (btn) btn.disabled = isLoading;
  if (icon) {
    if (isLoading) icon.classList.add('spin');
    else icon.classList.remove('spin');
  }
}

async function refreshAdminDashboard() {
  setRefreshLoading(true);
  try {
    const data = await fetchDashboardApiData();
    renderAdminDashboard({ apiUnits: data.units, revenueToday: data.revenue_today });
    showToast('Data dashboard berhasil diperbarui.', 'success');
  } catch (error) {
    console.error(error);
    showToast(error.message || 'Gagal memperbarui dashboard.', 'error');
  } finally {
    setRefreshLoading(false);
  }
}

// ============================================
// CONSOLES CRUD
// ============================================
function renderConsolesTable() {
  const tbody = document.getElementById('adminConsolesTable');
  const consoles = safeDbGet(DB_KEYS.CONSOLES);
  tbody.innerHTML = consoles.map(c => {
    let statusBadge = '';
    let statusText = '';
    if (c.status === 'available') { statusBadge = 'bg-success'; statusText = 'Tersedia'; }
    else if (c.status === 'busy') { statusBadge = 'bg-danger'; statusText = 'Terpakai'; }
    else if (c.status === 'booking') { statusBadge = 'bg-warning text-dark'; statusText = 'Booking'; }
    return `
    <tr>
      <td class="fw-semibold">${c.name}</td>
      <td><span class="badge bg-light text-dark border">${c.type}</span></td>
      <td><span class="badge ${statusBadge}">${statusText}</span></td>
      <td class="text-center">
        <button class="btn btn-sm btn-outline-primary me-1" onclick="editConsole('${c.id}')"><i class="bi bi-pencil"></i></button>
        <button class="btn btn-sm btn-outline-danger" onclick="deleteConsole('${c.id}')"><i class="bi bi-trash"></i></button>
      </td>
    </tr>
  `;
  }).join('');
}

function openConsoleModal(consoleId = null) {
  document.getElementById('consoleId').value = consoleId || '';
  document.getElementById('consoleName').value = '';
  document.getElementById('consoleType').value = 'PS4';
  if (consoleId) {
    const c = db.getById(DB_KEYS.CONSOLES, consoleId);
    if (c) {
      document.getElementById('consoleName').value = c.name;
      document.getElementById('consoleType').value = c.type;
    }
  }
  const modal = new bootstrap.Modal(document.getElementById('consoleModal'));
  modal.show();
}

function saveConsole() {
  const id = document.getElementById('consoleId').value;
  const name = document.getElementById('consoleName').value.trim();
  const type = document.getElementById('consoleType').value;
  if (!name) { showToast('Nama unit harus diisi!', 'error'); return; }
  if (id) {
    db.update(DB_KEYS.CONSOLES, id, { name, type });
    showToast('Unit PS berhasil diperbarui!', 'success');
  } else {
    db.add(DB_KEYS.CONSOLES, { id: utils.generateId(), name, type, status: 'available', created_at: new Date().toISOString() });
    showToast('Unit PS berhasil ditambahkan!', 'success');
  }
  bootstrap.Modal.getInstance(document.getElementById('consoleModal')).hide();
  renderConsolesTable();
  renderAdminDashboard();
}

function editConsole(id) { openConsoleModal(id); }

function deleteConsole(id) {
  const c = db.getById(DB_KEYS.CONSOLES, id);
  if (c && c.status === 'busy') { showToast('Unit sedang terpakai, tidak bisa dihapus!', 'warning'); return; }
  if (confirm('Yakin ingin menghapus unit ini?')) {
    db.delete(DB_KEYS.CONSOLES, id);
    renderConsolesTable();
    renderAdminDashboard();
    showToast('Unit PS berhasil dihapus!', 'success');
  }
}

// ============================================
// PACKAGES CRUD
// ============================================
function renderPackagesTable() {
  const tbody = document.getElementById('adminPackagesTable');
  const packages = safeDbGet(DB_KEYS.PACKAGES);
  tbody.innerHTML = packages.map(p => `
    <tr>
      <td class="fw-semibold">${p.name}</td>
      <td>${p.duration > 0 ? p.duration + ' menit' : 'Reguler'}</td>
      <td>${utils.formatRupiah(p.price)}</td>
      <td>${p.description || ''}</td>
      <td class="text-center">
        <button class="btn btn-sm btn-outline-primary me-1" onclick="editPackage('${p.id}')"><i class="bi bi-pencil"></i></button>
        <button class="btn btn-sm btn-outline-danger" onclick="deletePackage('${p.id}')"><i class="bi bi-trash"></i></button>
      </td>
    </tr>
  `).join('');
}

function openPackageModal(packageId = null) {
  document.getElementById('packageId').value = packageId || '';
  document.getElementById('packageName').value = '';
  document.getElementById('packageDuration').value = '';
  document.getElementById('packagePrice').value = '';
  document.getElementById('packageDesc').value = '';
  if (packageId) {
    const p = db.getById(DB_KEYS.PACKAGES, packageId);
    if (p) {
      document.getElementById('packageName').value = p.name;
      document.getElementById('packageDuration').value = p.duration;
      document.getElementById('packagePrice').value = p.price;
      document.getElementById('packageDesc').value = p.description;
    }
  }
  const modal = new bootstrap.Modal(document.getElementById('packageModal'));
  modal.show();
}

function savePackage() {
  const id = document.getElementById('packageId').value;
  const name = document.getElementById('packageName').value.trim();
  const duration = parseInt(document.getElementById('packageDuration').value) || 0;
  const price = parseInt(document.getElementById('packagePrice').value) || 0;
  const desc = document.getElementById('packageDesc').value.trim();
  if (!name || price <= 0) { showToast('Nama dan harga harus diisi dengan benar!', 'error'); return; }
  if (id) {
    db.update(DB_KEYS.PACKAGES, id, { name, duration, price, description: desc });
    showToast('Paket berhasil diperbarui!', 'success');
  } else {
    db.add(DB_KEYS.PACKAGES, { id: utils.generateId(), name, duration, price, description: desc, created_at: new Date().toISOString() });
    showToast('Paket berhasil ditambahkan!', 'success');
  }
  bootstrap.Modal.getInstance(document.getElementById('packageModal')).hide();
  renderPackagesTable();
}

function editPackage(id) { openPackageModal(id); }

function deletePackage(id) {
  if (confirm('Yakin ingin menghapus paket ini?')) {
    db.delete(DB_KEYS.PACKAGES, id);
    renderPackagesTable();
    showToast('Paket berhasil dihapus!', 'success');
  }
}

// ============================================
// PRODUCTS CRUD
// ============================================
function renderProductsTable() {
  const tbody = document.getElementById('adminProductsTable');
  const products = safeDbGet(DB_KEYS.PRODUCTS);
  tbody.innerHTML = products.map(p => `
    <tr>
      <td class="fw-semibold">${p.name}</td>
      <td><span class="badge bg-light text-dark border">${p.category}</span></td>
      <td class="text-warning fw-bold">${p.stock}</td>
      <td class="text-success fw-bold">${utils.formatRupiah(p.price)}</td>
      <td class="text-center">
        <button class="btn btn-sm btn-outline-primary me-1" onclick="editProduct('${p.id}')"><i class="bi bi-pencil"></i></button>
        <button class="btn btn-sm btn-outline-danger" onclick="deleteProduct('${p.id}')"><i class="bi bi-trash"></i></button>
      </td>
    </tr>
  `).join('');
}

function openProductModal(productId = null) {
  document.getElementById('productId').value = productId || '';
  document.getElementById('productName').value = '';
  document.getElementById('productCategory').value = 'Makanan';
  document.getElementById('productStock').value = '';
  document.getElementById('productPrice').value = '';
  if (productId) {
    const p = db.getById(DB_KEYS.PRODUCTS, productId);
    if (p) {
      document.getElementById('productName').value = p.name;
      document.getElementById('productCategory').value = p.category;
      document.getElementById('productStock').value = p.stock;
      document.getElementById('productPrice').value = p.price;
    }
  }
  const modal = new bootstrap.Modal(document.getElementById('productModal'));
  modal.show();
}

function saveProduct() {
  const id = document.getElementById('productId').value;
  const name = document.getElementById('productName').value.trim();
  const category = document.getElementById('productCategory').value;
  const stock = parseInt(document.getElementById('productStock').value) || 0;
  const price = parseInt(document.getElementById('productPrice').value) || 0;
  if (!name || price <= 0 || stock < 0) { showToast('Data tidak lengkap atau tidak valid!', 'error'); return; }
  if (id) {
    db.update(DB_KEYS.PRODUCTS, id, { name, category, stock, price });
    showToast('Produk berhasil diperbarui!', 'success');
  } else {
    db.add(DB_KEYS.PRODUCTS, { id: utils.generateId(), name, category, stock, price, created_at: new Date().toISOString() });
    showToast('Produk berhasil ditambahkan!', 'success');
  }
  bootstrap.Modal.getInstance(document.getElementById('productModal')).hide();
  renderProductsTable();
}

function editProduct(id) { openProductModal(id); }

function deleteProduct(id) {
  if (confirm('Yakin ingin menghapus produk ini?')) {
    db.delete(DB_KEYS.PRODUCTS, id);
    renderProductsTable();
    showToast('Produk berhasil dihapus!', 'success');
  }
}

// ============================================
// USERS CRUD (FIXED HASH)
// ============================================
function renderUsersTable() {
  const tbody = document.getElementById('adminUsersTable');
  if (!tbody) return;
  const users = safeDbGet(DB_KEYS.USERS);
  tbody.innerHTML = users.map(u => `
    <tr>
      <td>${u.name}</td>
      <td>${u.username}</td>
      <td><span class="badge ${u.role === 'admin' ? 'bg-danger' : 'bg-primary'}">${u.role}</span></td>
      <td>
        <button class="btn btn-sm btn-outline-primary me-1" onclick="openUserModal('${u.id}')">
          <i class="bi bi-pencil"></i>
        </button>
        <button class="btn btn-sm btn-outline-danger" onclick="deleteUser('${u.id}')">
          <i class="bi bi-trash"></i>
        </button>
      </td>
    </tr>
  `).join('');
}

function openUserModal(userId = null) {
  document.getElementById('userId').value = userId || '';
  document.getElementById('userFullName').value = '';
  document.getElementById('userUsername').value = '';
  document.getElementById('userPassword').value = '';
  document.getElementById('userRoleSelect').value = 'kasir';
  if (userId) {
    const u = db.getById(DB_KEYS.USERS, userId);
    if (u) {
      document.getElementById('userFullName').value = u.name;
      document.getElementById('userUsername').value = u.username;
      document.getElementById('userRoleSelect').value = u.role;
    }
  }
  const modal = new bootstrap.Modal(document.getElementById('userModal'));
  modal.show();
}

function saveUser() {
  const id = document.getElementById('userId').value;
  const name = document.getElementById('userFullName').value.trim();
  const username = document.getElementById('userUsername').value.trim();
  const password = document.getElementById('userPassword').value;
  const role = document.getElementById('userRoleSelect').value;
  if (!name || !username) {
    showToast('Nama dan username harus diisi!', 'error');
    return;
  }
  try {
    const userData = { name, username, role };
    if (password) userData.password = HashUtil.sha256Sync(password);
    if (id) {
      db.update(DB_KEYS.USERS, id, userData);
      showToast('Pengguna berhasil diperbarui!', 'success');
    } else {
      const newId = utils.generateId();
      userData.id = newId;
      userData.created_at = new Date().toISOString();
      db.add(DB_KEYS.USERS, userData);
      showToast('Pengguna berhasil ditambahkan!', 'success');
    }
    bootstrap.Modal.getInstance(document.getElementById('userModal')).hide();
    renderUsersTable();
    renderAdminDashboard();
  } catch (e) {
    console.error(e);
    showToast('Gagal menyimpan pengguna!', 'error');
  }
}

function deleteUser(id) {
  if (!confirm('Yakin ingin menghapus pengguna ini?')) return;
  try {
    db.delete(DB_KEYS.USERS, id);
    showToast('Pengguna berhasil dihapus!', 'success');
    renderUsersTable();
    renderAdminDashboard();
  } catch (e) {
    console.error(e);
    showToast('Gagal menghapus pengguna!', 'error');
  }
}

// ============================================
// REPORTS & AUDIT
// ============================================
function generateReport() {
  const dateStr = document.getElementById('reportDate').value;
  if (!dateStr) {
    showToast('Pilih tanggal terlebih dahulu!', 'warning');
    return;
  }
  const transactions = safeDbGet(DB_KEYS.TRANSACTIONS).filter(tx => {
    if (!tx.paid_at) return false;
    return tx.paid_at.split('T')[0] === dateStr;
  });
  currentReportTransactions = transactions;
  renderReportTable(transactions);
  renderCategoryChart(transactions);
  renderFnBTable(transactions);
  const total = transactions.reduce((sum, tx) => sum + (tx.total_price || 0), 0);
  document.getElementById('reportTotal').textContent = utils.formatRupiah(total);
}

function renderReportTable(transactions) {
  const tbody = document.getElementById('reportTransactionsTable');
  if (!tbody) return;
  tbody.innerHTML = transactions.map(tx => {
    const consoleData = db.getById(DB_KEYS.CONSOLES, tx.console_id);
    const pkg = db.getById(DB_KEYS.PACKAGES, tx.package_id);
    const items = getTransactionItems(tx.id);
    const fnbTotal = items.reduce((sum, item) => sum + (item.price * item.qty), 0);
    const duration = calculateDurationForReport(tx);
    const user = db.getById(DB_KEYS.USERS, tx.created_by);
    return `
      <tr>
        <td>${utils.formatDate(tx.paid_at)}</td>
        <td>${consoleData ? consoleData.name : '-'}</td>
        <td>${pkg ? pkg.name : '-'}</td>
        <td>${duration}</td>
        <td>${utils.formatRupiah(fnbTotal)}</td>
        <td>${utils.formatRupiah(tx.total_price)}</td>
        <td>${user ? user.name : '-'}</td>
      </tr>
    `;
  }).join('');
}

function renderCategoryChart(transactions) {
  const canvas = document.getElementById('categoryChart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const isDark = document.body.classList.contains('dark-mode');
  const categoryData = {};
  transactions.forEach(tx => {
    const items = getTransactionItems(tx.id);
    items.forEach(item => {
      const product = db.getById(DB_KEYS.PRODUCTS, item.product_id);
      if (product) {
        const cat = product.category;
        categoryData[cat] = (categoryData[cat] || 0) + (item.price * item.qty);
      }
    });
  });
  if (categoryChartInstance) categoryChartInstance.destroy();
  categoryChartInstance = new Chart(ctx, {
    type: 'pie',
    data: {
      labels: Object.keys(categoryData),
      datasets: [{
        data: Object.values(categoryData),
        backgroundColor: isDark ? ['#10b981', '#f59e0b', '#ef4444'] : ['#198754', '#ffc107', '#dc3545'],
        borderWidth: 2,
        borderColor: isDark ? '#1e293b' : '#ffffff'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        tooltip: {
          callbacks: {
            label: function(context) {
              return context.label + ': ' + utils.formatRupiah(context.raw);
            }
          }
        }
      }
    }
  });
}

function renderFnBTable(transactions) {
  const tbody = document.getElementById('reportFnBTable');
  if (!tbody) return;
  const fnbData = {};
  transactions.forEach(tx => {
    const items = getTransactionItems(tx.id);
    items.forEach(item => {
      const product = db.getById(DB_KEYS.PRODUCTS, item.product_id);
      if (product) {
        const name = product.name;
        fnbData[name] = (fnbData[name] || { qty: 0, total: 0 });
        fnbData[name].qty += item.qty;
        fnbData[name].total += item.price * item.qty;
      }
    });
  });
  tbody.innerHTML = Object.entries(fnbData).map(([name, data]) => `
    <tr>
      <td>${name}</td>
      <td>${data.qty}</td>
      <td>${utils.formatRupiah(data.total)}</td>
    </tr>
  `).join('');
}

function renderVoidAudit() {
  const tbody = document.getElementById('voidAuditTable');
  if (!tbody) return;
  const items = safeDbGet(DB_KEYS.TRANSACTION_ITEMS).filter(item => item.status === 'void');
  const totalKerugian = items.reduce((sum, item) => sum + (item.price * item.qty), 0);
  document.getElementById('voidAuditCount').textContent = items.length;
  document.getElementById('voidAuditTotal').textContent = utils.formatRupiah(totalKerugian);
  document.getElementById('voidAuditTotalFooter').textContent = utils.formatRupiah(totalKerugian);
  tbody.innerHTML = items.map(item => {
    const tx = db.getById(DB_KEYS.TRANSACTIONS, item.transaction_id);
    const consoleData = tx ? db.getById(DB_KEYS.CONSOLES, tx.console_id) : null;
    const user = item.voided_by ? db.getById(DB_KEYS.USERS, item.voided_by) : null;
    return `
      <tr>
        <td>${item.product_name}</td>
        <td>${item.qty}</td>
        <td>${utils.formatRupiah(item.price)}</td>
        <td>${utils.formatRupiah(item.price * item.qty)}</td>
        <td>${consoleData ? consoleData.name : (tx && tx.is_guest_fnb_only ? 'Tamu (F&B)' : '-')}</td>
        <td>${user ? user.name : '-'}</td>
        <td>${utils.formatDate(item.voided_at)}</td>
      </tr>
    `;
  }).join('');
}

// ============================================
// HELPER FUNCTIONS
// ============================================
function getTransactionItems(transactionId) {
  return safeDbGet(DB_KEYS.TRANSACTION_ITEMS).filter(item => item.transaction_id === transactionId);
}

function calculateDurationForReport(tx) {
  if (!tx.start_time || !tx.paid_at) return '-';
  const start = new Date(tx.start_time);
  const end = new Date(tx.paid_at);
  const diffMs = end - start;
  const diffMins = Math.floor(diffMs / 60000);
  const hours = Math.floor(diffMins / 60);
  const mins = diffMins % 60;
  return hours > 0 ? `${hours}j ${mins}m` : `${mins}m`;
}

// ============================================
// INIT CALLS (Run after DOM loaded)
// ============================================
document.addEventListener('DOMContentLoaded', () => {
  initDarkMode();
  updateClock();
  setInterval(updateClock, 1000);
  renderConsolesTable();
  renderPackagesTable();
  renderProductsTable();
  renderUsersTable();
  renderAdminDashboard();
  document.querySelectorAll('.btn-logout').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      if (confirm('Yakin ingin keluar?')) Auth.logout();
    });
  });
  
  // Set default report date
  document.getElementById('reportDate').value = utils.getToday();
});
