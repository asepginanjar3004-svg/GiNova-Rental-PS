/**
 * GINOVA - Admin Panel Operations
 * CRUD Consoles, Packages, Products, Users, Reports
 */

let consoleChartInstance = null;
let omzetChartInstance = null;
let categoryChartInstance = null;

// ============================================
// INIT
// ============================================
document.addEventListener('DOMContentLoaded', () => {
  renderAdminDashboard();
  renderConsolesTable();
  renderPackagesTable();
  renderProductsTable();
  renderUsersTable();
});

// ============================================
// SECTION NAVIGATION
// ============================================
function showSection(sectionName) {
  document.querySelectorAll('.admin-section').forEach(sec => {
    sec.style.display = 'none';
  });
  document.getElementById(`section-${sectionName}`).style.display = 'block';
  
  // Update nav active state
  document.querySelectorAll('.navbar-nav .nav-link').forEach(link => {
    link.classList.remove('active');
  });
  event.target.closest('.nav-link').classList.add('active');
  
  // Refresh data when showing specific sections
  if (sectionName === 'dashboard') {
    renderAdminDashboard();
  } else if (sectionName === 'reports') {
    generateReport();
  }
}

// ============================================
// ADMIN DASHBOARD
// ============================================
function renderAdminDashboard() {
  const today = utils.getToday();
  const transactions = db.get(DB_KEYS.TRANSACTIONS).filter(tx => {
    if (!tx.paid_at) return false;
    const paidDate = tx.paid_at.split('T')[0];
    return paidDate === today;
  });
  
  const totalOmzet = transactions.reduce((sum, tx) => sum + (tx.total_price || 0), 0);
  const consoles = db.get(DB_KEYS.CONSOLES);
  const users = db.get(DB_KEYS.USERS);
  
  document.getElementById('adminTotalOmzet').textContent = utils.formatRupiah(totalOmzet);
  document.getElementById('adminTotalTransaksi').textContent = transactions.length;
  document.getElementById('adminTotalPS').textContent = consoles.length;
  document.getElementById('adminTotalUser').textContent = users.length;
  
  renderConsoleChart(consoles);
  renderOmzetChart();
}

function renderConsoleChart(consoles) {
  const ctx = document.getElementById('consoleChart').getContext('2d');
  const available = consoles.filter(c => c.status === 'available').length;
  const busy = consoles.filter(c => c.status === 'busy').length;
  
  if (consoleChartInstance) consoleChartInstance.destroy();
  
  consoleChartInstance = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Tersedia', 'Terpakai'],
      datasets: [{
        data: [available, busy],
        backgroundColor: ['#198754', '#ffc107'],
        borderWidth: 0
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom' }
      }
    }
  });
}

function renderOmzetChart() {
  const ctx = document.getElementById('omzetChart').getContext('2d');
  const labels = [];
  const data = [];
  
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    labels.push(d.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric' }));
    
    const dayTransactions = db.get(DB_KEYS.TRANSACTIONS).filter(tx => {
      if (!tx.paid_at) return false;
      return tx.paid_at.split('T')[0] === dateStr;
    });
    
    const dayOmzet = dayTransactions.reduce((sum, tx) => sum + (tx.total_price || 0), 0);
    data.push(dayOmzet);
  }
  
  if (omzetChartInstance) omzetChartInstance.destroy();
  
  omzetChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'Omzet',
        data: data,
        borderColor: '#198754',
        backgroundColor: 'rgba(25, 135, 84, 0.1)',
        fill: true,
        tension: 0.4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: function(value) {
              return 'Rp ' + value.toLocaleString('id-ID');
            }
          }
        }
      }
    }
  });
}

