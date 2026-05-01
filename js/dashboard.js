/**
 * GINOVA - Dashboard Operations
 * Timer, Billing, F&B, Payment, Alarm, Void, Guest F&B, Extend Time
 */

let alarmState = new Map();
let tenMinAlarmState = new Map();
let currentAlarmTransactionId = null;
let currentPaymentTransactionId = null;
let currentPaymentTotal = 0;
let currentPaymentMethod = 'cash';
let serverDashboardCache = null;

// Konfigurasi API Base URL untuk mendukung Live Server (Port 5500) -> PHP (Port 8000)
const API_BASE = window.location.port === '5500' ? 'http://localhost:8000/' : '';
window.API_BASE = API_BASE;

// ============================================
// TRANSACTION HELPERS
// ============================================

function getActiveTransactions() {
  const transactions = db.get(DB_KEYS.TRANSACTIONS);
  return transactions.filter(tx => tx.status === 'active');
}

function getActiveTransactionByConsole(consoleId) {
  const transactions = getActiveTransactions();
  return transactions.find(tx => tx.console_id === consoleId);
}

/** Ambil semua item F&B untuk transaksi tertentu */
function getTransactionItems(transactionId) {
  const items = db.get(DB_KEYS.TRANSACTION_ITEMS);
  return items.filter(item => item.transaction_id === transactionId);
}

function calculateCurrentTotal(transaction) {
  if (!transaction) return 0;
  // Perhitungan: Harga Paket + Biaya Tambah Jam + F&B
  let total = (Number(transaction.base_price) || 0) + (Number(transaction.extended_amount) || 0);
  const items = getTransactionItems(transaction.id);
  const activeItems = items.filter(item => item.status !== 'void');
  const fnbTotal = activeItems.reduce((sum, item) => sum + (item.price * item.qty), 0);
  total += fnbTotal;
  return total;
}

function calculateDuration(tx) {
  if (!tx || !tx.start_time) return '-';
  const start = new Date(tx.start_time);
  const end = tx.paid_at ? new Date(tx.paid_at) : new Date();
  const diffMs = end - start;
  const diffMins = Math.floor(diffMs / 60000);
  const h = Math.floor(diffMins / 60);
  const m = diffMins % 60;
  if (h > 0 && m > 0) return `${h} jam ${m} menit`;
  if (h > 0) return `${h} jam`;
  return `${m} menit`;
}
// Pastikan utility tersedia secara global untuk payment.js
window.calculateDuration = calculateDuration;
window.calculateCurrentTotal = calculateCurrentTotal;
window.getTransactionItems = getTransactionItems;

// ============================================
// STATS & REFRESH
// ============================================

function refreshDashboard() {
  renderConsoles();
  renderActiveTransactions();
  updateStats();
}

window.calculateFnBTotal = function(items) {
  return items
    .filter(item => item.status !== 'void')
    .reduce((sum, item) => sum + (item.price * item.qty), 0);
};

async function updateDashboardFromServer() {
  try {
    await syncPendingFnBOrders();
    const data = await fetchDashboardData();
    mergeServerDashboardData(data);
    serverDashboardCache = data;
    refreshDashboard();

    // Render summary cards with server data
    const stats = data;
    const totalConsoles = stats.units ? stats.units.length : db.get(DB_KEYS.CONSOLES).length;
    const activeSessions = stats.units ? stats.units.filter(unit => unit.transaction_id).length : getActiveTransactions().length;
    const availableCount = stats.units ? stats.units.filter(unit => unit.status === 'available').length : db.get(DB_KEYS.CONSOLES).filter(c => c.status === 'available').length;
    const todayRevenue = stats.revenue_today.total || 0;

    renderDashboardSummary({
      totalConsoles: totalConsoles || 0,
      activeSessions: activeSessions || 0,
      available: availableCount || 0,
      omset: todayRevenue
    });
  } catch (error) {
    console.warn('updateDashboardFromServer:', String(error.message || error));
    // Fallback to local data
    updateStats();
  }
}

async function syncPendingFnBOrders(showToast = false) {
  const key = 'ginova_pending_fnb_orders';
  const pending = JSON.parse(localStorage.getItem(key) || '[]');
  if (!Array.isArray(pending) || pending.length === 0) {
    hideSyncNotice();
    return;
  }

  const remaining = [];
  for (const order of pending) {
    try {
      await submitFnBAjax({ transaction_id: order.transaction_id, product_id: order.product_id, qty: order.qty });
    } catch (error) {
      console.error('[Sync Error] Pesanan F&B gagal dikirim ke server. Pastikan XAMPP/PHP Server di port 8000 aktif.', error.message);
      remaining.push(order);
    }
  }

  if (remaining.length > 0) {
    localStorage.setItem(key, JSON.stringify(remaining));
    showSyncNotice(remaining.length);
  } else {
    localStorage.removeItem(key);
    hideSyncNotice();
    if (showToast) {
      showToast('Semua pesanan pending berhasil disinkronkan.', 'success');
    }
  }
}

