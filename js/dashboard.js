/**
 * GINOVA - Dashboard Operations
 * Timer, Billing, F&B, Payment, Alarm, Void
 * 
 * FITUR:
 * 1. Identitas Unit: Field "customer_name" pada setiap transaksi aktif
 * 2. Sinkronisasi F&B: Crosscheck & tampilan item F&B per unit + modal manage
 * 3. Logika Void: Status "void" pada item F&B yang dibatalkan, kembalikan stok
 * 4. Sistem Alarm: Notifikasi visual & suara pada 5 menit dan 1 menit sebelum habis
 * 5. Struk Detail: Tampilkan jumlah & nama item F&B di bill pembayaran
 */

/**
 * State untuk melacak alarm yang sudah dipicu per transaksi.
 * Key: transactionId, Value: { last5min: timestamp|null, last1min: timestamp|null }
 * @type {Map<string, Object>}
 */
let alarmState = new Map();

document.addEventListener('DOMContentLoaded', () => {
  renderConsoles();
  renderActiveTransactions();
  updateStats();
  loadPackagesToSelect();
  loadProductsToSelect();
  
  /**
   * Interval utama untuk update timer dan alarm setiap detik.
   */
  setInterval(() => {
    updateTimer();
  }, 1000);
  
  document.getElementById('btnStartBilling').addEventListener('click', startBilling);
  document.getElementById('btnAddFnB').addEventListener('click', addFnB);
  document.getElementById('btnCompletePayment').addEventListener('click', completePayment);
  document.getElementById('btnPrintReceipt').addEventListener('click', printReceipt);
  
  document.getElementById('billingPackage').addEventListener('change', function() {
    const pkgId = this.value;
    if (!pkgId) {
      document.getElementById('packageInfo').style.display = 'none';
      return;
    }
    const pkg = db.getById(DB_KEYS.PACKAGES, pkgId);
    if (pkg) {
      document.getElementById('packageDesc').textContent = 
        `${pkg.name} - ${pkg.is_reguler ? 'Reguler (per jam)' : pkg.description} - ${utils.formatRupiah(pkg.price)}`;
      document.getElementById('packageInfo').style.display = 'block';
    }
  });
  
  document.getElementById('fnbProduct').addEventListener('change', function() {
    const prodId = this.value;
    if (!prodId) {
      document.getElementById('fnbInfo').style.display = 'none';
      return;
    }
    const prod = db.getById(DB_KEYS.PRODUCTS, prodId);
    if (prod) {
      document.getElementById('fnbPrice').textContent = utils.formatRupiah(prod.price);
      document.getElementById('fnbStock').textContent = prod.stock;
      document.getElementById('fnbInfo').style.display = 'block';
    }
  });
  
  document.getElementById('paymentCash').addEventListener('input', function() {
    const total = parseInt(document.getElementById('paymentTotal').dataset.raw) || 0;
    const cash = parseInt(this.value) || 0;
    const change = cash - total;
    const changeBox = document.getElementById('paymentChangeBox');
    
    if (change >= 0) {
      document.getElementById('paymentChange').textContent = utils.formatRupiah(change);
      changeBox.classList.remove('alert-danger');
      changeBox.classList.add('alert-success');
      changeBox.style.display = 'block';
    } else {
      document.getElementById('paymentChange').textContent = 'Uang kurang!';
      changeBox.classList.remove('alert-success');
      changeBox.classList.add('alert-danger');
      changeBox.style.display = 'block';
    }
  });
});

// ============================================
// TIMER & ALARM ENTRY POINT
// ============================================

/**
 * Entry point utama untuk update timer dan alarm.
 * Dipanggil setiap detik oleh interval di DOMContentLoaded.
 * Menggabungkan update visual timer dan pemeriksaan alarm.
 */
function updateTimer() {
  updateAllTimers();
  checkAlarms();
}

// ============================================
// ALARM SYSTEM
// ============================================

/**
 * Memeriksa dan memicu alarm untuk transaksi aktif.
 * Alarm 5 menit berulang setiap 30 detik selama sisa waktu <= 5 menit.
 * Alarm 1 menit berulang setiap 10 detik selama sisa waktu <= 1 menit.
 * State alarm disimpan per transaksi dengan timestamp terakhir trigger.
 */
