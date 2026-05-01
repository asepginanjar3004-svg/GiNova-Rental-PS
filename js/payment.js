﻿﻿﻿﻿﻿﻿﻿/**
 * GINOVA - Payment Functions
 * Single source of truth untuk flow pembayaran cash & QRIS.
 *
 * DEPENDENSI: dashboard.js harus di-load SEBELUM file ini,
 * karena menggunakan helper global: calculateTransactionTotal, aggregateFnBItems, calculateDuration, refreshDashboard.
 *
 * FITUR:
 * - Pembayaran Cash dengan perhitungan kembalian realtime
 * - Pembayaran QRIS dengan simulasi callback sukses
 * - Bill card modern (PS & F&B terpisah)
 * - Print struk via window.print()
 * - Update bill tanpa refresh halaman
 */

/** Konstanta metode pembayaran. */
const PAYMENT_METHODS = {
  CASH: 'cash',
  QRIS: 'qris'
};

// ============================================
// STATE PAYMENT (global scope, shared dengan dashboard.js)
// ============================================
// currentPaymentTransactionId, currentPaymentTotal, currentPaymentMethod
// dideklarasikan di dashboard.js agar tidak duplikat.

/** Ambil element by ID. */
function getElement(id) {
  return document.getElementById(id);
}

/** Format angka ke Rupiah. */
function formatCurrency(amount) {
  return utils?.formatRupiah(Number(amount) || 0) || ('Rp ' + (Number(amount) || 0));
}

/** Parse input uang ke number. */
function parseAmount(value) {
  const numeric = Number(String(value).replace(/[^0-9.]/g, ''));
  return Number.isFinite(numeric) ? Math.max(0, Math.floor(numeric)) : 0;
}

/** Tampilkan element (flex). */
function showElement(element) {
  if (element) element.style.display = 'flex';
}

/** Sembunyikan element. */
function hideElement(element) {
  if (element) element.style.display = 'none';
}

/** Helper agregasi item F&B agar tidak muncul duplikat di struk */
function aggregateFnBItems(items) {
    const map = new Map();
    items.forEach(item => {
        if (map.has(item.product_id)) {
            map.get(item.product_id).qty += item.qty;
        } else {
            map.set(item.product_id, { ...item });
        }
    });
    return Array.from(map.values());
}

// ============================================
// OPEN & RENDER PAYMENT MODAL
// ============================================

/**
 * Buka modal pembayaran dan render bill.
 * Menggunakan calculateTransactionTotal dari dashboard.js.
 * @param {string} transactionId
 */
function openPaymentModal(transactionId) {
  const tx = db.getById(DB_KEYS.TRANSACTIONS, transactionId);
  if (!tx) {
    console.warn('[openPaymentModal] Transaksi tidak ditemukan:', transactionId);
    return;
  }

  const consoleData = db.getById(DB_KEYS.CONSOLES, tx.console_id);
  const pkg = db.getById(DB_KEYS.PACKAGES, tx.package_id);
  const items = window.getTransactionItems(transactionId);
  const activeItems = items.filter(item => item.status !== 'void');
  const total = window.calculateCurrentTotal(tx);
  const fnbTotal = window.calculateFnBTotal(activeItems);
  const hasRental = !tx.is_guest_fnb_only && tx.base_price > 0;

  // Set state global agar completePayment bisa akses
  window.currentPaymentTransactionId = transactionId;
  window.currentPaymentTotal = total;
  window.currentPaymentMethod = PAYMENT_METHODS.CASH;

  renderBillHeader(tx, consoleData, total);
  renderBillSections(hasRental, tx, pkg, fnbTotal, activeItems);
  resetPaymentControls(total);
  
  // Tampilkan panel pembayaran
  getElement('billPaymentSection').classList.remove('d-none');
  setPaymentMethod(PAYMENT_METHODS.CASH);
  new bootstrap.Modal(getElement('paymentModal')).show();
}
window.openPaymentModal = openPaymentModal;