function mergeServerDashboardData(data) {
  if (!data || !Array.isArray(data.units)) return;
  const units = data.units;
  const consoles = db.get(DB_KEYS.CONSOLES);
  const consoleMap = new Map(consoles.map(item => [item.id, item]));

  units.forEach(unit => {
    const existing = consoleMap.get(unit.id);
    const consolePayload = {
      id: unit.id,
      name: unit.name,
      type: unit.type,
      status: unit.status,
      updated_at: new Date().toISOString()
    };

    if (existing) {
      db.update(DB_KEYS.CONSOLES, existing.id, consolePayload);
    } else {
      consolePayload.created_at = new Date().toISOString();
      db.add(DB_KEYS.CONSOLES, consolePayload);
    }

    if (unit.transaction_id) {
      const txPayload = {
        id: unit.transaction_id,
        console_id: unit.id,
        customer_name: unit.customer_name || '',
        start_time: unit.start_time || new Date().toISOString(),
        end_time: unit.end_time || null,
        base_price: parseFloat(unit.base_price) || 0,
        extended_amount: parseFloat(unit.extended_amount) || 0,
        status: 'active',
        is_guest_fnb_only: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      const existingTx = db.getById(DB_KEYS.TRANSACTIONS, unit.transaction_id);
      if (existingTx) {
        db.update(DB_KEYS.TRANSACTIONS, existingTx.id, txPayload);
      } else {
        db.add(DB_KEYS.TRANSACTIONS, txPayload);
      }
    }
  });
}

function updateStats() {
  try {
    if (serverDashboardCache && serverDashboardCache.revenue_today) {
      const stats = serverDashboardCache;
      const totalConsoles = stats.units ? stats.units.length : db.get(DB_KEYS.CONSOLES).length;
      const activeSessions = stats.units ? stats.units.filter(unit => unit.transaction_id).length : getActiveTransactions().length;
      const availableCount = stats.units ? stats.units.filter(unit => unit.status === 'available').length : db.get(DB_KEYS.CONSOLES).filter(c => c.status === 'available').length;
      const todayRevenue = stats.revenue_today.total || 0;

      renderDashboardSummary({
        totalConsoles: totalConsoles || 0,
        activeSessions: activeSessions || 0,
        available: availableCount || 0,
        omset: todayRevenue
      });
      return;
    }

    const consoles = db.get(DB_KEYS.CONSOLES);
    const transactions = getActiveTransactions();
    const availableCount = consoles.filter(c => c.status === 'available').length;
    const today = utils.getToday();
    const todayTransactions = db.get(DB_KEYS.TRANSACTIONS).filter(tx => {
      if (!tx.paid_at) return false;
      const paidDate = tx.paid_at.split('T')[0];
      return paidDate === today;
    });
    const todayRevenue = todayTransactions.reduce((sum, tx) => sum + (tx.total_price || 0), 0);

    renderDashboardSummary({
      totalConsoles: consoles.length || 0,
      activeSessions: transactions.length || 0,
      available: availableCount || 0,
      omset: todayRevenue
    });
  } catch (error) {
    console.error('Error updating stats:', error);
    renderDashboardSummary({
      totalConsoles: 'Error',
      activeSessions: 'Error',
      available: 'Error',
      omset: 'Error'
    });
    alert('Gagal memuat data dashboard. Silakan refresh halaman.');
  }
}

// ============================================
// RENDER DASHBOARD SUMMARY CARDS
// ============================================

function renderDashboardSummary(data) {
  const container = document.getElementById('dashboardSummaryContainer');
  if (!container) return;

  container.innerHTML = `
    <div class="summary-card">
      <div class="summary-icon">
        <i class="bi bi-controller"></i>
      </div>
      <div class="summary-content">
        <div class="summary-value">${data.totalConsoles}</div>
        <div class="summary-label">Total Unit PS</div>
      </div>
    </div>
    <div class="summary-card">
      <div class="summary-icon">
        <i class="bi bi-play-circle-fill"></i>
      </div>
      <div class="summary-content">
        <div class="summary-value">${data.activeSessions}</div>
        <div class="summary-label">Sesi Aktif</div>
      </div>
    </div>
    <div class="summary-card">
      <div class="summary-icon">
        <i class="bi bi-check-circle-fill"></i>
      </div>
      <div class="summary-content">
        <div class="summary-value">${data.available}</div>
        <div class="summary-label">Tersedia</div>
      </div>
    </div>
    <div class="summary-card">
      <div class="summary-icon">
        <i class="bi bi-cash-stack"></i>
      </div>
      <div class="summary-content">
        <div class="summary-value">${typeof data.omset === 'number' ? utils.formatRupiah(data.omset) : data.omset}</div>
        <div class="summary-label">Omset Hari Ini</div>
      </div>
    </div>
  `;
}

// ============================================
// TIMER & ALARM SYSTEM
// ============================================

function updateTimer() {
  updateAllTimers();
  checkAlarms();
  checkTenMinuteAlarm();
}

function checkAlarms() {
  const transactions = getActiveTransactions();
  const now = Date.now();
  transactions.forEach(tx => {
    if (tx.is_guest_fnb_only) return;
    if (!tx.end_time) return;
    const end = new Date(tx.end_time);
    const remainingSeconds = Math.floor((end - new Date()) / 1000);
    let state = alarmState.get(tx.id);
    if (!state) {
      state = { last5min: null, last1min: null };
      alarmState.set(tx.id, state);
    }
    if (remainingSeconds <= 0) {
      alarmState.delete(tx.id);
      return;
    }
    if (remainingSeconds <= 300 && remainingSeconds > 0) {
      const sinceLast5min = state.last5min ? now - state.last5min : Infinity;
      if (sinceLast5min >= 30000) {
        triggerAlarm(tx, 5, 'menit');
        state.last5min = now;
      }
    }
    if (remainingSeconds <= 60 && remainingSeconds > 0) {
      const sinceLast1min = state.last1min ? now - state.last1min : Infinity;
      if (sinceLast1min >= 10000) {
        triggerAlarm(tx, 1, 'menit');
        state.last1min = now;
      }
    }
  });
}

function checkTenMinuteAlarm() {
  const transactions = getActiveTransactions();
  const now = Date.now();

  transactions.forEach(tx => {
    if (tx.is_guest_fnb_only) return;
    if (!tx.end_time) return;
    const end = new Date(tx.end_time);
    const remainingSeconds = Math.floor((end - new Date()) / 1000);
    if (remainingSeconds <= 600 && remainingSeconds > 300) {
      let state = tenMinAlarmState.get(tx.id);
      if (!state) {
        state = { lastTrigger: null };
        tenMinAlarmState.set(tx.id, state);
      }
      const sinceLast = state.lastTrigger ? now - state.lastTrigger : Infinity;
      if (sinceLast >= 60000) {
        triggerTenMinAlarm(tx, Math.ceil(remainingSeconds / 60));
        state.lastTrigger = now;
      }
    } else {
      tenMinAlarmState.delete(tx.id);
    }
  });

  const anyInWindow = transactions.some(tx => {
    if (tx.is_guest_fnb_only || !tx.end_time) return false;
    const remainingSeconds = Math.floor((new Date(tx.end_time) - new Date()) / 1000);
    return remainingSeconds <= 600 && remainingSeconds > 300;
  });
  if (!anyInWindow) {
    const container = document.getElementById('tenMinAlarmContainer');
    if (container) container.classList.add('d-none');
  }
}

function triggerAlarm(tx, minutes, unit) {
  const consoleData = db.getById(DB_KEYS.CONSOLES, tx.console_id);
  const consoleName = consoleData ? consoleData.name : 'Unit';
  const customerName = tx.customer_name || 'Pelanggan';
  document.getElementById('alarmMessage').innerHTML = `<strong>${consoleName}</strong> - ${customerName}<br>Sisa waktu: <strong>${minutes} ${unit}</strong>`;
  document.getElementById('alarmContainer').classList.remove('d-none');
  const consoleCard = document.getElementById(`console-${tx.console_id}`);
  if (consoleCard) consoleCard.classList.add('alarm');
  const timerEl = document.getElementById(`timer-${tx.id}`);
  if (timerEl) timerEl.classList.add('alarm');
  playAlarmSound();
}

function triggerTenMinAlarm(tx, minutesLeft) {
  currentAlarmTransactionId = tx.id;
  const consoleData = db.getById(DB_KEYS.CONSOLES, tx.console_id);
  const consoleName = consoleData ? consoleData.name : 'Unit';
  const customerName = tx.customer_name || 'Pelanggan';
  document.getElementById('tenMinAlarmMessage').innerHTML = `<strong>${consoleName}</strong> - ${customerName}<br>Sisa waktu: <strong>${minutesLeft} menit</strong>`;
  document.getElementById('tenMinAlarmContainer').classList.remove('d-none');
}

function acknowledgeAlarm() {
  document.getElementById('alarmContainer').classList.add('d-none');
  document.querySelectorAll('.console-card.alarm').forEach(c => c.classList.remove('alarm'));
  document.querySelectorAll('.timer-display.alarm').forEach(e => e.classList.remove('alarm'));
}

function acknowledgeTenMinAlarm() {
  document.getElementById('tenMinAlarmContainer').classList.add('d-none');
  tenMinAlarmState.clear();
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

// ============================================
// RENDER CONSOLES
// ============================================

function renderConsoles() {
  const grid = document.getElementById('consolesGrid');
  const consoles = db.get(DB_KEYS.CONSOLES);

  grid.innerHTML = consoles.map(console => {
    const isBusy = console.status === 'busy';
    const isBooked = console.status === 'booking';
    const activeTransaction = getActiveTransactionByConsole(console.id);

    let fnbHtml = '';
    if (isBusy && activeTransaction) {
      const items = getTransactionItems(activeTransaction.id);
      const activeItems = items.filter(item => item.status !== 'void');
      if (activeItems.length > 0) {
        fnbHtml = '<div class="fnb-mini-list mt-2">' +
          activeItems.slice(0, 3).map(item => `<span class="fnb-item">${item.qty}x ${item.product_name}</span>`).join('') +
          (activeItems.length > 3 ? `<span class="fnb-item">+${activeItems.length - 3} lainnya</span>` : '') +
          '</div>';
      }
    }

    let customerBadge = '';
    if ((isBusy || isBooked) && activeTransaction && activeTransaction.customer_name) {
      const label = activeTransaction.is_guest_fnb_only ? 'Tamu F&B' : 'Penyewa';
      customerBadge = `<div class="customer-name-badge mt-1"><i class="bi bi-person-fill me-1"></i>${label}: ${activeTransaction.customer_name}</div>`;
    }

    let timerHtml = '';
    if (isBusy && activeTransaction) {
      const label = activeTransaction.is_guest_fnb_only ? 'Order F&B aktif' : formatTimer(activeTransaction);
      timerHtml = `<div class="timer-display mb-2 ${getTimerWarningClass(activeTransaction)}" id="timer-${activeTransaction.id}">${label}</div>`;
    }

    let actionButtons = '';
    if (isBusy && activeTransaction) {
      actionButtons = `
        <div class="card-actions mt-3">
          <button class="btn btn-action-fnb" onclick="openAddFnBModal('${activeTransaction.id}')">
            <i class="bi bi-cart-plus-fill me-2"></i>ORDER MAKAN/MINUM
          </button>
          <button class="btn btn-action-extend" onclick="openExtendTimeModal('${activeTransaction.id}')">
            <i class="bi bi-clock-fill me-2"></i>TAMBAH DURASI
          </button>
          <button class="btn btn-action-bill" onclick="window.openPaymentModal('${activeTransaction.id}')">
            <i class="bi bi-cash-stack me-2"></i>BAYAR & SELESAI
          </button>
        </div>
      `;
    } else if (isBooked) {
      actionButtons = `
        <div class="card-actions mt-3">
          <button class="btn btn-action-start" onclick="confirmBooking('${console.id}')">
            <i class="bi bi-play-btn-fill me-2"></i>MULAI MAIN
          </button>
          <button class="btn btn-outline-secondary btn-sm" onclick="cancelBooking('${console.id}')">
            <i class="bi bi-x-circle-fill me-2"></i>BATAL BOOKING
          </button>
        </div>
      `;
    } else {
      actionButtons = `
        <div class="card-actions mt-3">
          <button class="btn btn-action-start" onclick="window.openStartBillingModal('${console.id}')">
            <i class="bi bi-play-circle-fill me-2"></i>MULAI MAIN
          </button>
        </div>
      `;
    }

    let statusText = '';
    let statusIcon = '';
    if (isBusy) {
      statusText = 'Sedang Digunakan';
      statusIcon = 'bi-circle-fill text-danger';
    } else if (console.status === 'maintenance') {
      statusText = 'Maintenance';
      statusIcon = 'bi-circle-fill text-warning';
    } else if (isBooked) {
      statusText = 'Booking';
      statusIcon = 'bi-circle-fill text-warning';
    } else {
      statusText = 'Tersedia';
      statusIcon = 'bi-circle-fill text-success';
    }

    let bgStyle = '';
    if (console.status === 'available') {
      bgStyle = `background-image: linear-gradient(rgba(0,0,0,0.6), rgba(0,0,0,0.6)), url('./Asset/stanby.jpeg'); background-size: cover; background-position: center; color: #fff !important;`;
    } else if (console.status === 'busy') {
      bgStyle = `background-image: linear-gradient(rgba(0,0,0,0.6), rgba(0,0,0,0.6)), url('./Asset/nyala.jpeg'); background-size: cover; background-position: center; color: #fff !important;`;
    }

    const unitLabel = console.id || console.name;
    return `<div class="col-xl-3 col-lg-4 col-md-6 col-12">
      <div class="console-card ${console.status} p-3 h-100" id="console-${console.id}" style="${bgStyle}">
        <div class="console-card-header">
          <div class="console-card-icon">
            <i class="bi bi-controller fs-4"></i>
          </div>
          <div class="console-card-title">
            <h6>${console.name}</h6>
            <small>ID Unit: ${unitLabel} · ${console.type}</small>
          </div>
        </div>
        <div class="status-badge ${console.status}">
          <i class="${statusIcon} me-1 small"></i>${statusText}
        </div>
        ${customerBadge}
        ${timerHtml}
        ${fnbHtml}
        ${actionButtons}
      </div>
    </div>`;
  }).join('');
}

function formatTimer(transaction) {
  if (transaction.is_guest_fnb_only) return 'F&B Only';
  const now = new Date();
  if (transaction.end_time) {
    const end = new Date(transaction.end_time);
    const remaining = Math.floor((end - now) / 1000);
    if (remaining <= 0) return '00:00:00';
    return formatSeconds(remaining);
  }
  const start = new Date(transaction.start_time);
  const elapsed = Math.floor((now - start) / 1000);
  return formatSeconds(elapsed);
}

function getTimerWarningClass(transaction) {
  if (!transaction || !transaction.end_time) return '';
  const remaining = Math.floor((new Date(transaction.end_time) - new Date()) / 1000);
  return remaining <= 300 ? 'warning' : '';
}

function formatSeconds(totalSeconds) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

// ============================================
// BOOKING FUNCTIONS (PLACEHOLDER)
// ============================================

function confirmBooking(consoleId) {
  const console = db.getById(DB_KEYS.CONSOLES, consoleId);
  if (console) {
    console.status = 'busy';
    db.update(DB_KEYS.CONSOLES, consoleId, console);
    refreshDashboard();
  }
  openStartBillingModal(consoleId);
}

function cancelBooking(consoleId) {
  // Placeholder: Implement booking cancellation logic
  if (confirm('Batalkan booking untuk unit ini?')) {
    // Update console status to available
    const console = db.getById(DB_KEYS.CONSOLES, consoleId);
    if (console) {
      db.update(DB_KEYS.CONSOLES, consoleId, { status: 'available' });
      // Remove booking transaction if exists
      const activeTx = getActiveTransactionByConsole(consoleId);
      if (activeTx) {
        // Tandai sebagai dibatalkan jika perlu, di sini kita hapus saja sesuai placeholder asli
        db.delete(DB_KEYS.TRANSACTIONS, activeTx.id);
      }
      refreshDashboard();
    }
  }
}

function updateAllTimers() {
  const transactions = getActiveTransactions();
  transactions.forEach(tx => {
    if (tx.is_guest_fnb_only) return;
    const timerEl = document.getElementById(`timer-${tx.id}`);
    if (timerEl) timerEl.textContent = formatTimer(tx);
  });
}

// ============================================
// RENDER ACTIVE TRANSACTIONS TABLE
// ============================================

function renderActiveTransactions() {
  const tbody = document.getElementById('activeTransactionsTable');
  const transactions = getActiveTransactions();

  if (transactions.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted py-4"><i class="bi bi-inbox fs-1 d-block mb-2"></i>Tidak ada transaksi aktif</td></tr>';
    return;
  }

  tbody.innerHTML = transactions.map(tx => {
    if (tx.is_guest_fnb_only) {
      return renderGuestTransactionRow(tx);
    }
    return renderConsoleTransactionRow(tx);
  }).join('');
}

function renderGuestTransactionRow(tx) {
  const items = getTransactionItems(tx.id);
  const activeItems = items.filter(item => item.status !== 'void');
  const fnbTotal = activeItems.reduce((sum, item) => sum + (item.price * item.qty), 0);
  const currentTotal = calculateCurrentTotal(tx);
  const fnbDisplay = activeItems.length > 0 ? `${utils.formatRupiah(fnbTotal)} (${activeItems.length} item)` : '-';
  return `<tr class="table-info guest-row">
    <td>
      <span class="fw-semibold"><i class="bi bi-cup-hot me-1 text-info"></i>${tx.customer_name}</span>
      <br><small class="text-muted"><i class="bi bi-person-walking me-1"></i>Tamu (F&amp;B Only)</small>
    </td>
    <td><span class="badge bg-info text-white">Makanan &amp; Minuman</span></td>
    <td>${utils.formatDate(tx.start_time)}</td>
    <td><span class="badge bg-light text-dark border">-</span></td>
    <td>${fnbDisplay}</td>
    <td><span class="fw-bold text-success">${utils.formatRupiah(currentTotal)}</span></td>
    <td class="text-center">
      <button class="btn btn-sm btn-outline-success mb-1" onclick="openAddFnBModal('${tx.id}')"><i class="bi bi-plus-lg"></i> F&amp;B</button>
      <button class="btn btn-sm btn-outline-warning mb-1" onclick="openManageFnBModal('${tx.id}')"><i class="bi bi-list-ul"></i> Kelola</button>
      <button class="btn btn-sm btn-outline-danger" onclick="window.openPaymentModal('${tx.id}')"><i class="bi bi-cash"></i> Bayar</button>
    </td>
  </tr>`;
}

function renderConsoleTransactionRow(tx) {
  const consoleData = db.getById(DB_KEYS.CONSOLES, tx.console_id);
  const pkg = db.getById(DB_KEYS.PACKAGES, tx.package_id);
  const duration = calculateDuration(tx);
  const items = getTransactionItems(tx.id);
  const activeItems = items.filter(item => item.status !== 'void');
  const fnbTotal = activeItems.reduce((sum, item) => sum + (item.price * item.qty), 0);
  const total = utils.formatRupiah(calculateCurrentTotal(tx));
  const fnbDisplay = activeItems.length > 0 ? `${utils.formatRupiah(fnbTotal)} (${activeItems.length} item)` : '-';
  return `<tr>
    <td>${consoleData ? consoleData.name : '-'}</td>
    <td>${pkg ? pkg.name : '-'}</td>
    <td>${utils.formatDate(tx.start_time)}</td>
    <td><span class="badge bg-warning text-dark">${duration}</span></td>
    <td>${fnbDisplay}</td>
    <td>${total}</td>
    <td class="text-center">
      <button class="btn btn-sm btn-outline-primary" onclick="openAddFnBModal('${tx.id}')"><i class="bi bi-plus"></i> F&amp;B</button>
      <button class="btn btn-sm btn-outline-secondary" onclick="openManageFnBModal('${tx.id}')"><i class="bi bi-list"></i> Kelola</button>
      <button class="btn btn-sm btn-success" onclick="window.openPaymentModal('${tx.id}')"><i class="bi bi-cash"></i> Selesai &amp; Bayar</button>
    </td>
  </tr>`;
}

// ============================================
// SELECT LOADERS
// ============================================

function loadPackagesToSelect() {
  const select = document.getElementById('billingPackage');
  if (!select) return;
  select.innerHTML = '<option value="">-- Pilih Paket --</option>';
  const packages = db.get(DB_KEYS.PACKAGES);
  packages.forEach(pkg => {
    const option = document.createElement('option');
    option.value = pkg.id;
    option.textContent = `${pkg.name} - ${utils.formatRupiah(pkg.price)}`;
    select.appendChild(option);
  });
}

function loadProductsToSelect() {
  const select = document.getElementById('fnbProduct');
  if (!select) return;
  select.innerHTML = '<option value="">-- Pilih Produk --</option>';
  const products = db.get(DB_KEYS.PRODUCTS);
  products.forEach(prod => {
    const option = document.createElement('option');
    option.value = prod.id;
    option.textContent = `${prod.name} - ${utils.formatRupiah(prod.price)} (Stok: ${prod.stock})`;
    select.appendChild(option);
  });
}

function loadPackagesToExtendSelect() {
  const select = document.getElementById('extendNewPackage');
  if (!select) return;
  select.innerHTML = '<option value="">-- Pilih Paket --</option>';
  const packages = db.get(DB_KEYS.PACKAGES);
  packages.forEach(pkg => {
    const option = document.createElement('option');
    option.value = pkg.id;
    option.textContent = `${pkg.name} - ${utils.formatRupiah(pkg.price)}`;
    select.appendChild(option);
  });
}

// ============================================
// START BILLING MODAL
// ============================================

function openStartBillingModal(consoleId) {
  document.getElementById('billingConsoleId').value = consoleId;
  const consoleData = db.getById(DB_KEYS.CONSOLES, consoleId);
  document.getElementById('billingConsoleName').value = consoleData ? consoleData.name : '-';
  loadPackagesToSelect();
  document.getElementById('billingCustomerName').value = '';
  document.getElementById('packageInfo').style.display = 'none';
  new bootstrap.Modal(document.getElementById('startBillingModal')).show();
}

function startBilling() {
  const consoleId = document.getElementById('billingConsoleId').value;
  const pkgId = document.getElementById('billingPackage').value;
  const customerName = document.getElementById('billingCustomerName').value.trim();

  if (!customerName) {
      alert('Nama pelanggan wajib diisi!');
      document.getElementById('billingCustomerName').focus();
      return;
  }

  if (!pkgId) {
      alert('Pilih paket rental terlebih dahulu!');
      document.getElementById('billingPackage').focus();
      return;
  }
  
  const pkg = db.getById(DB_KEYS.PACKAGES, pkgId);
  if (!pkg) {
    showToast('Paket tidak valid!', 'error');
    return;
  }
  
  // VALIDASI: Harga dan durasi tidak boleh negatif
  if (pkg.price < 0 || pkg.duration < 0) {
    showToast('Harga dan durasi tidak boleh negatif!', 'error');
    return;
  }
  const settings = db.get(DB_KEYS.SETTINGS);
  const hourlyRate = settings.regular_price_per_hour || 6000;

  let endTime = null;
  if (pkg.duration > 0) {
    endTime = new Date(Date.now() + pkg.duration * 60 * 1000).toISOString();
  }

  const tx = {
    id: utils.generateId(),
    console_id: consoleId,
    package_id: pkgId,
    customer_name: customerName,
    base_price: pkg.price,
    hourly_rate: hourlyRate,
    start_time: new Date().toISOString(),
    end_time: endTime,
    status: 'active',
    created_by: Auth.getCurrentUser()?.id,
    extended_amount: 0
  };
  db.add(DB_KEYS.TRANSACTIONS, tx);
  db.update(DB_KEYS.CONSOLES, consoleId, { status: 'busy' });

  bootstrap.Modal.getInstance(document.getElementById('startBillingModal')).hide();
  refreshDashboard();
}

// ============================================
// ADD F&B MODAL
// ============================================

function openAddFnBModal(transactionId) {
  document.getElementById('fnbTransactionId').value = transactionId;
  loadProductsToSelect();
  document.getElementById('fnbQty').value = 1;
  document.getElementById('fnbInfo').style.display = 'none';
  new bootstrap.Modal(document.getElementById('addFnBModal')).show();
}

async function addFnB() {
  const txId = document.getElementById('fnbTransactionId').value;
  const prodId = document.getElementById('fnbProduct').value;
  const qty = parseInt(document.getElementById('fnbQty').value, 10);
  if (!prodId || qty < 1) {
    alert('Pilih produk dan masukkan jumlah!');
    return;
  }

  const btn = document.getElementById('btnAddFnB');
  const originalText = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1" role="status"></span>Memproses...';

  try {
    const payload = { transaction_id: txId, product_id: prodId, qty };

    // Coba kirim ke server jika menggunakan protokol http/https
    if (window.location.protocol.startsWith('http')) {
      try {
        await submitFnBAjax(payload);
        updateFnBLocalState(payload);
        const modalEl = document.getElementById('addFnBModal');
        const modal = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
        modal.hide();
        refreshDashboard();
        return;
      } catch (ajaxError) {
        console.warn('[addFnB] Server unreachable, falling back to offline mode:', ajaxError.message);
        // Lanjut ke logika offline di bawah jika AJAX gagal
      }
    }

    // Logika Offline / Fallback
    queueFnBOffline(payload);
  } finally {
    btn.disabled = false;
    btn.innerHTML = originalText;
  }
}

/** Helper: Hanya update state DB lokal untuk sinkronisasi UI */
function updateFnBLocalState(payload) {
  const prod = db.getById(DB_KEYS.PRODUCTS, payload.product_id);
  if (prod) {
    const item = {
      id: utils.generateId(),
      transaction_id: payload.transaction_id,
      product_id: payload.product_id,
      product_name: prod.name,
      price: prod.price,
      qty: payload.qty,
      status: 'active',
      added_at: new Date().toISOString()
    };
    db.add(DB_KEYS.TRANSACTION_ITEMS, item);
    db.update(DB_KEYS.PRODUCTS, payload.product_id, { stock: prod.stock - payload.qty });
  }
}

/** Helper: Simpan ke antrean pending jika server benar-benar mati */
function queueFnBOffline(payload) {
  const key = 'ginova_pending_fnb_orders';
  const pending = JSON.parse(localStorage.getItem(key) || '[]');
  const record = {
    id: utils.generateId(),
    transaction_id: payload.transaction_id,
    product_id: payload.product_id,
    qty: payload.qty,
    status: 'pending',
    created_at: new Date().toISOString()
  };
  pending.push(record);
  localStorage.setItem(key, JSON.stringify(pending));
  
  updateFnBLocalState(payload);
  showSyncNotice(pending.length);
  
  bootstrap.Modal.getInstance(document.getElementById('addFnBModal')).hide();
  showToast('Koneksi terganggu. Pesanan disimpan di browser.', 'warning');
  refreshDashboard();
}

window.showSyncNotice = function(count) {
  const bar = document.getElementById('syncNoticeBar');
  const text = document.getElementById('syncNoticeText');
  if (!bar || !text) return;
  text.textContent = `Ada ${count} pesanan F&B yang belum tersinkronisasi.`;
  bar.classList.remove('d-none');
};

window.hideSyncNotice = function() {
  const bar = document.getElementById('syncNoticeBar');
  if (!bar) return;
  bar.classList.add('d-none');
};

function updatePendingSyncNotice() {
  const pending = JSON.parse(localStorage.getItem('ginova_pending_fnb_orders') || '[]');
  if (Array.isArray(pending) && pending.length > 0) {
    showSyncNotice(pending.length);
  } else {
    hideSyncNotice();
  }
}

async function submitFnBAjax(payload) {
  try {
    const response = await fetch(`${API_BASE}api/add_fnb.php`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    let data;
    try {
      data = await response.json();
    } catch (e) {
      throw new Error('Server tidak mengembalikan format JSON yang valid.');
    }

    if (!response.ok) {
      throw new Error(data.message || data.error || `Server Error (${response.status})`);
    }

    return data;
  } catch (error) {
    // Tangani error jaringan (server mati/CORS)
    const msg = error.message.includes('fetch') ? 'Server PHP tidak terjangkau (Port 8000)' : error.message;
    throw new Error(msg);
  }
}

async function fetchDashboardData() {
  const response = await fetch(`${API_BASE}api/get_dashboard.php`);
  if (!response.ok) {
    throw new Error('Gagal memuat data dashboard dari server.');
  }
  const result = await response.json();
  if (result.status !== 'success') {
    throw new Error(result.message || 'Respons dashboard tidak valid.');
  }
  return result.data;
}

// ============================================
// MANAGE F&B MODAL (VOID)
// ============================================

function openManageFnBModal(transactionId) {
  document.getElementById('manageFnBTransactionId').value = transactionId;
  renderManageFnBList(transactionId);
  new bootstrap.Modal(document.getElementById('manageFnBModal')).show();
}

function renderManageFnBList(transactionId) {
  const container = document.getElementById('manageFnBList');
  const items = getTransactionItems(transactionId);
  if (items.length === 0) {
    container.innerHTML = '<p class="text-muted text-center py-3">Tidak ada item F&amp;B</p>';
    return;
  }
  container.innerHTML = `
    <table class="table table-sm">
      <thead>
        <tr><th>Produk</th><th>Jumlah</th><th>Total</th><th>Status</th><th>Aksi</th></tr>
      </thead>
      <tbody>
        ${items.map(item => `
          <tr>
            <td>${item.product_name}</td>
            <td>${item.qty}</td>
            <td>${utils.formatRupiah(item.price * item.qty)}</td>
            <td><span class="badge bg-${item.status === 'void' ? 'danger' : 'success'}">${item.status === 'void' ? 'Void' : 'Aktif'}</span></td>
            <td>${item.status === 'active' ? `<button class="btn btn-sm btn-outline-danger" onclick="voidFnBItem('${item.id}')"><i class="bi bi-x-lg"></i> Void</button>` : ''}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>`;
}

function voidFnBItem(itemId) {
  const item = db.getById(DB_KEYS.TRANSACTION_ITEMS, itemId);
  if (!item || item.status === 'void') return;
  const products = db.get(DB_KEYS.PRODUCTS);
  const prod = products.find(p => p.id === item.product_id);
  if (prod) {
    db.update(DB_KEYS.PRODUCTS, prod.id, { stock: prod.stock + item.qty });
  }
  const currentUser = Auth.getCurrentUser();
  db.update(DB_KEYS.TRANSACTION_ITEMS, itemId, {
    status: 'void',
    voided_at: new Date().toISOString(),
    voided_by: currentUser ? currentUser.id : null
  });
  const txId = document.getElementById('manageFnBTransactionId').value;
  renderManageFnBList(txId);
  refreshDashboard();
}

// ============================================
// QRIS PAYMENT
// ============================================

/** 
 * Selesaikan pembayaran dengan validasi (Fixed version).
 * Memastikan uang tunai cukup dan sinkronisasi ke server.
 */
async function completePayment() {
  const txId = window.currentPaymentTransactionId;
  if (!txId) return showToast('Tidak ada transaksi yang dipilih.', 'error');

  const tx = db.getById(DB_KEYS.TRANSACTIONS, txId);
  if (!tx) return showToast('Data transaksi tidak ditemukan.', 'error');

  const total = Number(window.currentPaymentTotal || 0);
  let paidAmount = 0;
  let change = 0;

  // Validasi Pembayaran Tunai
  if (window.currentPaymentMethod === 'cash') {
    const cashInput = document.getElementById('paymentCash');
    paidAmount = parseInt(cashInput.value.replace(/[^0-9]/g, '')) || 0;
    
    if (paidAmount < total) {
      showToast('Uang tunai tidak cukup! Total: ' + utils.formatRupiah(total), 'error');
      cashInput.focus();
      return;
    }
    change = paidAmount - total;
  } else {
    paidAmount = total;
    change = 0;
  }

  const updatedTx = {
    ...tx,
    paid_at: new Date().toISOString(),
    paid_amount: paidAmount,
    change_amount: change,
    payment_method: window.currentPaymentMethod,
    total_price: total,
    status: 'completed'
  };

  db.update(DB_KEYS.TRANSACTIONS, txId, updatedTx);
  if (updatedTx.console_id) db.update(DB_KEYS.CONSOLES, updatedTx.console_id, { status: 'available' });

  bootstrap.Modal.getInstance(document.getElementById('paymentModal'))?.hide();
  bootstrap.Modal.getInstance(document.getElementById('qrisModal'))?.hide();
  
  const successModal = new bootstrap.Modal(document.getElementById('successModal'));
  successModal.show();
  
  // Jalankan animasi print
  if (typeof window.runPrintAnimation === 'function') {
    window.runPrintAnimation(txId);
  }

  refreshDashboard();

  // Sinkronisasi ke server PHP
  try {
    await fetch(`${API_BASE}api/save_transaction.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedTx)
    });
  } catch (e) { console.warn('[Sync] Gagal lapor ke server:', e); }
}

