# GINOVA - Code Examples for Fixes

This file contains all the requested code examples for fixing the synchronization and payment button issues.

---

## 📋 Example 1: Database Table Structure (with Sync Status)

### SQL for transactions with sync status:

```sql
-- TABEL: TRANSACTION_ITEMS (dengan kolom is_synced)
CREATE TABLE transaction_items (
    id VARCHAR(36) PRIMARY KEY,
    transaction_id VARCHAR(36) NOT NULL,
    product_id VARCHAR(36) NOT NULL,
    product_name VARCHAR(100) NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    qty INT NOT NULL DEFAULT 1,
    status ENUM('active', 'void') NOT NULL DEFAULT 'active',
    
    -- KOLOM SYNC (PENTING!)
    is_synced TINYINT(1) DEFAULT 0,      -- 0 = belum sync, 1 = sudah sync
    sync_attempts INT DEFAULT 0,        -- Jumlah percobaan sync
    last_sync_at DATETIME,              -- Waktu sync terakhir
    
    voided_by VARCHAR(36),
    voided_at DATETIME,
    created_at DATETIME NOT NULL
);

-- ALTER untuk tabel yang sudah ada:
ALTER TABLE transaction_items ADD COLUMN is_synced TINYINT(1) DEFAULT 0;
ALTER TABLE transaction_items ADD COLUMN sync_attempts INT DEFAULT 0;
ALTER TABLE transaction_items ADD COLUMN last_sync_at DATETIME;
```

---

## 📋 Example 2: JavaScript AJAX/Fetch for Sync & Payment Buttons

### A. Sync Button (Sinkron Sekarang) - JavaScript:

```javascript
/**
 * Sinkronisasi pesanan F&B ke server
 * Panggil saat tombol "Sinkron Sekarang" diklik
 */
async function doSyncNow() {
    const syncBtn = document.getElementById('btnSyncNow');
    if (syncBtn) {
        syncBtn.disabled = true;
        syncBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Menyinkronkan...';
    }
    
    try {
        // Ambil pesanan pending dari localStorage
        const pending = JSON.parse(localStorage.getItem('ginova_pending_fnb_orders') || '[]');
        
        if (pending.length === 0) {
            hideSyncNotice(); // Sembunyikan alert
            showToast('Tidak ada pesanan yang perlu disinkronkan', 'info');
            return;
        }
        
        // Kirim ke server
        const response = await fetch('api/sync.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ items: pending })
        });
        
        const result = await response.json();
        
        if (result.status === 'success') {
            // Hapus dari localStorage
            localStorage.removeItem('ginova_pending_fnb_orders');
            // Sembunyikan alert
            hideSyncNotice();
            showToast(`Berhasil sync ${result.data.synced.length} pesanan!`, 'success');
            // Refresh dashboard
            refreshDashboard();
        } else {
            // Simpan yang failed untuk retry
            savePendingOrders(result.data.failed);
            showToast('Sebagian gagal sync', 'warning');
        }
        
    } catch (error) {
        console.error('Sync error:', error);
        showToast('Gagal sinkron: ' + error.message, 'error');
    } finally {
        if (syncBtn) {
            syncBtn.disabled = false;
            syncBtn.innerHTML = '<i class="bi bi-arrow-repeat me-1"></i>Sinkron Sekarang';
        }
    }
}

/**
 * Sembunyikan alert sinkronisasi
 */
function hideSyncNotice() {
    const bar = document.getElementById('syncNoticeBar');
    if (bar) bar.classList.add('d-none');
}
```

### B. Payment Button (Bayar/Selesai & Bayar) - JavaScript:

```javascript
/**
 * Proses pembayaran - Panggil saat tombol "Bayar" atau "Selesai & Bayar" diklik
 */
async function processPayment() {
    const txId = window.currentPaymentTransactionId;
    const total = window.currentPaymentTotal;
    const method = window.currentPaymentMethod; // 'cash' atau 'qris'
    
    if (!txId) {
        showToast('Tidak ada transaksi dipilih', 'error');
        return;
    }
    
    let paidAmount = 0;
    let changeAmount = 0;
    
    // Validasi uang tunai
    if (method === 'cash') {
        const cashInput = document.getElementById('paymentCash');
        paidAmount = parseInt(cashInput?.value?.replace(/[^0-9]/g, '') || '0');
        
        if (paidAmount < total) {
            showToast('Uang tidak cukup!', 'error');
            return;
        }
        
        changeAmount = paidAmount - total;
    } else {
        paidAmount = total;
    }
    
    try {
        // Kirim ke server
        const response = await fetch('api/update_status.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'complete_payment',
                transaction_id: txId,
                paid_amount: paidAmount,
                change_amount: changeAmount,
                payment_method: method,
                total_price: total,
                paid_at: new Date().toISOString()
            })
        });
        
        const result = await response.json();
        
        if (result.status === 'success') {
            // Update local DB
            updateLocalTransaction(txId, 'completed');
            // Refresh UI
            refreshDashboard();
            // Tampilkan sukses
            showSuccessModal();
        }
        
    } catch (error) {
        console.error('Payment error:', error);
        // Fallback: Simpan lokal saja
        updateLocalTransaction(txId, 'completed');
        refreshDashboard();
        showToast('Pembayaran disimpan lokal', 'warning');
    }
}

/**
 * Buka modal pembayaran (untuk tombol Bayar/Selesai & Bayar)
 */
function openPaymentModal(transactionId) {
    const tx = getTransaction(transactionId);
    if (!tx) {
        showToast('Transaksi tidak ditemukan', 'error');
        return;
    }
    
    // Set global state
    window.currentPaymentTransactionId = transactionId;
    window.currentPaymentTotal = calculateTotal(tx);
    window.currentPaymentMethod = 'cash';
    
    // Tampilkan modal
    const modal = new bootstrap.Modal(document.getElementById('paymentModal'));
    modal.show();
}
```

---

## 📋 Example 3: PHP Backend Files

### A. sync.php - Sinkronisasi F&B:

```php
<?php
/**
 * GINOVA - Sync API
 * Menangani sinkronisasi pesanan F&B
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

require_once 'config.php';

try {
    $input = json_decode(file_get_contents('php://input'), true);
    $items = $input['items'] ?? [$input];
    
    $db = getDB();
    $synced = [];
    $failed = [];
    
    $db->beginTransaction();
    
    foreach ($items as $item) {
        try {
            $txId = $item['transaction_id'];
            $prodId = $item['product_id'];
            $qty = $item['qty'];
            
            // Generate ID
            $itemId = $item['item_id'] ?? 'fnb_' . uniqid();
            
            // Get product
            $stmt = $db->prepare("SELECT name, price, stock FROM products WHERE id = ?");
            $stmt->execute([$prodId]);
            $product = $stmt->fetch();
            
            if (!$product || $product['stock'] < $qty) {
                $failed[] = $item;
                continue;
            }
            
            // Insert/Update
            $stmt = $db->prepare("
                INSERT INTO transaction_items 
                (id, transaction_id, product_id, product_name, price, qty, status, is_synced, last_sync_at, created_at)
                VALUES (?, ?, ?, ?, ?, ?, 'active', 1, NOW(), NOW())
            ");
            $stmt->execute([$itemId, $txId, $prodId, $product['name'], $product['price'], $qty]);
            
            // Update stock
            $stmt = $db->prepare("UPDATE products SET stock = stock - ? WHERE id = ?");
            $stmt->execute([$qty, $prodId]);
            
            $synced[] = ['item_id' => $itemId, 'status' => 'synced'];
            
        } catch (Exception $e) {
            $failed[] = $item;
        }
    }
    
    $db->commit();
    
    echo json_encode([
        'status' => 'success',
        'message' => count($synced) . ' items synced',
        'data' => ['synced' => $synced, 'failed' => $failed]
    ]);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
}
```