/** Render header struk: alamat, tanggal, ID, pelanggan, unit. */
function renderBillHeader(tx, consoleData, total) {
  const settings = db.get(DB_KEYS.SETTINGS);
  getElement('billStoreAddress').textContent = settings?.store_address || 'Jl. Kp. Ciketuk No.13 RT. 002 / RW. 001';
  getElement('billDate').textContent = utils.formatDate(new Date().toISOString());
  getElement('billTransactionId').textContent = 'ID: ' + tx.id.substring(0, 8).toUpperCase();
  getElement('billCustomer').textContent = tx.customer_name || '-';
  getElement('billConsole').textContent = consoleData ? consoleData.name : (tx.is_guest_fnb_only ? 'Order F&B' : '-');
  
  // Tambahkan detail waktu pemakaian jika ada
  const timeInfo = tx.start_time ? `${utils.formatTime(tx.start_time)} - ${tx.paid_at ? utils.formatTime(tx.paid_at) : utils.formatTime(new Date())}` : '-';
  const billConsoleEl = getElement('billConsole');
  if (billConsoleEl) {
    billConsoleEl.innerHTML = `${consoleData ? consoleData.name : 'Unit'} <br><small class="text-muted">${timeInfo}</small>`;
  }
  
  getElement('billTotal').textContent = formatCurrency(total);
}

/** Render bagian PS dan F&B di struk. */
function renderBillSections(hasRental, tx, pkg, fnbTotal, activeItems) {
  const psSection = getElement('billPSSection');
  const psDivider = getElement('billPSDivider');
  const fnbSection = getElement('billFnBSection');
  const fnbDivider = getElement('billFnBDivider');

  // Section Sewa PS
  if (hasRental) {
    psSection.style.display = 'block';
    psDivider.style.display = 'block';
    let pkgDisplayName = pkg ? pkg.name : 'Paket Sewa';
    if (tx.extended_amount > 0) {
        pkgDisplayName += ` <span class="badge bg-light text-dark">+Extend</span>`;
    }
    getElement('billPackageName').innerHTML = pkgDisplayName;
    // Tampilkan gabungan harga dasar + perpanjangan
    const rentalTotal = (Number(tx.base_price) || 0) + (Number(tx.extended_amount) || 0);
    getElement('billPackagePrice').textContent = formatCurrency(rentalTotal);
    getElement('billDuration').textContent = window.calculateDuration(tx);
    getElement('billSubtotalPS').textContent = formatCurrency(rentalTotal);
  } else {
    hideElement(psSection);
    hideElement(psDivider);
  }

  const aggregatedItems = aggregateFnBItems(activeItems);
  if (aggregatedItems.length > 0) {
    fnbSection.style.display = 'block';
    fnbDivider.style.display = 'block';
    // Tampilkan nama item DAN harga (lebih profesional untuk struk)
    getElement('billFnBList').innerHTML = aggregatedItems.map(item =>
      `<div class="d-flex justify-content-between align-items-center mb-1">
        <div class="me-2">
          <div class="fw-bold small">${item.product_name}</div>
          <div class="text-muted" style="font-size: 0.75rem;">${item.qty} x ${formatCurrency(item.price)}</div>
        </div>
        <div class="small fw-bold">${formatCurrency(item.price * item.qty)}</div>
      </div>`
    ).join('');
    getElement('billSubtotalFnB').textContent = formatCurrency(fnbTotal);
  } else {
    hideElement(fnbSection);
    hideElement(fnbDivider);
    getElement('billFnBList').innerHTML = '';
    getElement('billSubtotalFnB').textContent = formatCurrency(0);
  }
}

/** Reset kontrol pembayaran sebelum transaksi dimulai. */
function resetPaymentControls(total) {
  const paymentSection = getElement('billPaymentSection');
  paymentSection.classList.add('d-none');
  getElement('billPaymentMethod').textContent = '-';
  getElement('billPaidAmount').textContent = formatCurrency(0);
  getElement('billChange').textContent = formatCurrency(0);
  hideElement(getElement('billChangeRow'));
  hideElement(getElement('billStatusLunas'));
  const pendingStatus = getElement('billStatusPending');
  if (pendingStatus) {
    pendingStatus.classList.remove('d-none');
    pendingStatus.textContent = 'MENUNGGU';
  }

  getElement('paymentTransactionId').value = window.currentPaymentTransactionId;
  getElement('paymentTotal').value = formatCurrency(total);
  getElement('paymentTotal').dataset.raw = total;
  getElement('paymentCash').value = '';
  hideElement(getElement('paymentChangeBox'));
  const errorBox = getElement('paymentErrorBox');
  if (errorBox) hideElement(errorBox);
  const errorText = getElement('paymentErrorText');
  if (errorText) errorText.textContent = 'Uang tidak cukup';
  getElement('qrisPaymentTotal').value = formatCurrency(total);
  getElement('paymentCash').classList.remove('is-invalid');
  resetQRISModal();
}