// ============================================
// GUEST F&B MODAL
// ============================================

function openGuestFnBModal() {
  document.getElementById('guestCustomerName').value = '';
  renderGuestFnBList();
  document.getElementById('guestTotalInfo').style.display = 'none';
  new bootstrap.Modal(document.getElementById('guestFnBModal')).show();
}

function renderGuestFnBList() {
  const container = document.getElementById('guestFnBList');
  const products = db.get(DB_KEYS.PRODUCTS);

  const categories = [
    { id: 'Makanan', icon: 'bi-egg-fried', title: 'Menu Makanan' },
    { id: 'Minuman', icon: 'bi-cup-straw', title: 'Menu Minuman' }
  ];

  let html = '';

  categories.forEach(cat => {
    const filteredProducts = products.filter(p => p.category === cat.id);
    if (filteredProducts.length === 0) return;

    html += `
      <div class="guest-category-section mb-4">
        <div class="d-flex align-items-center mb-3">
          <div class="category-indicator bg-success me-2"></div>
          <h5 class="fw-800 text-dark mb-0 tracking-tight text-uppercase" style="font-family: 'Inter', sans-serif; font-size: 0.9rem;">
            <i class="bi ${cat.icon} me-2 text-success"></i>${cat.title}
          </h5>
        </div>
        <div class="row g-3">
    `;

    html += filteredProducts.map(prod => `
    <div class="col-md-6">
    <div class="guest-item-card" data-name="${prod.name.toLowerCase()}">
      <div class="guest-item-icon">
        <i class="bi ${cat.icon}"></i>
      </div>
      <div class="guest-item-info">
        <div class="guest-item-name fw-700">${prod.name}</div>
        <div class="guest-item-meta">
          <span class="guest-item-price fw-600 text-success">${utils.formatRupiah(prod.price)}</span>
          <span class="guest-item-stock"><i class="bi bi-box-seam me-1"></i>Stok: ${prod.stock}</span>
        </div>
      </div>
      <div class="qty-stepper">
        <button type="button" class="qty-btn qty-minus" onclick="changeGuestQty('${prod.id}', -1)" ${prod.stock <= 0 ? 'disabled' : ''}>
          <i class="bi bi-dash-lg"></i>
        </button>
        <span id="guestQty-${prod.id}" class="qty-value">0</span>
        <button type="button" class="qty-btn qty-plus" onclick="changeGuestQty('${prod.id}', 1)" ${prod.stock <= 0 ? 'disabled' : ''}>
          <i class="bi bi-plus-lg"></i>
        </button>
      </div>
    </div>
    </div>
    `).join('');

    html += `</div></div>`; // Close row and section
  });

  container.innerHTML = html;
}