function checkAlarms() {
  const transactions = getActiveTransactions();
  const now = Date.now();
  
  transactions.forEach(tx => {
    if (!tx.end_time) return;
    const end = new Date(tx.end_time);
    const remainingSeconds = Math.floor((end - new Date()) / 1000);
    
    // Ambil atau inisialisasi state alarm untuk transaksi ini
    let state = alarmState.get(tx.id);
    if (!state) {
      state = { last5min: null, last1min: null };
      alarmState.set(tx.id, state);
    }
    
    // Reset state jika waktu sudah habis atau transaksi selesai
    if (remainingSeconds <= 0) {
      alarmState.delete(tx.id);
      return;
    }
    
    // Alarm 5 menit: berulang setiap 30 detik selama 0 < remaining <= 300
    if (remainingSeconds <= 300 && remainingSeconds > 0) {
      const sinceLast5min = state.last5min ? now - state.last5min : Infinity;
      if (sinceLast5min >= 30000) { // 30 detik interval
        triggerAlarm(tx, 5, 'menit');
        state.last5min = now;
      }
    }
    
    // Alarm 1 menit: berulang setiap 10 detik selama 0 < remaining <= 60
    if (remainingSeconds <= 60 && remainingSeconds > 0) {
      const sinceLast1min = state.last1min ? now - state.last1min : Infinity;
      if (sinceLast1min >= 10000) { // 10 detik interval
        triggerAlarm(tx, 1, 'menit');
        state.last1min = now;
      }
    }
  });
}

function triggerAlarm(tx, minutes, unit) {
  const console = db.getById(DB_KEYS.CONSOLES, tx.console_id);
  const consoleName = console ? console.name : 'Unit';
  const customerName = tx.customer_name || 'Pelanggan';
  
  const alarmContainer = document.getElementById('alarmContainer');
  const alarmMessage = document.getElementById('alarmMessage');
  
  alarmMessage.innerHTML = `<strong>${consoleName}</strong> - ${customerName}<br>Sisa waktu: <strong>${minutes} ${unit}</strong>`;
  alarmContainer.classList.remove('d-none');
  
  const consoleCard = document.getElementById(`console-${tx.console_id}`);
  if (consoleCard) consoleCard.classList.add('alarm');
  
  const timerEl = document.getElementById(`timer-${tx.id}`);
  if (timerEl) timerEl.classList.add('alarm');
  
  playAlarmSound();
  console.log(`[ALARM] ${consoleName} - Sisa ${minutes} ${unit}`);
}

function playAlarmSound() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    for (let i = 0; i < 3; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.value = 800;
      const startTime = ctx.currentTime + (i * 0.3);
      const endTime = startTime + 0.15;
      osc.start(startTime);
      osc.stop(endTime);
      gain.gain.setValueAtTime(0.3, startTime);
      gain.gain.exponentialRampToValueAtTime(0.01, endTime);
    }
    setTimeout(() => ctx.close(), 1500);
  } catch (e) {
    console.warn('Gagal memainkan suara alarm:', e);
  }
}

function acknowledgeAlarm() {
  document.getElementById('alarmContainer').classList.add('d-none');
  document.querySelectorAll('.console-card.alarm').forEach(card => card.classList.remove('alarm'));
  document.querySelectorAll('.timer-display.alarm').forEach(el => el.classList.remove('alarm'));
}