// ============================================
// CONSOLES CRUD
// ============================================
function renderConsolesTable() {
  const tbody = document.getElementById('adminConsolesTable');
  const consoles = db.get(DB_KEYS.CONSOLES);
  
  tbody.innerHTML = consoles.map(c => `
    <tr>
      <td class="fw-semibold">${c.name}</td>
      <td><span class="badge bg-light text-dark border">${c.type}</span></td>
      <td>
        <span class="badge ${c.status === 'available' ? 'bg-success' : 'bg-warning text-dark'}">
          ${c.status === 'available' ? 'Tersedia' : 'Terpakai'}
        </span>
      </td>
      <td class="text-center">
        <button class="btn btn-sm btn-outline-primary me-1" onclick="editConsole('${c.id}')">
          <i class="bi bi-pencil"></i>
        </button>
        <button class="btn btn-sm btn-outline-danger" onclick="deleteConsole('${c.id}')">
          <i class="bi bi-trash"></i>
        </button>
      </td>
    </tr>
  `).join('');
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
  
  if (!name) {
    alert('Nama unit harus diisi!');
    return;
  }
  
  if (id) {
    db.update(DB_KEYS.CONSOLES, id, { name, type });
  } else {
    db.add(DB_KEYS.CONSOLES, {
      id: utils.generateId(),
      name,
      type,
      status: 'available',
      created_at: new Date().toISOString()
    });
  }
  
  bootstrap.Modal.getInstance(document.getElementById('consoleModal')).hide();
  renderConsolesTable();
  renderAdminDashboard();
}

function editConsole(id) {
  openConsoleModal(id);
}

function deleteConsole(id) {
  const c = db.getById(DB_KEYS.CONSOLES, id);
  if (c && c.status === 'busy') {
    alert('Unit sedang terpakai, tidak bisa dihapus!');
    return;
  }
  
  if (confirm('Yakin ingin menghapus unit ini?')) {
    db.delete(DB_KEYS.CONSOLES, id);
    renderConsolesTable();
    renderAdminDashboard();
  }
}