function filterGuestProducts() {
  const search = document.getElementById('guestSearchProduct').value.toLowerCase().trim();
  const items = document.querySelectorAll('.guest-item-card');
  let visibleCount = 0;
  items.forEach(item => {
    const name = item.dataset.name;
    if (name.includes(search)) {
      item.style.display = 'flex';
      visibleCount++;
    } else {
      item.style.display = 'none';
    }
  });
  const noResults = document.getElementById('guestNoResults');
  if (noResults) {
    noResults.classList.toggle('d-none', visibleCount > 0);
  }
}

function changeGuestQty(productId, delta) {
  const qtyEl = document.getElementById(`guestQty-${productId}`);
  if (!qtyEl) return;
  
  const prod = db.getById(DB_KEYS.PRODUCTS, productId);
  if (!prod) return;
  
  let qty = parseInt(qtyEl.textContent) || 0;
  qty = Math.max(0, qty + delta);
  
  // Validasi stok: tidak boleh melebihi stok tersedia
  if (qty > prod.stock) {
    qty = prod.stock;
  }
  
  qtyEl.textContent = qty;
  updateGuestTotal();
}

/** Menghitung total belanja di modal Tamu F&B */
function updateGuestTotal() {
  const products = db.get(DB_KEYS.PRODUCTS);
  let total = 0;
  products.forEach(prod => {
    const qtyEl = document.getElementById(`guestQty-${prod.id}`);
    if (!qtyEl) return;
    const qty = parseInt(qtyEl.textContent) || 0;
    total += prod.price * qty;
  });
  const totalEl = document.getElementById('guestTotalAmount');
  if (totalEl) totalEl.textContent = utils.formatRupiah(total);
  const totalInfo = document.getElementById('guestTotalInfo');
  if (totalInfo) totalInfo.style.display = total > 0 ? 'block' : 'none';
}