// ============================================
// RENDER CONSOLES GRID
// ============================================
function renderConsoles() {
  const grid = document.getElementById('consolesGrid');
  const consoles = db.get(DB_KEYS.CONSOLES);
  
  grid.innerHTML = consoles.map(console => {
    const isBusy = console.status === 'busy';
    const activeTransaction = getActiveTransactionByConsole(console.id);
    
    let fnbHtml = '';
    if (isBusy && activeTransaction) {
      const items = getTransactionItems(activeTransaction.id);
      const activeItems = items.filter(item => item.status !== 'void');
      if (activeItems.length > 0) {
        fnbHtml = `<div class="fnb-mini-list mt-2">
          ${activeItems.slice(0, 3).map(item => `<span class="fnb-item">${item.qty}x ${item.product_name}</span>`).join('')}
          ${activeItems.length > 3 ? `<span class="fnb-item">+${activeItems.length - 3} lainnya</span>` : ''}
        </div>`;
      }
    }
    
    let customerBadge = '';
    if (isBusy && activeTransaction && activeTransaction.customer_name) {
      customerBadge = `<div class="customer-name-badge mt-1"><i class="bi bi-person-fill me-1"></i>${activeTransaction.customer_name}</div>`;
    }
    
    return `<div class="col-lg-2 col-md-3 col-sm-4 col-6">
      <div class="console-card ${console.status} p-3 h-100" id="console-${console.id}">
        <span class="status-badge ${console.status}">
          ${isBusy ? '<i class="bi bi-circle-fill me-1 small"></i>Terpakai' : '<i class="bi bi-circle-fill me-1 small"></i>Tersedia'}
        </span>
        <div class="mt-2">
          <div class="d-flex align-items-center mb-2">
            <i class="bi bi-controller fs-3 ${isBusy ? 'text-warning' : 'text-success'} me-2"></i>
            <div>
              <h6 class="mb-0 fw-bold">${console.name}</h6>
              <small class="text-muted">${console.type}</small>
            </div>
          ${customerBadge}
          ${isBusy && activeTransaction ? `
            <div class="timer-display mb-2" id="timer-${activeTransaction.id}">${formatTimer(activeTransaction)}</div>
            ${fnbHtml}
            <div class="d-grid gap-1 mt-2">
              <button class="btn btn-sm btn-outline-success" onclick="openAddFnBModal('${activeTransaction.id}')"><i class="bi bi-plus-lg me-1"></i>F&B</button>
              <button class="btn btn-sm btn-outline-danger" onclick="openPaymentModal('${activeTransaction.id}')"><i class="bi bi-stop-circle me-1"></i>Selesai</button>
            </div>
          ` : `<button class="btn btn-sm btn-gn-primary w-100 mt-2" onclick="openStartBillingModal('${console.id}')"><i class="bi bi-play-fill me-1"></i>Mulai</button>`}
        </div>`;
  }).join('');
}

// ============================================
// RENDER ACTIVE TRANSACTIONS TABLE
// ============================================
function renderActiveTransactions() {
  const tbody = document.getElementById('activeTransactionsTable');
  const transactions = getActiveTransactions();
  
  if (transactions.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted py-4"><i class="bi bi-inbox fs-1 d-block mb-2"></i>Tidak ada transaksi aktif</td></tr>`;
    return;
  }
  
  tbody.innerHTML = transactions.map(tx => {
    const console = db.getById(DB_KEYS.CONSOLES, tx.console_id);
    const pkg = db.getById(DB_KEYS.PACKAGES, tx.package_id);
    const items = getTransactionItems(tx.id);
    const activeItems = items.filter(item => item.status !== 'void');
    const fnbTotal = activeItems.reduce((sum, item) => sum + (item.price * item.qty), 0);
    const currentTotal = calculateCurrentTotal(tx);
    
    let fnbDetailHtml = '';
    if (activeItems.length > 0) {
      fnbDetailHtml = activeItems.map(item => `<div class="small text-muted">${item.qty}x ${item.product_name}</div>`).join('');
    }
    
    return `<tr>
      <td>
        <span class="fw-semibold">${console ? console.name : '-'}</span><br>
        <small class="text-muted">${console ? console.type : '-'}</small>
        ${tx.customer_name ? `<br><span class="badge bg-light text-dark border mt-1"><i class="bi bi-person-fill me-1"></i>${tx.customer_name}</span>` : ''}
      </td>
      <td><span class="badge bg-light text-dark border">${pkg ? pkg.name : '-'}</span></td>
      <td><small>${utils.formatTime(tx.start_time)}</small></td>
      <td><span class="timer-display" id="table-timer-${tx.id}">${formatTimer(tx)}</span></td>
      <td>
        ${activeItems.length > 0 ? `<span class="badge bg-info">${activeItems.length} item</span><div class="mt-1">${fnbDetailHtml}</div><br><small class="text-muted">${utils.formatRupiah(fnbTotal)}</small>` : '<span class="text-muted">-</span>'}
      </td>
      <td><span class="fw-bold text-success">${utils.formatRupiah(currentTotal)}</span></td>
      <td class="text-center">
        <button class="btn btn-sm btn-outline-success mb-1" onclick="openAddFnBModal('${tx.id}')"><i class="bi bi-plus-lg"></i> F&B</button>
        <button class="btn btn-sm btn-outline-warning mb-1" onclick="openManageFnBModal('${tx.id}')"><i class="bi bi-list-ul"></i> Kelola</button>
        <button class="btn btn-sm btn-outline-danger" onclick="openPaymentModal('${tx.id}')"><i class="bi bi-stop-circle"></i> Selesai</button>
      </td>
    </tr>`;
  }).join('');
}