### B. update_status.php - Update Status Pembayaran:

```php
<?php
/**
 * GINOVA - Update Status API
 * Menangani update status transaksi (pembayaran)
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

require_once 'config.php';

try {
    $input = json_decode(file_get_contents('php://input'), true);
    $action = $input['action'] ?? '';
    
    $db = getDB();
    $db->beginTransaction();
    
    switch ($action) {
        case 'complete_payment':
            $txId = $input['transaction_id'];
            $paidAmount = $input['paid_amount'];
            $changeAmount = $input['change_amount'];
            $paymentMethod = $input['payment_method'];
            $totalPrice = $input['total_price'];
            $paidAt = $input['paid_at'];
            
            // Update transaksi
            $stmt = $db->prepare("
                UPDATE transactions 
                SET status = 'completed', paid_amount = ?, change_amount = ?,
                    payment_method = ?, total_price = ?, paid_at = ?
                WHERE id = ?
            ");
            $stmt->execute([$paidAmount, $changeAmount, $paymentMethod, $totalPrice, $paidAt, $txId]);
            
            // Update console ke available
            $stmt = $db->prepare("
                UPDATE consoles c
                INNER JOIN transactions t ON c.id = t.console_id
                SET c.status = 'available'
                WHERE t.id = ?
            ");
            $stmt->execute([$txId]);
            
            $db->commit();
            
            echo json_encode([
                'status' => 'success',
                'message' => 'Pembayaran berhasil',
                'data' => ['transaction_id' => $txId]
            ]);
            break;
            
        default:
            throw new Exception('Unknown action: ' . $action);
    }
    
} catch (Exception $e) {
    if (isset($db)) $db->rollBack();
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
}
```

---

## 📋 Example 4: PWA Considerations

### Service Worker - Sync when online:

```javascript
// sw.js - Service Worker for PWA

self.addEventListener('sync', event => {
    if (event.tag === 'sync-fnb-orders') {
        event.waitUntil(syncPendingOrders());
    }
});

async function syncPendingOrders() {
    const pending = JSON.parse(localStorage.getItem('ginova_pending_fnb_orders') || '[]');
    
    for (const order of pending) {
        try {
            const response = await fetch('api/sync.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(order)
            });
            
            const result = await response.json();
            
            if (result.status === 'success') {
                // Hapus dari queue
                removeFromPending(order.id);
            }
        } catch (err) {
            console.error('Sync failed:', err);
        }
    }
}

// Di aplikasi utama:
function queueOrderForSync(order) {
    // Simpan ke localStorage
    const pending = JSON.parse(localStorage.getItem('ginova_pending_fnb_orders') || '[]');
    pending.push(order);
    localStorage.setItem('ginova_pending_fnb_orders', JSON.stringify(pending));
    
    // Minta Service Worker untuk sync
    if ('serviceWorker' in navigator && 'sync' in ServiceWorkerRegistration.prototype) {
        navigator.serviceWorker.ready.then(reg => {
            reg.sync.register('sync-fnb-orders');
        });
    }
}
```

---

## 🔧 How to Use These Examples:

1. **Database**: Run the SQL in `ginova_db_fix.sql` to add sync columns

2. **JavaScript**: Include `js/sync-fix.js` in your HTML after other JS files:
   ```html
   <script src="js/sync-fix.js"></script>
   ```

3. **PHP Backend**: Copy `sync.php` and `update_status.php` to your `api/` folder

4. **Test**:
   - Klik "Sinkron Sekarang" - alert harus hilang jika sync berhasil
   - Klik "Bayar" atau "Selesai & Bayar" - modal pembayaran harus muncul dan berfungsi

---

*For complete implementation, see the actual files: ginova_db_fix.sql, api/sync.php, api/update_status.php, js/sync-fix.js*