/** Proses simpan order Tamu (Hanya F&B) */
function confirmGuestOrder() {
  const customerName = document.getElementById('guestCustomerName').value.trim();
  if (!customerName) {
    alert('Masukkan nama pelanggan!');
    return;
  }
  const products = db.get(DB_KEYS.PRODUCTS);
  const items = [];
  let total = 0;
  
  // Validasi stok terlebih dahulu
  for (const prod of products) {
    const qtyEl = document.getElementById(`guestQty-${prod.id}`);
    if (!qtyEl) continue;
    const qty = parseInt(qtyEl.textContent) || 0;
    if (qty > 0 && prod.stock < qty) {
      alert(`Stok ${prod.name} tidak cukup! Tersedia: ${prod.stock}`);
      return;
    }
  }
  
  // Proses order jika stok cukup
  for (const prod of products) {
    const qtyEl = document.getElementById(`guestQty-${prod.id}`);
    if (!qtyEl) continue;
    const qty = parseInt(qtyEl.textContent) || 0;
    if (qty > 0) {
      items.push({
        id: utils.generateId(),
        product_id: prod.id,
        product_name: prod.name,
        price: prod.price,
        qty: qty,
        status: 'active',
        added_at: new Date().toISOString()
      });
      total += prod.price * qty;
      db.update(DB_KEYS.PRODUCTS, prod.id, { stock: prod.stock - qty });
    }
  }
  
  if (items.length === 0) {
    alert('Pilih minimal 1 produk!');
    return;
  }
  const tx = {
    id: utils.generateId(),
    customer_name: customerName,
    is_guest_fnb_only: true,
    base_price: 0,
    start_time: new Date().toISOString(),
    status: 'active',
    created_by: Auth.getCurrentUser()?.id
  };
  db.add(DB_KEYS.TRANSACTIONS, tx);
  items.forEach(item => {
    item.transaction_id = tx.id;
    db.add(DB_KEYS.TRANSACTION_ITEMS, item);
  });
  
  const guestModal = bootstrap.Modal.getInstance(document.getElementById('guestFnBModal'));
  if (guestModal) guestModal.hide();

  // Sesuai permintaan: Langsung buka modal bayar agar transaksi bisa diselesaikan
  refreshDashboard();
  setTimeout(() => {
    window.openPaymentModal(tx.id);
  }, 600);
}