// ============================================
// TIMER LOGIC
// ============================================
function formatTimer(transaction) {
  const start = new Date(transaction.start_time);
  const now = new Date();
  
  if (transaction.end_time) {
    const end = new Date(transaction.end_time);
    const remaining = Math.floor((end - now) / 1000);
    if (remaining <= 0) return '00:00:00';
    return formatSeconds(remaining);
  }
  
  const elapsed = Math.floor((now - start) / 1000);
  return formatSeconds(elapsed);
}

function formatSeconds(totalSeconds) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function updateAllTimers() {
  const transactions = getActiveTransactions();
  transactions.forEach(tx => {
    const timerEl = document.getElementById(`timer-${tx.id}`);
    const tableTimerEl = document.getElementById(`table-timer-${tx.id}`);
    const timeStr = formatTimer(tx);
    if (timerEl) timerEl.textContent = timeStr;
    if (tableTimerEl) tableTimerEl.textContent = timeStr;
  });
}

// ============================================
// BILLING OPERATIONS
// ============================================
function openStartBillingModal(consoleId) {
  const console = db.getById(DB_KEYS.CONSOLES, consoleId);
  if (!console) return;
  
  loadPackagesToSelect();
  
  document.getElementById('billingConsoleId').value = consoleId;
  document.getElementById('billingConsoleName').value = `${console.name} (${console.type})`;
  document.getElementById('billingCustomerName').value = '';
  document.getElementById('billingPackage').value = '';
  document.getElementById('packageInfo').style.display = 'none';
  
  const modal = new bootstrap.Modal(document.getElementById('startBillingModal'));
  modal.show();
}

function loadPackagesToSelect() {
  const select = document.getElementById('billingPackage');
  const packages = db.get(DB_KEYS.PACKAGES);
  select.innerHTML = '<option value="">-- Pilih Paket --</option>' +
    packages.map(pkg => `<option value="${pkg.id}">${pkg.name} - ${utils.formatRupiah(pkg.price)}</option>`).join('');
}

function startBilling() {
  const consoleId = document.getElementById('billingConsoleId').value;
  const packageId = document.getElementById('billingPackage').value;
  const customerName = document.getElementById('billingCustomerName').value.trim();
  
  if (!packageId) {
    alert('Silakan pilih paket terlebih dahulu!');
    return;
  }
  
  if (!customerName) {
    alert('Silakan masukkan nama pelanggan!');
    document.getElementById('billingCustomerName').focus();
    return;
  }
  
  const pkg = db.getById(DB_KEYS.PACKAGES, packageId);
  
  db.update(DB_KEYS.CONSOLES, consoleId, { status: 'busy' });
  
  const startTime = new Date();
  let endTime = null;
  if (pkg.duration > 0) {
    endTime = new Date(startTime.getTime() + pkg.duration * 60000).toISOString();
  }
  
  const transaction = {
    id: utils.generateId(),
    console_id: consoleId,
    package_id: packageId,
    customer_name: customerName,
    start_time: startTime.toISOString(),
    end_time: endTime,
    base_price: pkg.price,
    total_price: 0,
    status: 'unpaid',
    paid_at: null,
    created_by: Auth.getCurrentUser()?.id,
    created_at: startTime.toISOString()
  };
  
  db.add(DB_KEYS.TRANSACTIONS, transaction);
  bootstrap.Modal.getInstance(document.getElementById('startBillingModal')).hide();
  renderConsoles();
  renderActiveTransactions();
  updateStats();
}

// ============================================
// F&B OPERATIONS
// ============================================
function openAddFnBModal(transactionId) {
  document.getElementById('fnbTransactionId').value = transactionId;
  document.getElementById('fnbProduct').value = '';
  document.getElementById('fnbQty').value = 1;
  document.getElementById('fnbInfo').style.display = 'none';
  loadProductsToSelect();
  const modal = new bootstrap.Modal(document.getElementById('addFnBModal'));
  modal.show();
}

function loadProductsToSelect() {
  const select = document.getElementById('fnbProduct');
  const products = db.get(DB_KEYS.PRODUCTS);
  select.innerHTML = '<option value="">-- Pilih Produk --</option>' +
    products.map(prod => `<option value="${prod.id}">${prod.name} (${prod.stock} stok)</option>`).join('');
}