// ============================================
// PAYMENT METHOD & VALIDATION
// ============================================

/** Pilih metode pembayaran dan update UI struk. */
function setPaymentMethod(method) {
  window.currentPaymentMethod = method;
  const btnCash = getElement('btnPayCash');
  const btnQris = getElement('btnPayQRIS');
  const cashForm = getElement('cashPaymentForm');
  const qrisForm = getElement('qrisPaymentForm');
  const billStatusPending = getElement('billStatusPending');

  if (method === PAYMENT_METHODS.CASH) {
    btnCash.classList.add('active');
    btnQris.classList.remove('active');
    cashForm.style.display = 'block';
    qrisForm.style.display = 'none';
    getElement('billPaymentMethod').textContent = 'Tunai (Cash)';
    getElement('billPaidAmount').textContent = formatCurrency(0);
  } else {
    btnCash.classList.remove('active');
    btnQris.classList.add('active');
    cashForm.style.display = 'none';
    qrisForm.style.display = 'block';
    getElement('billPaymentMethod').textContent = 'QRIS';
    getElement('billPaidAmount').textContent = formatCurrency(window.currentPaymentTotal);
  }

  getElement('billPaymentSection').classList.remove('d-none');
  hideElement(getElement('billStatusLunas'));
  if (billStatusPending) billStatusPending.classList.remove('d-none');
  hideElement(getElement('billChangeRow'));
}

/** Validasi pembayaran cash. */
function validateCashPayment(total, cashAmount) {
  if (cashAmount <= 0) {
    return { valid: false, change: 0, message: 'Masukkan jumlah uang terlebih dahulu.' };
  }
  const diff = cashAmount - total;
  if (diff < 0) {
    return { valid: false, change: 0, message: 'Uang tidak cukup! Kurang ' + formatCurrency(Math.abs(diff)) };
  }
  return { valid: true, change: diff, message: '' };
}

// ============================================
// COMPLETE PAYMENT (FULLY ASYNC)
// ============================================


/** 
 * Fungsi completePayment dan saveTransactionToServer sekarang dikelola 
 * di dashboard.js untuk menghindari konflik duplikasi.
 */
function showPaymentError(message) {
  const cashInput = getElement('paymentCash');
  const errorBox = getElement('paymentErrorBox');
  const errorText = getElement('paymentErrorText');

  if (cashInput) cashInput.classList.add('is-invalid');
  if (errorBox) showElement(errorBox);
  if (errorText) errorText.textContent = message;
}

/** Menjalankan animasi struk keluar dari printer */
function runPrintAnimation(transactionId) {
  const container = getElement('printAnimationContainer');
  if (!container) return;

  const tx = db.getById(DB_KEYS.TRANSACTIONS, transactionId);
  const items = window.getTransactionItems(transactionId);
  const activeItems = items.filter(item => item.status !== 'void');
  
  container.innerHTML = `
    <div class="receipt-paper-anim text-start">
      <div class="text-center fw-bold border-bottom pb-1 mb-2">GiNova PS</div>
      <div class="d-flex justify-content-between mb-1">
        <span>ID: ${tx.id.substring(0, 5)}</span>
        <span>${utils.formatTime(new Date())}</span>
      </div>
      <div class="border-bottom mb-2"></div>
      ${activeItems.map(item => `
        <div class="d-flex justify-content-between extra-small">
          <span>${item.qty}x ${item.product_name.substring(0,10)}</span>
          <span>${utils.formatRupiah(item.price * item.qty)}</span>
        </div>
      `).join('')}
      <div class="border-top mt-2 pt-1 d-flex justify-content-between fw-bold">
        <span>TOTAL</span>
        <span>${utils.formatRupiah(window.calculateCurrentTotal(tx))}</span>
      </div>
      <div class="text-center mt-3" style="font-size: 0.6rem;">--- TERIMA KASIH ---</div>
    </div>
  `;
  
  // Mainkan suara printer (optional)
  playAlarmSound(); 
}
window.runPrintAnimation = runPrintAnimation;