// ============================================
// EXTEND TIME MODAL
// ============================================

function openExtendTimeModal(transactionId) {
  const tx = db.getById(DB_KEYS.TRANSACTIONS, transactionId);
  if (!tx) return;
  const consoleData = db.getById(DB_KEYS.CONSOLES, tx.console_id);
  const settings = db.get(DB_KEYS.SETTINGS);
  const hourlyRate = settings.regular_price_per_hour || 6000;

  document.getElementById('extendTxId').value = transactionId;
  document.getElementById('extendConsoleName').value = consoleData ? consoleData.name : '-';
  document.getElementById('extendCustomerName').value = tx.customer_name || '-';

  const now = new Date();
  const end = tx.end_time ? new Date(tx.end_time) : now;
  const remainingSeconds = Math.floor((end - now) / 1000);
  const remainingMins = Math.max(0, Math.floor(remainingSeconds / 60));
  const remH = Math.floor(remainingMins / 60);
  const remM = remainingMins % 60;
  document.getElementById('extendRemainingTime').value = `${remH}j ${remM}m`;

  document.getElementById('extendCurrentBasePrice').value = utils.formatRupiah(tx.base_price);
  document.getElementById('extendHourlyRate').value = utils.formatRupiah(hourlyRate) + '/jam';

  loadPackagesToExtendSelect();
  toggleExtendOption();
  updateExtendCostPreview();

  new bootstrap.Modal(document.getElementById('extendTimeModal')).show();
}