function addFnB() {
  const transactionId = document.getElementById('fnbTransactionId').value;
  const productId = document.getElementById('fnbProduct').value;
  const qty = parseInt(document.getElementById('fnbQty').value) || 1;
  
  if (!productId) {
    alert('Silakan pilih produk!');
    return;
  }
  
  const product = db.getById(DB_KEYS.PRODUCTS, productId);
  if (!product) return;
  
  if (product.stock < qty) {
    alert(`Stok tidak cukup! Tersedia: ${product.stock}`);
    return;
  }
  
  const item = {
    id: utils.generateId(),
    transaction_id: transactionId,
    product_id: productId,
    product_name: product.name,
    price: product.price,
    qty: qty,
    status: 'active',
    created_at: new Date().toISOString()
  };
  
  db.add(DB_KEYS.TRANSACTION_ITEMS, item);
  db.update(DB_KEYS.PRODUCTS, productId, { stock: product.stock - qty });
  bootstrap.Modal.getInstance(document.getElementById('addFnBModal')).hide();
  renderConsoles();
  renderActiveTransactions();
  updateStats();
}

// ============================================
// MANAGE F&B / VOID
// ============================================
function openManageFnBModal(transactionId) {
  document.getElementById('manageFnBTransactionId').value = transactionId;
  const items = getTransactionItems(transactionId);
  const listContainer = document.getElementById('manageFnBList');
  
  if (items.length === 0) {
    listContainer.innerHTML = '<p class="text-muted text-center py-3">Tidak ada item F&B</p>';
  } else {
    listContainer.innerHTML = items.map(item => {
      const isVoid = item.status === 'void';
      return `<div class="fnb-manage-item ${isVoid ? 'voided' : ''}">
        <div>
          <div class="fw-semibold ${isVoid ? 'text-decoration-line-through text-muted' : ''}">
            ${item.product_name}${isVoid ? '<span class="badge-void">VOID</span>' : ''}
          </div>
          <small class="text-muted">${item.qty} x ${utils.formatRupiah(item.price)} = ${utils.formatRupiah(item.qty * item.price)}</small>
          ${isVoid ? `<br><small class="text-danger">Dibatalkan: ${utils.formatDate(item.voided_at)}</small>` : ''}
        </div>
        ${!isVoid ? `<button class="btn btn-sm btn-outline-danger" onclick="voidFnBItem('${item.id}')"><i class="bi bi-x-lg"></i> Batal</button>` : '<span class="badge bg-secondary">Dibatalkan</span>'}
      </div>`;
    }).join('');
  }
  
  const modal = new bootstrap.Modal(document.getElementById('manageFnBModal'));
  modal.show();
}

function voidFnBItem(itemId) {
  if (!confirm('Yakin ingin membatalkan item ini? Stok akan dikembalikan.')) return;
  
  const items = db.get(DB_KEYS.TRANSACTION_ITEMS);
  const itemIndex = items.findIndex(i => i.id === itemId);
  if (itemIndex === -1) {
    alert('Item tidak ditemukan!');
    return;
  }
  
  const item = items[itemIndex];
  if (item.status === 'void') {
    alert('Item sudah dibatalkan sebelumnya!');
    return;
  }
  
  const product = db.getById(DB_KEYS.PRODUCTS, item.product_id);
  if (product) {
    db.update(DB_KEYS.PRODUCTS, item.product_id, { stock: product.stock + item.qty });
  }
  
  items[itemIndex] = {
    ...item,
    status: 'void',
    voided_at: new Date().toISOString(),
    voided_by: Auth.getCurrentUser()?.id || 'unknown'
  };
  
  db.set(DB_KEYS.TRANSACTION_ITEMS, items);
  
  const txId = document.getElementById('manageFnBTransactionId').value;
  openManageFnBModal(txId);
  renderConsoles();
  renderActiveTransactions();
  updateStats();
  
  console.log(`[VOID] Item ${item.product_name} dibatalkan oleh ${Auth.getCurrentUser()?.name || 'unknown'}`);
}

// ============================================
// PAYMENT OPERATIONS
// ============================================
let currentPaymentTransactionId = null;
let currentPaymentMethod = 'cash';
let currentPaymentTotal = 0;

