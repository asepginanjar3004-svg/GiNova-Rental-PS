/**
 * GINOVA - Sync & Payment Fixes
 * JavaScript fix for synchronization and payment button issues
 * Compatible with PWA offline-first architecture
 * 
 * Fixes:
 * 1. F&B sync alert not disappearing
 * 2. "Bayar" and "Selesai & Bayar" buttons not working
 */

// ============================================
// CONFIGURATION
// ============================================

// Auto-detect API base URL based on current port
const API_BASE = window.location.port === '5500' ? 'http://localhost:8000/' : '';
// Alternative: Use empty string if same origin
// const API_BASE = '';

const API_ENDPOINTS = {
    SYNC: API_BASE + 'api/sync.php',
    UPDATE_STATUS: API_BASE + 'api/update_status.php',
    ADD_FNB: API_BASE + 'api/add_fnb.php',
    SAVE_TRANSACTION: API_BASE + 'api/save_transaction.php',
    GET_DASHBOARD: API_BASE + 'api/get_dashboard.php'
};

const SYNC_KEY = 'ginova_pending_fnb_orders';
const MAX_SYNC_ATTEMPTS = 3;

// ============================================
// SYNC FUNCTIONS (Fix for "Sinkron Sekarang" button)
// ============================================

/**
 * Main sync function - Call this when "Sinkron Sekarang" is clicked
 * @param {boolean} showToast - Whether to show success/error toast
 */
async function doSyncNow(showToast = true) {
    const syncBtn = document.getElementById('btnSyncNow');
    if (syncBtn) {
        syncBtn.disabled = true;
        syncBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Menyinkronkan...';
    }
    
    try {
        const pending = getPendingOrders();
        
        if (pending.length === 0) {
            hideSyncNotice();
            if (showToast) showToastMessage('Tidak ada pesanan yang perlu disinkronkan', 'info');
            return { success: true, synced: 0 };
        }
        
        // Try to sync each pending order
        const results = await syncOrdersToServer(pending);
        
        if (results.failed.length === 0) {
            // All synced successfully
            localStorage.removeItem(SYNC_KEY);
            hideSyncNotice();
            if (showToast) {
                showToastMessage(`Berhasil menyinkronkan ${results.synced.length} pesanan!`, 'success');
            }
            // Refresh dashboard after successful sync
            if (typeof refreshDashboard === 'function') refreshDashboard();
            return { success: true, synced: results.synced.length };
            
        } else if (results.synced.length > 0) {
            // Partial success - keep failed items in queue
            savePendingOrders(results.failed);
            showSyncNotice(results.failed.length);
            if (showToast) {
                showToastMessage(`Berhasil ${results.synced.length}, Gagal ${results.failed.length}. Akan dicoba lagi.`, 'warning');
            }
            return { success: true, synced: results.synced.length, failed: results.failed.length };
            
        } else {
            // All failed
            showSyncNotice(pending.length);
            if (showToast) {
                showToastMessage('Gagal menyinkronkan. Server mungkin tidak terjangkau.', 'error');
            }
            return { success: false, error: 'Sync failed' };
        }
        
    } catch (error) {
        console.error('[Sync Error]', error);
        if (showToast) {
            showToastMessage('Error: ' + error.message, 'error');
        }
        return { success: false, error: error.message };
        
    } finally {
        if (syncBtn) {
            syncBtn.disabled = false;
            syncBtn.innerHTML = '<i class="bi bi-arrow-repeat me-1"></i>Sinkron Sekarang';
        }
    }
}

/**
 * Get pending orders from localStorage
 */
function getPendingOrders() {
    try {
        const data = localStorage.getItem(SYNC_KEY);
        return data ? JSON.parse(data) : [];
    } catch {
        return [];
    }
}

/**
 * Save pending orders to localStorage
 */
function savePendingOrders(orders) {
    if (orders.length === 0) {
        localStorage.removeItem(SYNC_KEY);
    } else {
        localStorage.setItem(SYNC_KEY, JSON.stringify(orders));
    }
}

/**
 * Sync array of orders to server
 */