// ============================================
// PACKAGES CRUD
// ============================================
function renderPackagesTable() {
  const tbody = document.getElementById('adminPackagesTable');
  const packages = db.get(DB_KEYS.PACKAGES);
  
  tbody.innerHTML = packages.map(p => `
    <tr>
      <td class="fw-semibold">${p.name}</td>
      <td>${p.duration > 0 ? p.duration + ' menit' : 'Reguler'}</td>
      <td>${utils.formatRupiah(p.price)}</td>
      <td>${p.description || '-'}</td>
      <td class="text-center">
        <button class="btn btn-sm btn-outline-primary me-1" onclick="editPackage('${p.id}')">
          <i class="bi bi-pencil"></i>
        </button>
        <button class="btn btn-sm btn-outline-danger" onclick="deletePackage('${p.id}')">
          <i class="bi bi-trash"></i>
        </button>
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
      document.getElementById('packageDesc').value = p.description || '';
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
  const description = document.getElementById('packageDesc').value.trim();
  
  if (!name || price <= 0) {
    alert('Nama paket dan harga harus diisi!');
    return;
  }
  
  const data = {
    name,
    duration,
    price,
    description,
    is_reguler: duration === 0
  };
  
  if (id) {
    db.update(DB_KEYS.PACKAGES, id, data);
  } else {
    db.add(DB_KEYS.PACKAGES, {
      id: utils.generateId(),
      ...data,
      created_at: new Date().toISOString()
    });
  }
  
  bootstrap.Modal.getInstance(document.getElementById('packageModal')).hide();
  renderPackagesTable();
}

function editPackage(id) {
  openPackageModal(id);
}

function deletePackage(id) {
  if (confirm('Yakin ingin menghapus paket ini?')) {
    db.delete(DB_KEYS.PACKAGES, id);
    renderPackagesTable();
  }
}

// ============================================
// PRODUCTS CRUD
// ============================================
function renderProductsTable() {
  const tbody = document.getElementById('adminProductsTable');
  const products = db.get(DB_KEYS.PRODUCTS);
  
  tbody.innerHTML = products.map(p => `
    <tr>
      <td class="fw-semibold">${p.name}</td>
      <td><span class="badge bg-light text-dark border">${p.category}</span></td>
      <td>
        <span class="${p.stock <= 10 ? 'text-danger fw-bold' : ''}">${p.stock}</span>
      </td>
      <td>${utils.formatRupiah(p.price)}</td>
      <td class="text-center">
        <button class="btn btn-sm btn-outline-primary me-1" onclick="editProduct('${p.id}')">
          <i class="bi bi-pencil"></i>
        </button>
        <button class="btn btn-sm btn-outline-danger" onclick="deleteProduct('${p.id}')">
          <i class="bi bi-trash"></i>
        </button>
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
  
  if (!name || price <= 0) {
    alert('Nama produk dan harga harus diisi!');
    return;
  }
  
  const data = { name, category, stock, price };
  
  if (id) {
    db.update(DB_KEYS.PRODUCTS, id, data);
  } else {
    db.add(DB_KEYS.PRODUCTS, {
      id: utils.generateId(),
      ...data,
      created_at: new Date().toISOString()
    });
  }
  
  bootstrap.Modal.getInstance(document.getElementById('productModal')).hide();
  renderProductsTable();
  renderAdminDashboard();
}

function editProduct(id) {
  openProductModal(id);
}

function deleteProduct(id) {
  if (confirm('Yakin ingin menghapus produk ini?')) {
    db.delete(DB_KEYS.PRODUCTS, id);
    renderProductsTable();
  }
}

// ============================================
// USERS CRUD
// ============================================
function renderUsersTable() {
  const tbody = document.getElementById('adminUsersTable');
  const users = db.get(DB_KEYS.USERS);
  const currentUser = Auth.getCurrentUser();
  
  tbody.innerHTML = users.map(u => `
    <tr>
      <td class="fw-semibold">${u.name}</td>
      <td>${u.username}</td>
      <td>
        <span class="badge ${u.role === 'admin' ? 'bg-danger' : 'bg-info'}">
          ${u.role === 'admin' ? 'Admin' : 'Kasir'}
        </span>
      </td>
      <td class="text-center">
        <button class="btn btn-sm btn-outline-primary me-1" onclick="editUser('${u.id}')" ${u.id === currentUser?.id ? 'disabled' : ''}>
          <i class="bi bi-pencil"></i>
        </button>
        <button class="btn btn-sm btn-outline-danger" onclick="deleteUser('${u.id}')" ${u.id === currentUser?.id ? 'disabled' : ''}>
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
    alert('Nama dan username harus diisi!');
    return;
  }
  
  // Check username uniqueness
  const users = db.get(DB_KEYS.USERS);
  const existing = users.find(u => u.username === username && u.id !== id);
  if (existing) {
    alert('Username sudah digunakan!');
    return;
  }
  
  const data = { name, username, role };
  if (password) {
    data.password = HashUtil.sha256Sync(password);
  }
  
  if (id) {
    const existingUser = db.getById(DB_KEYS.USERS, id);
    db.update(DB_KEYS.USERS, id, { ...existingUser, ...data });
  } else {
    if (!password) {
      alert('Password harus diisi untuk user baru!');
      return;
    }
    db.add(DB_KEYS.USERS, {
      id: utils.generateId(),
      ...data,
      password: HashUtil.sha256Sync(password),
      created_at: new Date().toISOString()
    });
  }
  
  bootstrap.Modal.getInstance(document.getElementById('userModal')).hide();
  renderUsersTable();
  renderAdminDashboard();
}

function editUser(id) {
  openUserModal(id);
}

function deleteUser(id) {
  const currentUser = Auth.getCurrentUser();
  if (id === currentUser?.id) {
    alert('Tidak bisa menghapus akun sendiri!');
    return;
  }
  
  if (confirm('Yakin ingin menghapus user ini?')) {
    db.delete(DB_KEYS.USERS, id);
    renderUsersTable();
    renderAdminDashboard();
  }
}

// ============================================
// REPORTS
// ============================================
function generateReport() {
  const dateStr = document.getElementById('reportDate').value;
  if (!dateStr) return;
  
  const startOfDay = utils.getStartOfDay(dateStr);
  const endOfDay = utils.getEndOfDay(dateStr);
  
  const transactions = db.get(DB_KEYS.TRANSACTIONS).filter(tx => {
    if (!tx.paid_at) return false;
    const paidDate = new Date(tx.paid_at);
    return paidDate >= startOfDay && paidDate <= endOfDay;
  });
  
  const tbody = document.getElementById('reportTransactionsTable');
  
  if (transactions.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="text-center text-muted py-4">
          Tidak ada transaksi pada tanggal ini
        </td>
      </tr>
    `;
    document.getElementById('reportTotal').textContent = 'Rp 0';
    renderCategoryChart([]);
    renderFnBReport([]);
    return;
  }
  
  let totalOmzet = 0;
  
  tbody.innerHTML = transactions.map(tx => {
    const console = db.getById(DB_KEYS.CONSOLES, tx.console_id);
    const pkg = db.getById(DB_KEYS.PACKAGES, tx.package_id);
    const items = getTransactionItems(tx.id);
    const fnbTotal = items.reduce((sum, item) => sum + (item.price * item.qty), 0);
    const duration = calculateDurationForReport(tx);
    const user = db.getById(DB_KEYS.USERS, tx.created_by);
    
    totalOmzet += tx.total_price || 0;
    
    return `
      <tr>
        <td><small>${utils.formatDate(tx.paid_at)}</small></td>
        <td>${console ? console.name : '-'}</td>
        <td>${pkg ? pkg.name : '-'}</td>
        <td>${duration}</td>
        <td>${utils.formatRupiah(fnbTotal)}</td>
        <td class="fw-bold text-success">${utils.formatRupiah(tx.total_price || 0)}</td>
        <td><small>${user ? user.name : '-'}</small></td>
      </tr>
    `;
  }).join('');
  
  document.getElementById('reportTotal').textContent = utils.formatRupiah(totalOmzet);
  
  renderCategoryChart(transactions);
  renderFnBReport(transactions);
}

function calculateDurationForReport(tx) {
  const start = new Date(tx.start_time);
  const end = new Date(tx.paid_at);
  const diff = Math.floor((end - start) / (1000 * 60));
  const h = Math.floor(diff / 60);
  const m = diff % 60;
  return `${h}j ${m}m`;
}

function getTransactionItems(transactionId) {
  const items = db.get(DB_KEYS.TRANSACTION_ITEMS);
  return items.filter(item => item.transaction_id === transactionId);
}

function renderCategoryChart(transactions) {
  const ctx = document.getElementById('categoryChart').getContext('2d');
  
  // Calculate PS vs F&B sales
  let psTotal = 0;
  let fnbTotal = 0;
  
  transactions.forEach(tx => {
    psTotal += tx.base_price || 0;
    const items = getTransactionItems(tx.id);
    const itemsTotal = items.reduce((sum, item) => sum + (item.price * item.qty), 0);
    fnbTotal += itemsTotal;
  });
  
  if (categoryChartInstance) categoryChartInstance.destroy();
  
  categoryChartInstance = new Chart(ctx, {
    type: 'pie',
    data: {
      labels: ['Penyewaan PS', 'F&B'],
      datasets: [{
        data: [psTotal, fnbTotal],
        backgroundColor: ['#198754', '#0dcaf0'],
        borderWidth: 0
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom' }
      }
    }
  });
}

function renderFnBReport(transactions) {
  const tbody = document.getElementById('reportFnBTable');
  
  // Aggregate F&B items
  const itemMap = {};
  transactions.forEach(tx => {
    const items = getTransactionItems(tx.id);
    items.forEach(item => {
      if (!itemMap[item.product_name]) {
        itemMap[item.product_name] = { qty: 0, total: 0 };
      }
      itemMap[item.product_name].qty += item.qty;
      itemMap[item.product_name].total += item.price * item.qty;
    });
  });
  
  const sortedItems = Object.entries(itemMap).sort((a, b) => b[1].total - a[1].total);
  
  if (sortedItems.length === 0) {
    tbody.innerHTML = '<tr><td colspan="3" class="text-center text-muted">Tidak ada penjualan F&B</td></tr>';
    return;
  }
  
  tbody.innerHTML = sortedItems.map(([name, data]) => `
    <tr>
      <td>${name}</td>
      <td>${data.qty}</td>
      <td class="fw-semibold">${utils.formatRupiah(data.total)}</td>
    </tr>
  `).join('');
}