function selectPaymentMethod(method) {
  currentPaymentMethod = method;
  const btnPayCash = document.getElementById('btnPayCash');
  const btnPayQRIS = document.getElementById('btnPayQRIS');
  const cashForm = document.getElementById('cashPaymentForm');
  const qrisForm = document.getElementById('qrisPaymentForm');
  
  if (method === 'cash') {
    btnPayCash.classList.add('active', 'btn-success');
    btnPayCash.classList.remove('btn-outline-success');
    btnPayQRIS.classList.remove('active', 'btn-primary');
    btnPayQRIS.classList.add('btn-outline-primary');
    cashForm.style.display = 'block';
    qrisForm.style.display = 'none';
  } else {
    btnPayQRIS.classList.add('active', 'btn-primary');
    btnPayQRIS.classList.remove('btn-outline-primary');
    btnPayCash.classList.remove('active', 'btn-success');
    btnPayCash.classList.add('btn-outline-success');
    cashForm.style.display = 'none';
    qrisForm.style.display = 'block';
    const qrisTotalEl = document.getElementById('qrisPaymentTotal');
    if (qrisTotalEl) qrisTotalEl.value = utils.formatRupiah(currentPaymentTotal);
  }
}

function displayQRCode() {
  try {
    const paymentModal = bootstrap.Modal.getOrCreateInstance(document.getElementById('paymentModal'));
    paymentModal.hide();
    
    const qrisAmountEl = document.getElementById('qrisAmount');
    if (qrisAmountEl) qrisAmountEl.textContent = utils.formatRupiah(currentPaymentTotal);
    
    const statusEl = document.getElementById('qrisPaymentStatus');
    if (statusEl) {
      statusEl.innerHTML = `<div class="spinner-border text-primary me-2" role="status"><span class="visually-hidden">Loading...</span></div><span class="text-muted">Menunggu pembayaran...</span>`;
    }
    
    const qrisModal = bootstrap.Modal.getOrCreateInstance(document.getElementById('qrisModal'));
    qrisModal.show();
  } catch (error) {
    console.error('Error displaying QRIS:', error);
    alert('Terjadi kesalahan saat menampilkan QRIS.');
  }
}

function closeQRISModal() {
  const qrisModal = bootstrap.Modal.getOrCreateInstance(document.getElementById('qrisModal'));
  qrisModal.hide();
  setTimeout(() => {
    const paymentModal = bootstrap.Modal.getOrCreateInstance(document.getElementById('paymentModal'));
    paymentModal.show();
  }, 300);
}

function simulateQRISSuccess() {
  try {
    const statusEl = document.getElementById('qrisPaymentStatus');
    if (statusEl) {
      statusEl.innerHTML = `<div class="alert alert-success"><i class="bi bi-check-circle-fill me-2"></i><strong>Pembayaran berhasil!</strong></div>`;
    }
    setTimeout(() => processQrisPayment(), 1500);
  } catch (error) {
    console.error('Error simulating QRIS success:', error);
  }
}

function processQrisPayment() {
  if (!currentPaymentTransactionId) {
    alert('Tidak ada transaksi yang dipilih!');
    return;
  }
  
  try {
    const tx = db.getById(DB_KEYS.TRANSACTIONS, currentPaymentTransactionId);
    if (!tx) {
      alert('Transaksi tidak ditemukan!');
      return;
    }
    
    const total = calculateCurrentTotal(tx);
    
    db.update(DB_KEYS.TRANSACTIONS, currentPaymentTransactionId, {
      total_price: total,
      status: 'paid',
      paid_at: new Date().toISOString(),
      payment_method: 'qris',
      cash: total,
      change: 0
    });
    
    db.update(DB_KEYS.CONSOLES, tx.console_id, { status: 'available' });
    
    const qrisModal = bootstrap.Modal.getOrCreateInstance(document.getElementById('qrisModal'));
    qrisModal.hide();
    
    currentPaymentTransactionId = null;
    renderConsoles();
    renderActiveTransactions();
    updateStats();
    
    setTimeout(() => {
      showSuccessNotification();
      simulateAutoTransfer(total);
    }, 300);
  } catch (error) {
    console.error('Error processing QRIS payment:', error);
    alert('Terjadi kesalahan saat memproses pembayaran QRIS.');
  }
}

function showSuccessNotification() {
  const successModal = bootstrap.Modal.getOrCreateInstance(document.getElementById('successModal'));
  successModal.show();
}

function closeSuccessModal() {
  const successModal = bootstrap.Modal.getOrCreateInstance(document.getElementById('successModal'));
  successModal.hide();
}

function simulateAutoTransfer(amount) {
  console.log('=== AUTO-TRANSFER SIMULATION ===');
  console.log('Waktu:', new Date().toISOString());
  console.log('Jumlah:', utils.formatRupiah(amount));
  console.log('================================');
}