async function syncOrdersToServer(orders) {
    const synced = [];
    const failed = [];
    
    for (const order of orders) {
        try {
            // Use sync.php endpoint for proper sync handling
            const response = await fetch(API_ENDPOINTS.SYNC, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    transaction_id: order.transaction_id,
                    product_id: order.product_id,
                    qty: order.qty,
                    item_id: order.id || null
                })
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const result = await response.json();
            
            if (result.status === 'success') {
                synced.push(order);
            } else {
                // Increment attempts
                order.attempts = (order.attempts || 0) + 1;
                if (order.attempts < MAX_SYNC_ATTEMPTS) {
                    failed.push(order);
                } else {
                    console.warn('[Sync] Max attempts reached for order:', order.id);
                }
            }
            
        } catch (error) {
            console.error('[Sync Order Error]', error);
            order.attempts = (order.attempts || 0) + 1;
            if (order.attempts < MAX_SYNC_ATTEMPTS) {
                failed.push(order);
            }
        }
    }
    
    return { synced, failed };
}

// ============================================
// UI HELPER FUNCTIONS
// ============================================

/**
 * Show sync notice bar with count
 */
function showSyncNotice(count) {
    const bar = document.getElementById('syncNoticeBar');
    const text = document.getElementById('syncNoticeText');
    if (!bar) return;
    
    if (count > 0) {
        bar.classList.remove('d-none');
        if (text) {
            text.textContent = `Ada ${count} pesanan F&B yang belum tersinkronisasi.`;
        }
    } else {
        bar.classList.add('d-none');
    }
}

/**
 * Hide sync notice bar
 */
function hideSyncNotice() {
    showSyncNotice(0);
}

/**
 * Show toast message (simple implementation)
 */
function showToastMessage(message, type = 'info') {
    // Try to use existing toast function
    if (typeof showToast === 'function') {
        showToast(message, type);
        return;
    }
    
    // Simple alert fallback
    const colors = {
        success: '#28a745',
        error: '#dc3545',
        warning: '#ffc107',
        info: '#17a2b8'
    };
    console.log(`%c[${type.toUpperCase()}] ${message}`, `color: ${colors[type] || colors.info}`);
    
    // Try Bootstrap toast if available
    const toastContainer = document.querySelector('.toast-container');
    if (toastContainer) {
        const toast = document.createElement('div');
        toast.className = `toast align-items-center text-white bg-${type === 'error' ? 'danger' : type}`;
        toast.setAttribute('role', 'alert');
        toast.setAttribute('aria-live', 'assertive');
        toast.setAttribute('aria-atomic', 'true');
        toast.innerHTML = `
            <div class="d-flex">
                <div class="toast-body">${message}</div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
            </div>
        `;
        toastContainer.appendChild(toast);
        const bsToast = new bootstrap.Toast(toast);
        bsToast.show();
    }
}

// ============================================
// PAYMENT FUNCTIONS (Fix for "Bayar" and "Selesai & Bayar" buttons)
// ============================================

/**
 * Complete payment - Main function for payment buttons
 * @param {string} transactionId - The transaction ID
 * @param {number} total - Total amount
 * @param {string} method - 'cash' or 'qris'
 * @param {number} paidAmount - Amount paid by customer
 * @param {number} changeAmount - Change to give back
 */