function openExtendTimeModalFromAlarm() {
  const txId = currentAlarmTransactionId;
  if (txId) {
    acknowledgeTenMinAlarm();
    openExtendTimeModal(txId);
  }
}

function toggleExtendOption() {
  const option = document.querySelector('input[name="extendOption"]:checked').value;
  document.getElementById('extendHoursSection').style.display = option === 'add_hours' ? 'block' : 'none';
  document.getElementById('extendPackageSection').style.display = option === 'new_package' ? 'block' : 'none';
  updateExtendCostPreview();
}

function updateExtendCostPreview() {
  const txId = document.getElementById('extendTxId').value;
  const tx = db.getById(DB_KEYS.TRANSACTIONS, txId);
  if (!tx) return;

  const option = document.querySelector('input[name="extendOption"]:checked').value;
  let additionalCost = 0;
  const settings = db.get(DB_KEYS.SETTINGS);
  const hourlyRate = settings.regular_price_per_hour || 6000;

  if (option === 'add_hours') {
    const minutes = parseInt(document.getElementById('extendHoursSelect').value) || 0;
    additionalCost = Math.ceil(minutes / 60) * hourlyRate;
  } else {
    const pkgId = document.getElementById('extendNewPackage').value;
    const pkg = db.getById(DB_KEYS.PACKAGES, pkgId);
    if (pkg) {
      additionalCost = pkg.price;
    }
  }

  document.getElementById('extendAdditionalCost').textContent = utils.formatRupiah(additionalCost);
  document.getElementById('extendNewBasePrice').textContent = utils.formatRupiah(tx.base_price + additionalCost);
}