function openPaymentModal(transactionId) {
  try {
    currentPaymentTransactionId = transactionId;
    const tx = db.getById(DB_KEYS.TRANSACTIONS, transactionId);
    if (!tx) {
      console.error('Transaction not found:', transactionId);
      return;
    }
    
    const console = db.getById(DB_KEYS.CONSOLES, tx.console_id);
    const pkg = db.getById(DB_KEYS.PACKAGES, tx.package_id);
    
    // Ambil SEMUA item (termasuk void) untuk audit
    const allItems = getTransactionItems(transactionId);
    const activeItems = allItems.filter(item => item.status !== 'void');
    const voidItems = allItems.filter(item => item.status === 'void');
    
    const total = calculateCurrentTotal(tx);
    currentPaymentTotal = total;
    
    const fnbTotal = activeItems.reduce((sum, item) => sum + (item.price * item.qty), 0);
    
    // Fill receipt preview
    if (document.getElementById('receiptDate')) document.getElementById('receiptDate').textContent = utils.formatDate(new Date());
    if (document.getElementById('receiptConsole')) document.getElementById('receiptConsole').textContent = console ? console.name : '-';
    if (document.getElementById('receiptPackage')) document.getElementById('receiptPackage').textContent = pkg ? pkg.name : '-';
    if (document.getElementById('receiptStart')) document.getElementById('receiptStart').textContent = utils.formatDate(tx.start_time);
    if (document.getElementById('receiptDuration')) document.getElementById('receiptDuration').textContent = calculateDuration(tx);
    if (document.getElementById('receiptBasePrice')) document.getElementById('receiptBasePrice').textContent = utils.formatRupiah(tx.base_price);
    
    // Tampilkan F&B total dengan badge jumlah item
    const receiptFnBEl = document.getElementById('receiptFnB');
    if (receiptFnBEl) {
      if (activeItems.length > 0) {
        receiptFnBEl.innerHTML = `${utils.formatRupiah(fnbTotal)}<span class="badge bg-info ms-1">${activeItems.length} item</span>`;
      } else {
        receiptFnBEl.textContent = utils.formatRupiah(fnbTotal);
      }
    }
    
    // FITUR #5: Tampilkan detail item F&B di struk pembayaran
    const receiptItemsEl = document.getElementById('receiptItems');
    if (receiptItemsEl) {
      let itemsHtml = '';
      
      // Item aktif dengan nama dan jumlah
      if (activeItems.length > 0) {
        itemsHtml += `<div class="mt-2 mb-2"><small class="fw-semibold text-muted">Detail F&B:</small></div>`;
        activeItems.forEach(item => {
          itemsHtml += `<div class="receipt-line" style="font-size:0.85rem;">
            <span>&nbsp;&nbsp;${item.qty}x ${item.product_name}</span>
            <span>${utils.formatRupiah(item.price * item.qty)}</span>
          </div>`;
        });
      }
      
      // Item yang di-void (untuk audit trail)
      if (voidItems.length > 0) {
        itemsHtml += `<div class="mt-2 mb-1"><small class="fw-semibold text-danger">Dibatalkan:</small></div>`;
        voidItems.forEach(item => {
          itemsHtml += `<div class="receipt-line receipt-item-void">
            <span>&nbsp;&nbsp;${item.qty}x ${item.product_name}</span>
            <span>${utils.formatRupiah(item.price * item.qty)}</span>
          </div>`;
        });
      }
      
      receiptItemsEl.innerHTML = itemsHtml;
    }
    
    if (document.getElementById('receiptTotal')) document.getElementById('receiptTotal').textContent = utils.formatRupiah(total);
    
    // Fill payment form
    const paymentTotalEl = document.getElementById('paymentTotal');
    if (paymentTotalEl) {
      paymentTotalEl.value = utils.formatRupiah(total);
      paymentTotalEl.dataset.raw = total;
    }
    
    const qrisPaymentTotalEl = document.getElementById('qrisPaymentTotal');
    if (qrisPaymentTotalEl) qrisPaymentTotalEl.value = utils.formatRupiah(total);
    
    const paymentCashEl = document.getElementById('paymentCash');
    if (paymentCashEl) paymentCashEl.value = '';
    
    const paymentChangeBoxEl = document.getElementById('paymentChangeBox');
    if (paymentChangeBoxEl) paymentChangeBoxEl.style.display = 'none';
    
    // Reset ke metode cash sebagai default
    selectPaymentMethod('cash');
    
    const modal = bootstrap.Modal.getOrCreateInstance(document.getElementById('paymentModal'));
    modal.show();
  } catch (error) {
    console.error('Error opening payment modal:', error);
    alert('Terjadi kesalahan saat membuka modal pembayaran. Silakan coba lagi.');
  }
}