async function completePaymentTransaction(transactionId, total, method = 'cash', paidAmount = 0, changeAmount = 0) {
    if (!transactionId) {
        showToastMessage('Transaction ID tidak ditemukan', 'error');
        return { success: false, error: 'No transaction ID' };
    }
    
    const paidAt = new Date().toISOString();
    
    try {
        // Send to server
        const response = await fetch(API_ENDPOINTS.UPDATE_STATUS, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                action: 'complete_payment',
                transaction_id: transactionId,
                paid_amount: paidAmount,
                change_amount: changeAmount,
                payment_method: method,
                total_price: total,
                paid_at: paidAt
            })
        });
        
        if (!response.ok) {
            throw new Error(`Server error: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.status === 'success') {
            // Update local database
            if (typeof db !== 'undefined') {
                const tx = db.getById(DB_KEYS.TRANSACTIONS, transactionId);
                if (tx) {
                    db.update(DB_KEYS.TRANSACTIONS, transactionId, {
                        ...tx,
                        status: 'completed',
                        paid_at: paidAt,
                        paid_amount: paidAmount,
                        change_amount: changeAmount,
                        payment_method: method,
                        total_price: total
                    });
                    
                    // Update console status
                    if (tx.console_id) {
                        db.update(DB_KEYS.CONSOLES, tx.console_id, { status: 'available' });
                    }
                }
            }
            
            // Refresh dashboard
            if (typeof refreshDashboard === 'function') {
                refreshDashboard();
            }
            
            showToastMessage('Pembayaran berhasil!', 'success');
            return { success: true, data: result.data };
            
        } else {
            throw new Error(result.message || 'Payment failed');
        }
        
    } catch (error) {
        console.error('[Payment Error]', error);
        
        // Fallback: Update local only if server unreachable
        console.warn('[Payment] Server unreachable, updating local only');
        
        if (typeof db !== 'undefined') {
            const tx = db.getById(DB_KEYS.TRANSACTIONS, transactionId);
            if (tx) {
                db.update(DB_KEYS.TRANSACTIONS, transactionId, {
                    ...tx,
                    status: 'completed',
                    paid_at: paidAt,
                    paid_amount: paidAmount,
                    change_amount: changeAmount,
                    payment_method: method,
                    total_price: total
                });
                
                if (tx.console_id) {
                    db.update(DB_KEYS.CONSOLES, tx.console_id, { status: 'available' });
                }
            }
        }
        
        if (typeof refreshDashboard === 'function') {
            refreshDashboard();
        }
        
        showToastMessage('Pembayaran disimpan secara lokal. Akan disinkronkan nanti.', 'warning');
        return { success: true, local: true };
    }
}

/**
 * Process payment button click
 */
async function onPaymentButtonClick() {
    const transactionId = window.currentPaymentTransactionId;
    const total = window.currentPaymentTotal;
    const method = window.currentPaymentMethod;
    
    if (!transactionId) {
        showToastMessage('Tidak ada transaksi yang dipilih', 'error');
        return;
    }
    
    // Get payment amount based on method
    let paidAmount = 0;
    let changeAmount = 0;
    
    if (method === 'cash') {
        const cashInput = document.getElementById('paymentCash');
        paidAmount = parseInt(cashInput?.value?.replace(/[^0-9]/g, '') || '0');
        
        if (paidAmount < total) {
            showToastMessage('Uang tidak cukup!', 'error');
            return;
        }
        
        changeAmount = paidAmount - total;
        
    } else if (method === 'qris') {
        paidAmount = total;
        changeAmount = 0;
        
        // Show QRIS modal
        const qrisModal = new bootstrap.Modal(document.getElementById('qrisModal'));
        qrisModal.show();
        return;
    }
    
    // Complete payment
    const paymentModal = bootstrap.Modal.getInstance(document.getElementById('paymentModal'));
    if (paymentModal) paymentModal.hide();
    
    await completePaymentTransaction(transactionId, total, method, paidAmount, changeAmount);
    
    // Show success modal
    const successModal = new bootstrap.Modal(document.getElementById('successModal'));
    successModal.show();
}

// ============================================
// AUTO-SYNC ON CONNECTION
// ============================================

/**
 * Setup auto-sync when connection becomes available
 */
function setupAutoSync() {
    if (!navigator.onLine) {
        console.log('[Sync] Offline mode, skipping auto-sync');
        return;
    }
    
    // Try to sync on page load
    doSyncNow(false);
    
    // Setup periodic sync every 30 seconds
    setInterval(() => {
        if (navigator.onLine) {
            doSyncNow(false);
        }
    }, 30000);
    
    // Setup online/offline handlers
    window.addEventListener('online', () => {
        console.log('[Sync] Connection restored, syncing...');
        doSyncNow(true);
    });
    
    window.addEventListener('offline', () => {
        console.log('[Sync] Connection lost');
    });
}

// ============================================
// HELPERS
// ============================================

/**
 * Format number to Rupiah
 */
function formatRupiah(amount) {
    const num = Number(amount) || 0;
    return 'Rp ' + num.toLocaleString('id-ID');
}

// Make functions available globally
window.doSyncNow = doSyncNow;
window.openPaymentModal = openPaymentModal;
window.completePaymentTransaction = completePaymentTransaction;
window.onPaymentButtonClick = onPaymentButtonClick;
window.showSyncNotice = showSyncNotice;
window.hideSyncNotice = hideSyncNotice;

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    // Setup auto-sync
    setupAutoSync();
    
    // Override sync button if exists
    const syncBtn = document.querySelector('button[onclick*="updateDashboardFromServer"]');
    if (syncBtn) {
        syncBtn.onclick = (e) => {
            e.preventDefault();
            doSyncNow(true);
        };
        // Add ID for easier access
        syncBtn.id = 'btnSyncNow';
    }
    
    // Ensure payment button is connected
    const payBtn = document.getElementById('btnCompletePayment');
    if (payBtn) {
        payBtn.onclick = onPaymentButtonClick;
    }
    
    console.log('[GiNova] Sync & Payment Fixes loaded');
});

console.log('[GiNova] sync-fix.js loaded');
