/**
 * GINOVA - Dashboard Operations
 * Timer, Billing, F&B, Payment
 */

let timerIntervals = {};

// ============================================
// INIT
// ============================================
document.addEventListener('DOMContentLoaded', () => {
  renderConsoles();
  renderActiveTransactions();
  updateStats();
  loadPackagesToSelect();
  loadProductsToSelect();
  
  // Start global timer
  setInterval(() => {
    updateAllTimers();
  }, 1000);
  
  // Event listeners
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
// RENDER CONSOLES GRID
// ============================================
function renderConsoles() {
  const grid = document.getElementById('consolesGrid');
  const consoles = db.get(DB_KEYS.CONSOLES);
  
  grid.innerHTML = consoles.map(console => {
    const isBusy = console.status === 'busy';
    const activeTransaction = getActiveTransactionByConsole(console.id);
    
    return `
      <div class="col-lg-2 col-md-3 col-sm-4 col-6">
        <div class="console-card ${console.status} p-3 h-100" id="console-${console.id}">
          <span class="status-badge ${console.status}">
            ${isBusy ? '<i class="bi bi-circle-fill me-1 small"></i>Terpakai' : '<i class="bi bi-circle-fill me-1 small"></i>Tersedia'}
          </span>
          <div class="mt-3">
            <div class="d-flex align-items-center mb-2">
              <i class="bi bi-controller fs-3 ${isBusy ? 'text-warning' : 'text-success'} me-2"></i>
              <div>
                <h6 class="mb-0 fw-bold">${console.name}</h6>
                <small class="text-muted">${console.type}</small>
              </div>
            </div>
            
            ${isBusy && activeTransaction ? `
              <div class="timer-display mb-2" id="timer-${activeTransaction.id}">
                ${formatTimer(activeTransaction)}
              </div>
              <button class="btn btn-sm btn-outline-danger w-100" onclick="openPaymentModal('${activeTransaction.id}')">
                <i class="bi bi-stop-circle me-1"></i>Selesai
              </button>
            ` : `
              <button class="btn btn-sm btn-gn-primary w-100" onclick="openStartBillingModal('${console.id}')">
                <i class="bi bi-play-fill me-1"></i>Mulai
              </button>
            `}
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// ============================================
// RENDER ACTIVE TRANSACTIONS TABLE
// ============================================
function renderActiveTransactions() {
  const tbody = document.getElementById('activeTransactionsTable');
  const transactions = getActiveTransactions();
  
  if (transactions.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="text-center text-muted py-4">
          <i class="bi bi-inbox fs-1 d-block mb-2"></i>
          Tidak ada transaksi aktif
        </td>
      </tr>
    `;
    return;
  }
  
  tbody.innerHTML = transactions.map(tx => {
    const console = db.getById(DB_KEYS.CONSOLES, tx.console_id);
    const pkg = db.getById(DB_KEYS.PACKAGES, tx.package_id);
    const items = getTransactionItems(tx.id);
    const fnbTotal = items.reduce((sum, item) => sum + (item.price * item.qty), 0);
    const currentTotal = calculateCurrentTotal(tx);
    
    return `
      <tr>
        <td>
          <span class="fw-semibold">${console ? console.name : '-'}</span>
          <br><small class="text-muted">${console ? console.type : '-'}</small>
        </td>
        <td>
          <span class="badge bg-light text-dark border">${pkg ? pkg.name : '-'}</span>
        </td>
        <td>
          <small>${utils.formatTime(tx.start_time)}</small>
        </td>
        <td>
          <span class="timer-display" id="table-timer-${tx.id}">${formatTimer(tx)}</span>
        </td>
        <td>
          ${items.length > 0 ? `
            <span class="badge bg-info">${items.length} item</span>
            <br><small class="text-muted">${utils.formatRupiah(fnbTotal)}</small>
          ` : '<span class="text-muted">-</span>'}
        </td>
        <td>
          <span class="fw-bold text-success">${utils.formatRupiah(currentTotal)}</span>
        </td>
        <td class="text-center">
          <button class="btn btn-sm btn-outline-success mb-1" onclick="openAddFnBModal('${tx.id}')">
            <i class="bi bi-plus-lg"></i> F&B
          </button>
          <button class="btn btn-sm btn-outline-danger" onclick="openPaymentModal('${tx.id}')">
            <i class="bi bi-stop-circle"></i> Selesai
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

// ============================================
// TIMER LOGIC
// ============================================
function formatTimer(transaction) {
  const start = new Date(transaction.start_time);
  const now = new Date();
  const elapsed = Math.floor((now - start) / 1000); // seconds
  
  if (transaction.end_time) {
    const end = new Date(transaction.end_time);
    const remaining = Math.floor((end - now) / 1000);
    if (remaining <= 0) return '00:00:00';
    return formatSeconds(remaining);
  }
  
  // Reguler / open timer - count up
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
  
  // Reload packages to ensure dropdown is populated
  loadPackagesToSelect();
  
  document.getElementById('billingConsoleId').value = consoleId;
  document.getElementById('billingConsoleName').value = `${console.name} (${console.type})`;
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
  
  if (!packageId) {
    alert('Silakan pilih paket terlebih dahulu!');
    return;
  }
  
  const pkg = db.getById(DB_KEYS.PACKAGES, packageId);
  const console = db.getById(DB_KEYS.CONSOLES, consoleId);
  
  // Update console status
  db.update(DB_KEYS.CONSOLES, consoleId, { status: 'busy' });
  
  // Create transaction
  const startTime = new Date();
  let endTime = null;
  
  if (pkg.duration > 0) {
    endTime = new Date(startTime.getTime() + pkg.duration * 60000).toISOString();
  }
  
  const transaction = {
    id: utils.generateId(),
    console_id: consoleId,
    package_id: packageId,
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
  
  // Close modal
  bootstrap.Modal.getInstance(document.getElementById('startBillingModal')).hide();
  
  // Refresh UI
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
  
  // Add transaction item
  const item = {
    id: utils.generateId(),
    transaction_id: transactionId,
    product_id: productId,
    product_name: product.name,
    price: product.price,
    qty: qty,
    created_at: new Date().toISOString()
  };
  
  db.add(DB_KEYS.TRANSACTION_ITEMS, item);
  
  // Update stock
  db.update(DB_KEYS.PRODUCTS, productId, { stock: product.stock - qty });
  
  // Close modal
  bootstrap.Modal.getInstance(document.getElementById('addFnBModal')).hide();
  
  // Refresh UI
  renderActiveTransactions();
  updateStats();
}

// ============================================
// PAYMENT OPERATIONS - DUAL MODE (CASH & QRIS)
// ============================================
let currentPaymentTransactionId = null;
let currentPaymentMethod = 'cash'; // default: cash
let currentPaymentTotal = 0;

/**
 * Fungsi untuk memilih metode pembayaran
 * @param {string} method - 'cash' atau 'qris'
 */
function selectPaymentMethod(method) {
  currentPaymentMethod = method;
  
  const btnPayCash = document.getElementById('btnPayCash');
  const btnPayQRIS = document.getElementById('btnPayQRIS');
  const cashForm = document.getElementById('cashPaymentForm');
  const qrisForm = document.getElementById('qrisPaymentForm');
  
  if (method === 'cash') {
    // Aktifkan tombol Cash, nonaktifkan QRIS
    btnPayCash.classList.add('active');
    btnPayCash.classList.remove('btn-outline-success');
    btnPayCash.classList.add('btn-success');
    
    btnPayQRIS.classList.remove('active');
    btnPayQRIS.classList.remove('btn-primary');
    btnPayQRIS.classList.add('btn-outline-primary');
    
    // Tampilkan form Cash, sembunyikan QRIS
    cashForm.style.display = 'block';
    qrisForm.style.display = 'none';
  } else {
    // Aktifkan tombol QRIS, nonaktifkan Cash
    btnPayQRIS.classList.add('active');
    btnPayQRIS.classList.remove('btn-outline-primary');
    btnPayQRIS.classList.add('btn-primary');
    
    btnPayCash.classList.remove('active');
    btnPayCash.classList.remove('btn-success');
    btnPayCash.classList.add('btn-outline-success');
    
    // Tampilkan form QRIS, sembunyikan Cash
    cashForm.style.display = 'none';
    qrisForm.style.display = 'block';
    
    // Isi total di form QRIS
    const qrisTotalEl = document.getElementById('qrisPaymentTotal');
    if (qrisTotalEl) {
      qrisTotalEl.value = utils.formatRupiah(currentPaymentTotal);
    }
  }
}

/**
 * Fungsi untuk menampilkan modal QRIS dengan QR Code
 * Dipanggil saat user klik "Tampilkan QRIS"
 */
function displayQRCode() {
  try {
    // Tutup modal pembayaran utama
    const paymentModalEl = document.getElementById('paymentModal');
    const paymentModal = bootstrap.Modal.getOrCreateInstance(paymentModalEl);
    paymentModal.hide();
    
    // Isi jumlah pembayaran di modal QRIS
    const qrisAmountEl = document.getElementById('qrisAmount');
    if (qrisAmountEl) {
      qrisAmountEl.textContent = utils.formatRupiah(currentPaymentTotal);
    }
    
    // Reset status pembayaran
    const statusEl = document.getElementById('qrisPaymentStatus');
    if (statusEl) {
      statusEl.innerHTML = `
        <div class="spinner-border text-primary me-2" role="status">
          <span class="visually-hidden">Loading...</span>
        </div>
        <span class="text-muted">Menunggu pembayaran...</span>
      `;
    }
    
    // Tampilkan modal QRIS
    const qrisModalEl = document.getElementById('qrisModal');
    const qrisModal = bootstrap.Modal.getOrCreateInstance(qrisModalEl);
    qrisModal.show();
    
    // Simulasi polling untuk cek status pembayaran (webhook simulation)
    startQRISSimulation();
    
  } catch (error) {
    console.error('Error displaying QRIS:', error);
    alert('Terjadi kesalahan saat menampilkan QRIS. Silakan coba lagi.');
  }
}

/**
 * Fungsi untuk menutup modal QRIS
 */
function closeQRISModal() {
  const qrisModalEl = document.getElementById('qrisModal');
  const qrisModal = bootstrap.Modal.getOrCreateInstance(qrisModalEl);
  qrisModal.hide();
  
  // Buka kembali modal pembayaran
  setTimeout(() => {
    const paymentModalEl = document.getElementById('paymentModal');
    const paymentModal = bootstrap.Modal.getOrCreateInstance(paymentModalEl);
    paymentModal.show();
  }, 300);
}

/**
 * Fungsi untuk mensimulasikan pembayaran QRIS berhasil
 * Dipanggil saat user klik tombol simulasi atau saat webhook diterima
 */
function simulateQRISSuccess() {
  try {
    // Update status pembayaran di UI
    const statusEl = document.getElementById('qrisPaymentStatus');
    if (statusEl) {
      statusEl.innerHTML = `
        <div class="alert alert-success">
          <i class="bi bi-check-circle-fill me-2"></i>
          <strong>Pembayaran berhasil!</strong><br>
          <small>Transaksi telah dikonfirmasi oleh DANA.</small>
        </div>
      `;
    }
    
    // Proses pembayaran
    setTimeout(() => {
      processQrisPayment();
    }, 1500);
    
  } catch (error) {
    console.error('Error simulating QRIS success:', error);
  }
}

/**
 * Fungsi untuk memproses pembayaran QRIS setelah konfirmasi
 */
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
    
    // Update transaction dengan metode QRIS
    db.update(DB_KEYS.TRANSACTIONS, currentPaymentTransactionId, {
      total_price: total,
      status: 'paid',
      paid_at: new Date().toISOString(),
      payment_method: 'qris',
      cash: total,
      change: 0
    });
    
    // Update console status
    db.update(DB_KEYS.CONSOLES, tx.console_id, { status: 'available' });
    
    // Tutup modal QRIS
    const qrisModalEl = document.getElementById('qrisModal');
    const qrisModal = bootstrap.Modal.getOrCreateInstance(qrisModalEl);
    qrisModal.hide();
    
    // Reset current transaction
    currentPaymentTransactionId = null;
    
    // Refresh UI
    renderConsoles();
    renderActiveTransactions();
    updateStats();
    
    // Tampilkan notifikasi sukses
    setTimeout(() => {
      showSuccessNotification();
      
      // Trigger auto-transfer (simulasi backend)
      simulateAutoTransfer(total);
    }, 300);
    
  } catch (error) {
    console.error('Error processing QRIS payment:', error);
    alert('Terjadi kesalahan saat memproses pembayaran QRIS. Silakan coba lagi.');
  }
}

/**
 * Fungsi untuk menampilkan notifikasi pembayaran berhasil
 */
function showSuccessNotification() {
  const successModalEl = document.getElementById('successModal');
  const successModal = bootstrap.Modal.getOrCreateInstance(successModalEl);
  successModal.show();
}

/**
 * Fungsi untuk menutup modal sukses
 */
function closeSuccessModal() {
  const successModalEl = document.getElementById('successModal');
  const successModal = bootstrap.Modal.getOrCreateInstance(successModalEl);
  successModal.hide();
}

/**
 * Fungsi untuk mensimulasikan auto-transfer ke rekening bank
 * Ini adalah simulasi logika backend yang biasanya berjalan di server
 * @param {number} amount - Jumlah yang akan ditransfer
 */
function simulateAutoTransfer(amount) {
  console.log('=== AUTO-TRANSFER SIMULATION ===');
  console.log('Waktu:', new Date().toISOString());
  console.log('Jumlah:', utils.formatRupiah(amount));
  console.log('Status: Memproses disbursement ke rekening bank terdaftar...');
  
  // Simulasi delay proses transfer
  setTimeout(() => {
    console.log('Status: Transfer berhasil! Saldo telah diteruskan ke rekening bank.');
    console.log('================================');
  }, 2000);
}

/**
 * Fungsi untuk memulai simulasi polling QRIS
 * Dalam implementasi nyata, ini akan diganti dengan webhook listener
 */
function startQRISSimulation() {
  // Dalam implementasi nyata, polling ini digantikan oleh:
  // 1. Webhook dari DANA yang mengirim notifikasi pembayaran
  // 2. Atau polling ke API DANA untuk cek status transaksi
  
  console.log('QRIS Polling started for transaction:', currentPaymentTransactionId);
  
  // Simulasi: setelah 30 detik, jika tidak ada pembayaran, tutup modal
  // (Dalam demo, user bisa klik tombol simulasi)
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
    const items = getTransactionItems(transactionId);
    
    const total = calculateCurrentTotal(tx);
    currentPaymentTotal = total; // Simpan untuk QRIS
    
    const fnbTotal = items.reduce((sum, item) => sum + (item.price * item.qty), 0);
    
    // Fill receipt preview
    const receiptDateEl = document.getElementById('receiptDate');
    if (receiptDateEl) receiptDateEl.textContent = utils.formatDate(new Date());
    
    const receiptConsoleEl = document.getElementById('receiptConsole');
    if (receiptConsoleEl) receiptConsoleEl.textContent = console ? console.name : '-';
    
    const receiptPackageEl = document.getElementById('receiptPackage');
    if (receiptPackageEl) receiptPackageEl.textContent = pkg ? pkg.name : '-';
    
    const receiptStartEl = document.getElementById('receiptStart');
    if (receiptStartEl) receiptStartEl.textContent = utils.formatDate(tx.start_time);
    
    const receiptDurationEl = document.getElementById('receiptDuration');
    if (receiptDurationEl) receiptDurationEl.textContent = calculateDuration(tx);
    
    const receiptBasePriceEl = document.getElementById('receiptBasePrice');
    if (receiptBasePriceEl) receiptBasePriceEl.textContent = utils.formatRupiah(tx.base_price);
    
    const receiptFnBEl = document.getElementById('receiptFnB');
    if (receiptFnBEl) receiptFnBEl.textContent = utils.formatRupiah(fnbTotal);
    
    const receiptTotalEl = document.getElementById('receiptTotal');
    if (receiptTotalEl) receiptTotalEl.textContent = utils.formatRupiah(total);
    
    // Fill payment form
    const paymentTotalEl = document.getElementById('paymentTotal');
    if (paymentTotalEl) {
      paymentTotalEl.value = utils.formatRupiah(total);
      paymentTotalEl.dataset.raw = total;
    }
    
    // Isi total di form QRIS juga
    const qrisPaymentTotalEl = document.getElementById('qrisPaymentTotal');
    if (qrisPaymentTotalEl) {
      qrisPaymentTotalEl.value = utils.formatRupiah(total);
    }
    
    const paymentCashEl = document.getElementById('paymentCash');
    if (paymentCashEl) paymentCashEl.value = '';
    
    const paymentChangeBoxEl = document.getElementById('paymentChangeBox');
    if (paymentChangeBoxEl) paymentChangeBoxEl.style.display = 'none';
    
    // Reset ke metode cash sebagai default
    selectPaymentMethod('cash');
    
    const modalEl = document.getElementById('paymentModal');
    const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
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
    
    // Jika metode cash, validasi uang diterima
    if (currentPaymentMethod === 'cash') {
      const cash = parseInt(document.getElementById('paymentCash').value) || 0;
      
      if (cash < total) {
        alert('Uang tunai tidak cukup! Total: ' + utils.formatRupiah(total));
        return;
      }
      
      // Update transaction dengan metode cash
      db.update(DB_KEYS.TRANSACTIONS, currentPaymentTransactionId, {
        total_price: total,
        status: 'paid',
        paid_at: new Date().toISOString(),
        payment_method: 'cash',
        cash: cash,
        change: cash - total
      });
    } else {
      // Untuk QRIS, proses berbeda (sudah dihandle di processQrisPayment)
      alert('Silakan gunakan tombol "Tampilkan QRIS" untuk pembayaran QRIS.');
      return;
    }
    
    // Update console status
    db.update(DB_KEYS.CONSOLES, tx.console_id, { status: 'available' });
    
    // Close modal
    const modalEl = document.getElementById('paymentModal');
    const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
    modal.hide();
    
    // Reset current transaction
    currentPaymentTransactionId = null;
    
    // Refresh UI
    renderConsoles();
    renderActiveTransactions();
    updateStats();
    
    // Show print option
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
  const fnbTotal = items.reduce((sum, item) => sum + (item.price * item.qty), 0);
  
  let baseTotal = transaction.base_price;
  
  // If reguler package, calculate based on elapsed time
  if (pkg && pkg.is_reguler) {
    const start = new Date(transaction.start_time);
    const now = new Date();
    const elapsedHours = Math.ceil((now - start) / (1000 * 60 * 60));
    baseTotal = elapsedHours * pkg.price;
  }
  
  return baseTotal + fnbTotal;
}

function calculateDuration(transaction) {
  const start = new Date(transaction.start_time);
  const now = new Date();
  const diff = Math.floor((now - start) / (1000 * 60)); // minutes
  const h = Math.floor(diff / 60);
  const m = diff % 60;
  return `${h}j ${m}m`;
}

function updateStats() {
  const consoles = db.get(DB_KEYS.CONSOLES);
  const transactions = getActiveTransactions();
  const products = db.get(DB_KEYS.PRODUCTS);
  
  const available = consoles.filter(c => c.status === 'available').length;
  const busy = consoles.filter(c => c.status === 'busy').length;
  const lowStock = products.filter(p => p.stock <= 10).length;
  
  // Calculate today's revenue
  const today = utils.getToday();
  const todayTransactions = db.get(DB_KEYS.TRANSACTIONS).filter(tx => {
    if (!tx.paid_at) return false;
    return tx.paid_at.split('T')[0] === today;
  });
  const todayRevenue = todayTransactions.reduce((sum, tx) => sum + (tx.total_price || 0), 0);
  
  document.getElementById('statTotalConsoles').textContent = consoles.length;
  document.getElementById('statActiveSessions').textContent = transactions.length;
  document.getElementById('statAvailableCount').textContent = available;
  document.getElementById('statTodayRevenue').textContent = utils.formatRupiah(todayRevenue);
}