function completePayment() {
  if (!currentPaymentTransactionId) {
    alert('Tidak ada transaksi yang dipilih!');
    return;
  }
  
  try {
    const tx = db.getById(DB_KEYS.TRANSACTIONS, currentPaymentTransactionId);
    if (!tx) {
      alert('Transaksi tidak ditemukan!');
      return;
    }
    
    const total = calculateCurrentTotal(tx);
    
    if (currentPaymentMethod === 'cash') {
      const cash = parseInt(document.getElementById('paymentCash').value) || 0;
      
      if (cash < total) {
        alert('Uang tunai tidak cukup! Total: ' + utils.formatRupiah(total));
        return;
      }
      
      db.update(DB_KEYS.TRANSACTIONS, currentPaymentTransactionId, {
        total_price: total,
        status: 'paid',
        paid_at: new Date().toISOString(),
        payment_method: 'cash',
        cash: cash,
        change: cash - total
      });
    } else {
      alert('Silakan gunakan tombol "Tampilkan QRIS" untuk pembayaran QRIS.');
      return;
    }
    
    db.update(DB_KEYS.CONSOLES, tx.console_id, { status: 'available' });
    
    const modal = bootstrap.Modal.getOrCreateInstance(document.getElementById('paymentModal'));
    modal.hide();
    
    currentPaymentTransactionId = null;
    renderConsoles();
    renderActiveTransactions();
    updateStats();
    
    setTimeout(() => {
      if (confirm('Cetak nota?')) {
        printReceipt();
      }
    }, 300);
  } catch (error) {
    console.error('Error completing payment:', error);
    alert('Terjadi kesalahan saat menyelesaikan pembayaran. Silakan coba lagi.');
  }
}

function printReceipt() {
  window.print();
}

// ============================================
// HELPER FUNCTIONS
// ============================================
function getActiveTransactions() {
  const transactions = db.get(DB_KEYS.TRANSACTIONS);
  return transactions.filter(tx => tx.status === 'unpaid');
}

function getActiveTransactionByConsole(consoleId) {
  const transactions = db.get(DB_KEYS.TRANSACTIONS);
  return transactions.find(tx => tx.console_id === consoleId && tx.status === 'unpaid');
}

function getTransactionItems(transactionId) {
  const items = db.get(DB_KEYS.TRANSACTION_ITEMS);
  return items.filter(item => item.transaction_id === transactionId);
}

function calculateCurrentTotal(transaction) {
  const pkg = db.getById(DB_KEYS.PACKAGES, transaction.package_id);
  const items = getTransactionItems(transaction.id);
  const activeItems = items.filter(item => item.status !== 'void');
  const fnbTotal = activeItems.reduce((sum, item) => sum + (item.price * item.qty), 0);
  
  let baseTotal = transaction.base_price;
  
  if (pkg && pkg.is_reguler) {
    const start = new Date(transaction.start_time);
    const now = new Date();
    const elapsedHours = Math.ceil((now - start) / (1000 * 60 * 60));
    baseTotal = elapsedHours * pkg.price;
  }
  
  return baseTotal + fnbTotal;
}

/**
 * Menghitung durasi bermain dari transaksi dalam format string yang human-readable.
 * Untuk paket berdurasi: hitung dari start_time sampai sekarang (atau end_time jika sudah lewat).
 * Untuk reguler: hitung dari start_time sampai sekarang (atau paid_at jika sudah dibayar).
 * @param {Object} transaction - Objek transaksi
 * @returns {string} Durasi dalam format "X jam Y menit" atau "Y menit"
 */
function calculateDuration(transaction) {
  const start = new Date(transaction.start_time);
  const now = new Date();
  
  // Gunakan waktu selesai aktual jika sudah dibayar, atau end_time jika paket habis
  let end = now;
  if (transaction.paid_at) {
    end = new Date(transaction.paid_at);
  } else if (transaction.end_time && new Date(transaction.end_time) < now) {
    end = new Date(transaction.end_time);
  }
  
  const diffMs = end - start;
  if (diffMs < 0) return '0 menit';
  
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const h = Math.floor(diffMinutes / 60);
  const m = diffMinutes % 60;
  
  if (h > 0 && m > 0) return `${h} jam ${m} menit`;
  if (h > 0) return `${h} jam`;
  return `${m} menit`;
}