function confirmExtendTime() {
  const txId = document.getElementById('extendTxId').value;
  const tx = db.getById(DB_KEYS.TRANSACTIONS, txId);
  if (!tx) return;

  const option = document.querySelector('input[name="extendOption"]:checked').value;
  const settings = db.get(DB_KEYS.SETTINGS);
  const hourlyRate = settings.regular_price_per_hour || 6000;
  let additionalCost = 0;

  if (option === 'add_hours') {
    const minutes = parseInt(document.getElementById('extendHoursSelect').value) || 0;
    additionalCost = Math.ceil(minutes / 60) * hourlyRate;
    if (tx.end_time) {
      const currentEnd = new Date(tx.end_time);
      currentEnd.setMinutes(currentEnd.getMinutes() + minutes);
      tx.end_time = currentEnd.toISOString();
    }
  } else {
    const pkgId = document.getElementById('extendNewPackage').value;
    const pkg = db.getById(DB_KEYS.PACKAGES, pkgId);
    if (!pkg) {
      alert('Pilih paket baru!');
      return;
    }
    additionalCost = pkg.price;
    if (tx.end_time) {
      const currentEnd = new Date(tx.end_time);
      currentEnd.setMinutes(currentEnd.getMinutes() + pkg.duration);
      tx.end_time = currentEnd.toISOString();
    }
    tx.package_id = pkg.id;
  }

  tx.extended_amount = (tx.extended_amount || 0) + additionalCost;
  tx.base_price = tx.base_price + additionalCost;
  db.update(DB_KEYS.TRANSACTIONS, txId, tx);

  bootstrap.Modal.getInstance(document.getElementById('extendTimeModal')).hide();
  refreshDashboard();
}

// ============================================
// BUSINESS SUMMARY MODAL
// ============================================

function openBusinessSummaryModal() {
  const today = new Date();
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);
  const transactions = db.get(DB_KEYS.TRANSACTIONS).filter(tx => {
    const txDate = new Date(tx.paid_at || tx.start_time);
    return txDate >= startOfDay && txDate <= endOfDay && tx.status === 'completed';
  });

  let totalRevenue = 0;
  let consoleRevenue = 0;
  let fnbRevenue = 0;
  let transactionCount = transactions.length;

  transactions.forEach(tx => {
    const items = getTransactionItems(tx.id);
    const activeItems = items.filter(item => item.status !== 'void');
    const fnbTotal = activeItems.reduce((sum, item) => sum + (item.price * item.qty), 0);
    fnbRevenue += fnbTotal;
    consoleRevenue += tx.base_price + (tx.extended_amount || 0);
    totalRevenue += calculateCurrentTotal(tx);
  });

  const tbody = document.getElementById('businessSummaryTableBody');
  tbody.innerHTML = `
    <tr><td>Tanggal</td><td>${utils.formatDate(today)}</td></tr>
    <tr><td>Jumlah Transaksi</td><td>${transactionCount}</td></tr>
    <tr><td>Omzet PS</td><td>${utils.formatRupiah(consoleRevenue)}</td></tr>
    <tr><td>Omzet F&amp;B</td><td>${utils.formatRupiah(fnbRevenue)}</td></tr>
    <tr><td class="fw-bold">Total Omzet</td><td class="fw-bold text-success">${utils.formatRupiah(totalRevenue)}</td></tr>
  `;

  new bootstrap.Modal(document.getElementById('businessSummaryModal')).show();
}

function closeBusinessSummaryModal() {
  const modal = bootstrap.Modal.getInstance(document.getElementById('businessSummaryModal'));
  if (modal) modal.hide();
}

// ============================================
// INIT
// ============================================

document.addEventListener('DOMContentLoaded', () => {
  renderConsoles();
  renderActiveTransactions();
  loadPackagesToSelect();
  loadProductsToSelect();
  setTimeout(() => { if (typeof updateStats === 'function') updateStats(); }, 100);
  setInterval(() => { updateTimer(); }, 1000);

  document.getElementById('btnStartBilling').addEventListener('click', startBilling);
  
  // Pastikan tombol Add F&B di modal terikat ke fungsi
  const btnAddFnB = document.getElementById('btnAddFnB');
  if (btnAddFnB) {
    btnAddFnB.addEventListener('click', (e) => {
      e.preventDefault();
      addFnB();
    });
  }
  
  document.getElementById('manageFnBModal').addEventListener('hidden.bs.modal', refreshDashboard);
  document.getElementById('successModal').addEventListener('hidden.bs.modal', refreshDashboard);
  document.getElementById('paymentModal').addEventListener('hidden.bs.modal', refreshDashboard);
  document.getElementById('qrisModal').addEventListener('hidden.bs.modal', refreshDashboard);
  document.getElementById('guestFnBModal').addEventListener('hidden.bs.modal', refreshDashboard);
  document.getElementById('extendTimeModal').addEventListener('hidden.bs.modal', refreshDashboard);

  document.getElementById('billingPackage').addEventListener('change', function() {
    const pkgId = this.value;
    if (!pkgId) { document.getElementById('packageInfo').style.display = 'none'; return; }
    const pkg = db.getById(DB_KEYS.PACKAGES, pkgId);
    if (pkg) {
      document.getElementById('packageDesc').textContent = `${pkg.name} - ${pkg.is_reguler ? 'Reguler (per jam)' : pkg.description} - ${utils.formatRupiah(pkg.price)}`;
      document.getElementById('packageInfo').style.display = 'block';
    }
  });

  if (window.location.protocol.startsWith('http')) {
    updateDashboardFromServer();
    setInterval(updateDashboardFromServer, 30000);
  } else {
    console.warn('API polling tidak diaktifkan pada mode file://.');
  }

  updatePendingSyncNotice();

  document.getElementById('fnbProduct').addEventListener('change', function() {
    const prodId = this.value;
    if (!prodId) { document.getElementById('fnbInfo').style.display = 'none'; return; }
    const prod = db.getById(DB_KEYS.PRODUCTS, prodId);
    if (prod) {
      document.getElementById('fnbPrice').textContent = utils.formatRupiah(prod.price);
      document.getElementById('fnbStock').textContent = prod.stock;
      document.getElementById('fnbInfo').style.display = 'block';
    }
  });


  document.getElementById('extendNewPackage').addEventListener('change', function() {
    const pkgId = this.value;
    if (!pkgId) { document.getElementById('extendPackageInfo').style.display = 'none'; return; }
    const pkg = db.getById(DB_KEYS.PACKAGES, pkgId);
    if (pkg) {
      document.getElementById('extendPackageDesc').textContent = `${pkg.name} - ${pkg.description} - ${utils.formatRupiah(pkg.price)}`;
      document.getElementById('extendPackageInfo').style.display = 'block';
    }
    updateExtendCostPreview();
  });

  document.getElementById('extendHoursSelect').addEventListener('change', updateExtendCostPreview);
});

/** 
 * Helper: Update state DB lokal (Instant Update)
 */
function updateFnBLocalState(payload) {
  const prod = typeof db !== 'undefined' ? db.getById(DB_KEYS.PRODUCTS, payload.product_id) : null;
  if (prod) {
    const item = {
      id: payload.id || utils.generateId(),
      transaction_id: payload.transaction_id,
      product_id: payload.product_id,
      product_name: prod.name,
      price: prod.price,
      qty: payload.qty,
      status: 'active',
      added_at: new Date().toISOString()
    };
    if (typeof db !== 'undefined') {
      db.add(DB_KEYS.TRANSACTION_ITEMS, item);
      db.update(DB_KEYS.PRODUCTS, payload.product_id, { stock: prod.stock - payload.qty });
    }
    return item;
  }
}

/** 
 * Alias untuk queueFnBOffline agar konsisten
 */
function queueForSyncOnly(payload) {
  return queueFnBOffline(payload);
}