/** Cetak struk (mengandalkan CSS print media). */
function printReceipt() {
  window.print();
}

// ============================================
// QRIS PAYMENT
// ============================================

/** Tampilkan QRIS modal untuk simulasi pembayaran. */
function processPayment() {
  getElement('qrisAmount').textContent = formatCurrency(window.currentPaymentTotal);
  const paymentModal = bootstrap.Modal.getInstance(getElement('paymentModal'));
  if (paymentModal) paymentModal.hide();
  new bootstrap.Modal(getElement('qrisModal')).show();
}

/** Reset status QRIS setiap kali modal dibuka. */
function resetQRISModal() {
  const statusDiv = getElement('qrisPaymentStatus');
  if (statusDiv) {
    statusDiv.innerHTML = '<div class="spinner-border text-primary me-2" role="status"><span class="visually-hidden">Loading...</span></div><span class="text-muted">Menunggu pembayaran...</span>';
  }
}

/** Tutup modal QRIS. */
function closeQRISModal() {
  const modal = bootstrap.Modal.getInstance(getElement('qrisModal'));
  if (modal) modal.hide();
}

/** Simulasikan callback sukses QRIS. */
function simulateQRISSuccess() {
  const statusDiv = getElement('qrisPaymentStatus');
  if (statusDiv) {
    statusDiv.innerHTML = '<div class="alert alert-success"><i class="bi bi-check-circle-fill me-2"></i>Pembayaran berhasil!</div>';
  }
  setTimeout(() => completePayment(), 1500);
}

/** Tutup modal sukses. */
function closeSuccessModal() {
  const modal = bootstrap.Modal.getInstance(getElement('successModal'));
  if (modal) modal.hide();
}

// ============================================
// REALTIME CASH INPUT LISTENER
// ============================================

document.addEventListener('DOMContentLoaded', () => {
  // Listener untuk input uang tunai (hanya jika elemen ada)
  const cashInput = getElement('paymentCash');
  if (cashInput) {
    cashInput.addEventListener('input', () => {
      const total = Number(getElement('paymentTotal').dataset.raw) || 0;
      const cash = parseAmount(cashInput.value);
      const change = cash - total;
      const changeBox = getElement('paymentChangeBox');
      const errorBox = getElement('paymentErrorBox');
      const errorText = getElement('paymentErrorText');

      setPaymentMethod(PAYMENT_METHODS.CASH);
      getElement('billPaidAmount').textContent = formatCurrency(cash);

      if (cashInput.value === '') {
        hideElement(changeBox);
        hideElement(errorBox);
        hideElement(getElement('billChangeRow'));
        cashInput.classList.remove('is-invalid');
        return;
      }

      if (change >= 0) {
        getElement('paymentChange').textContent = formatCurrency(change);
        getElement('billChange').textContent = formatCurrency(change);
        showElement(getElement('billChangeRow'));
        showElement(changeBox);
        changeBox.classList.remove('alert-danger');
        changeBox.classList.add('alert-success');
        hideElement(errorBox);
        cashInput.classList.remove('is-invalid');
      } else {
        hideElement(changeBox);
        hideElement(getElement('billChangeRow'));
        showElement(errorBox);
        errorText.textContent = 'Uang tidak cukup! Kurang ' + formatCurrency(Math.abs(change));
        errorBox.classList.remove('alert-success');
        errorBox.classList.add('alert-danger');
        cashInput.classList.add('is-invalid');
      }
    });
  }

  // Listener untuk tombol Selesai Pembayaran
  const btnComplete = getElement('btnCompletePayment');
  if (btnComplete) {
    btnComplete.addEventListener('click', () => {
      if (typeof completePayment === 'function') {
          completePayment();
      } else {
          console.error('completePayment function not found in dashboard.js');
      }
    });
  }

  // Listener untuk tombol Cetak Struk di modal
  const btnPrint = getElement('btnPrintReceipt');
  if (btnPrint) {
    btnPrint.addEventListener('click', () => {
      window.print();
    });
  }
});
