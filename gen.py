import os, re

os.makedirs("img", exist_ok=True)

svg = '''<svg width="120" height="40" viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#4facfe;stop-opacity:1"/>
      <stop offset="100%" style="stop-color:#7117ea;stop-opacity:1"/>
    </linearGradient>
    <filter id="glow">
      <feGaussianBlur stdDeviation="2.5" result="coloredBlur"/>
      <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>
  <path d="M140 100 Q140 70 200 70 Q260 70 260 100 L280 150 Q280 170 240 170 L220 150 L180 150 L160 170 Q120 170 120 150 Z" fill="none" stroke="url(#grad1)" stroke-width="8" filter="url(#glow)"/>
  <path d="M185 105 L210 160 L245 80" fill="none" stroke="#00f2ff" stroke-width="10" stroke-linecap="round" filter="url(#glow)"/>
  <text x="200" y="220" font-family="Arial,sans-serif" font-weight="bold" font-size="42" fill="url(#grad1)" text-anchor="middle" style="letter-spacing:2px">GINOVA</text>
  <text x="200" y="250" font-family="Verdana" font-size="12" fill="#ffffff" text-anchor="middle" style="letter-spacing:4px">PLAYSTATION RENTAL</text>
  <line x1="130" y1="265" x2="175" y2="265" stroke="#4facfe" stroke-width="2"/>
  <text x="200" y="270" font-family="Arial" font-size="10" fill="#4facfe" text-anchor="middle">RENTAL PS</text>
  <line x1="225" y1="265" x2="270" y2="265" stroke="#4facfe" stroke-width="2"/>
</svg>'''

with open("img/ginova-logo.svg", "w", encoding="utf-8") as f:
    f.write(svg)

lines = []
indent = 0
def add(tag, text=None):
    global indent
    if tag.startswith("/"):
        indent -= 1
        lines.append("  " * indent + "<" + tag + ">")
    elif tag.endswith("/"):
        lines.append("  " * indent + "<" + tag + ">")
    else:
        lines.append("  " * indent + "<" + tag + ">")
        indent += 1
    if text:
        lines[-1] = lines[-1].replace(">", ">" + text)

def raw(text):
    lines.append("  " * indent + text)

# HTML
add("!DOCTYPE html")
add('html lang="id"')
add("head")
raw('<meta charset="UTF-8">')
raw('<meta name="viewport" content="width=device-width, initial-scale=1.0">')
raw('<title>Dashboard | GiNova Rental PS</title>')
raw('<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">')
raw('<link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.1/font/bootstrap-icons.css" rel="stylesheet">')
raw('<link rel="stylesheet" href="css/style.css">')
add("/head")
add("body")

# Navbar
add('nav class="navbar navbar-expand-lg navbar-ginova sticky-top"')
add('div class="container-fluid px-4"')
raw('<a class="navbar-brand fw-bold d-flex align-items-center" href="#">')
raw('  <img src="img/ginova-logo.svg" alt="GiNova" height="36" class="me-2">')
raw('  <span>GiNova</span>')
raw('</a>')
raw('<button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav">')
raw('  <span class="navbar-toggler-icon"></span>')
raw('</button>')
add('div class="collapse navbar-collapse" id="navbarNav"')
add('ul class="navbar-nav me-auto"')
raw('<li class="nav-item"><a class="nav-link active" href="dashboard.html"><i class="bi bi-speedometer2 me-1"></i>Dashboard</a></li>')
raw('<li class="nav-item admin-only"><a class="nav-link" href="admin.html"><i class="bi bi-gear me-1"></i>Admin Panel</a></li>')
add("/ul")
add('ul class="navbar-nav"')
add('li class="nav-item dropdown"')
raw('<a class="nav-link dropdown-toggle" href="#" data-bs-toggle="dropdown">')
raw('  <i class="bi bi-person-circle me-1"></i><span id="userName">User</span>')
raw('</a>')
add('ul class="dropdown-menu dropdown-menu-end"')
raw('<li><span class="dropdown-item-text text-muted small">Role: <span id="userRole">-</span></li>')
raw('<li><hr class="dropdown-divider"></li>')
raw('<li><a class="dropdown-item text-danger btn-logout" href="#"><i class="bi bi-box-arrow-right me-2"></i>Keluar</a></li>')
add("/ul")
add("/li")
add("/ul")
add("/div")
add("/div")
add("/nav")

# Main Content
add('div class="container-fluid px-4 py-4"')

# Stats Row
add('div class="row g-3 mb-4"')
stats = [
    ('primary','statTotalConsoles','0','bi-controller','Total Unit PS'),
    ('warning','statActiveSessions','0','bi-play-circle','Sesi Aktif'),
    ('info','statAvailableCount','0','bi-check-circle','Tersedia'),
    ('primary','statTodayRevenue','Rp 0','bi-cash-stack','Omzet Hari Ini')
]
for cls, sid, val, icon, label in stats:
    add('div class="col-md-3 col-sm-6"')
    add('div class="stat-card ' + cls + '"')
    raw('<div class="stat-value" id="' + sid + '">' + val + '</div>')
    raw('<div class="stat-label"><i class="bi ' + icon + ' me-1"></i>' + label + '</div>')
    add("/div")
    add("/div")
add("/div")

# Consoles Grid
add('div class="row mb-4"')
add('div class="col-12"')
add('div class="gn-card"')
add('div class="gn-card-header d-flex justify-content-between align-items-center"')
raw('<h5 class="mb-0 fw-bold"><i class="bi bi-grid-3x3-gap me-2 text-success"></i>Status Unit PS</h5>')
raw('<div>')
raw('  <span class="badge bg-success me-2"><i class="bi bi-circle-fill me-1 small"></i>Tersedia</span>')
raw('  <span class="badge bg-warning text-dark"><i class="bi bi-circle-fill me-1 small"></i>Terpakai</span>')
raw('</div>')
add("/div")
add('div class="card-body"')
add('div class="row g-3" id="consolesGrid"')
add("/div")
add("/div")
add("/div")
add("/div")
add("/div")

# Active Transactions
add('div class="row"')
add('div class="col-12"')
add('div class="gn-card"')
add('div class="gn-card-header"')
raw('<h5 class="mb-0 fw-bold"><i class="bi bi-list-check me-2 text-success"></i>Transaksi Berjalan</h5>')
add("/div")
add('div class="card-body p-0"')
add('div class="table-responsive"')
add('table class="table gn-table mb-0"')
add("thead")
add("tr")
raw('<th>Unit</th><th>Paket</th><th>Mulai</th><th>Timer</th><th>F&amp;B</th><th>Total</th><th class="text-center">Aksi</th>')
add("/tr")
add("/thead")
add('tbody id="activeTransactionsTable"')
add("/tbody")
add("/table")
add("/div")
add("/div")
add("/div")
add("/div")
add("/div")

# Modal helper
def modal(mid, title, icon, body, footer):
    add('div class="modal fade modal-gn" id="' + mid + '" tabindex="-1"')
    add('div class="modal-dialog modal-dialog-centered"')
    add('div class="modal-content"')
    add('div class="modal-header"')
    raw('<h5 class="modal-title fw-bold"><i class="bi ' + icon + ' me-2 text-success"></i>' + title + '</h5>')
    raw('<button type="button" class="btn-close" data-bs-dismiss="modal"></button>')
    add("/div")
    add('div class="modal-body"')
    raw(body)
    add("/div")
    if footer:
        add('div class="modal-footer"')
        raw(footer)
        add("/div")
    add("/div")
    add("/div")
    add("/div")

# Start Billing Modal
modal('startBillingModal','Mulai Billing','bi-play-circle',
'<form id="startBillingForm"><input type="hidden" id="billingConsoleId"><div class="mb-3"><label class="form-label fw-semibold">Unit PS</label><input type="text" class="form-control form-control-gn" id="billingConsoleName" readonly></div><div class="mb-3"><label class="form-label fw-semibold">Pilih Paket</label><select class="form-select form-control-gn" id="billingPackage" required><option value="">-- Pilih Paket --</option></select></div><div class="alert alert-info" id="packageInfo" style="display:none;"><small><i class="bi bi-info-circle me-1"></i><span id="packageDesc">-</span></small></div></form>',
'<button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Batal</button><button type="button" class="btn btn-gn-primary" id="btnStartBilling"><i class="bi bi-play-fill me-1"></i>Mulai</button>')

# Add FnB Modal
modal('addFnBModal','Tambah F&amp;B','bi-cup-hot',
'<form id="addFnBForm"><input type="hidden" id="fnbTransactionId"><div class="mb-3"><label class="form-label fw-semibold">Pilih Produk</label><select class="form-select form-control-gn" id="fnbProduct" required><option value="">-- Pilih Produk --</option></select></div><div class="mb-3"><label class="form-label fw-semibold">Jumlah</label><input type="number" class="form-control form-control-gn" id="fnbQty" min="1" value="1" required></div><div class="alert alert-light border" id="fnbInfo" style="display:none;"><div class="d-flex justify-content-between"><small>Harga: <span id="fnbPrice" class="fw-bold">-</span></small><small>Stok: <span id="fnbStock" class="fw-bold">-</span></small></div></form>',
'<button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Batal</button><button type="button" class="btn btn-gn-primary" id="btnAddFnB"><i class="bi bi-plus-lg me-1"></i>Tambah</button>')

# Payment Modal
add('div class="modal fade modal-gn" id="paymentModal" tabindex="-1"')
add('div class="modal-dialog modal-dialog-centered"')
add('div class="modal-content"')
add('div class="modal-header"')
raw('<h5 class="modal-title fw-bold"><i class="bi bi-cash-coin me-2 text-success"></i>Pembayaran</h5>')
raw('<button type="button" class="btn-close" data-bs-dismiss="modal"></button>')
add("/div")
add('div class="modal-body"')
raw('<input type="hidden" id="paymentTransactionId">')
raw('<div class="receipt mb-3" id="paymentReceipt">')
raw('  <div class="receipt-header"><h5>GiNova Rental PS</h5><small class="text-muted" id="receiptDate">-</small></div>')
raw('  <div class="receipt-line"><span>Unit:</span><span id="receiptConsole">-</span></div>')
raw('  <div class="receipt-line"><span>Paket:</span><span id="receiptPackage">-</span></div>')
raw('  <div class="receipt-line"><span>Mulai:</span><span id="receiptStart">-</span></div>')
raw('  <div class="receipt-line"><span>Durasi:</span><span id="receiptDuration">-</span></div>')
raw('  <div class="receipt-line"><span>Harga PS:</span><span id="receiptBasePrice">Rp 0</span></div>')
raw('  <div class="receipt-line"><span>F&amp;B:</span><span id="receiptFnB">Rp 0</span></div>')
raw('  <div id="receiptItems"></div>')
raw('  <div class="receipt-line receipt-total"><span>TOTAL</span><span id="receiptTotal">Rp 0</span></div>')
raw('</div>')
raw('<div class="mb-3">')
raw('  <label class="form-label fw-semibold">Metode Pembayaran</label>')
raw('  <div class="d-grid gap-2">')
raw('    <button type="button" class="btn btn-outline-success active" id="btnPayCash" onclick="selectPaymentMethod(\'cash\')"><i class="bi bi-cash-stack me-2"></i>Bayar Cash</button>')
raw('    <button type="button" class="btn btn-outline-primary" id="btnPayQRIS" onclick="selectPaymentMethod(\'qris\')"><i class="bi bi-qr-code me-2"></i>Bayar via QRIS</button>')
raw('  </div>')
raw('</div>')
raw('<div id="cashPaymentForm">')
raw('  <div class="mb-3"><label class="form-label fw-semibold">Total Tagihan</label><input type="text" class="form-control form-control-gn fw-bold text-success" id="paymentTotal" readonly></div>')
raw('  <div class="mb-3"><label class="form-label fw-semibold">Uang Diterima</label><input type="number" class="form-control form-control-gn" id="paymentCash" placeholder="Masukkan jumlah uang" required></div>')
raw('  <div class="alert alert-success" id="paymentChangeBox" style="display:none;"><div class="d-flex justify-content-between align-items-center"><span><i class="bi bi-cash-stack me-1"></i>Kembalian:</span><span class="fw-bold fs-5" id="paymentChange">Rp 0</span></div>')
raw('</div>')
raw('<div id="qrisPaymentForm" style="display:none;">')
raw('  <div class="text-center">')
raw('    <div class="mb-3"><label class="form-label fw-semibold">Total Tagihan</label><input type="text" class="form-control form-control-gn fw-bold text-primary text-center" id="qrisPaymentTotal" readonly></div>')
raw('    <button type="button" class="btn btn-primary btn-lg" onclick="displayQRCode()"><i class="bi bi-qr-code me-2"></i>Tampilkan QRIS</button>')
raw('  </div>')
raw('</div>')
add("/div")
add('div class="modal-footer"')
raw('<button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Batal</button>')
raw('<button type="button" class="btn btn-outline-success no-print" id="btnPrintReceipt"><i class="bi bi-printer me-1"></i>Cetak</button>')
raw('<button type="button" class="btn btn-gn-primary" id="btnCompletePayment"><i class="bi bi-check-lg me-1"></i>Selesai</button>')
add("/div")
add("/div")
add("/div")
add("/div")

# QRIS Modal
add('div class="modal fade modal-gn" id="qrisModal" tabindex="-1" data-bs-backdrop="static"')
add('div class="modal-dialog modal-dialog-centered"')
add('div class="modal-content"')
add('div class="modal-header bg-primary text-white"')
raw('<h5 class="modal-title fw-bold"><i class="bi bi-qr-code me-2"></i>Pembayaran QRIS - GiNova</h5>')
raw('<button type="button" class="btn-close btn-close-white" onclick="closeQRISModal()"></button>')
add("/div")
add('div class="modal-body text-center"')
raw('<div class="mb-3"><h6 class="fw-bold">Scan QR Code dengan aplikasi DANA</h6><p class="text-muted mb-0">Total: <span id="qrisAmount" class="fw-bold text-primary fs-5">Rp 0</span></p></div>')
raw('<div class="d-flex justify-content-center mb-3">')
raw('  <div class="p-3 border rounded bg-white text-center" style="display:inline-block;">')
raw('    <img src="qris.jpeg" alt="QRIS ASEP GINANJAR" class="img-fluid" style="max-width:280px;border-radius:8px;">')
raw('    <div class="mt-3 pt-3 border-top">')
raw('      <div class="fw-bold fs-5 text-dark">ASEP GINANJAR</div>')
raw('      <div class="text-muted small font-monospace bg-light px-2 py-1 rounded d-inline-block mt-1">NMID: ID1021144125403</div>')
raw('    </div>')
raw('  </div>')
raw('</div>')
raw('<div class="alert alert-info"><i class="bi bi-info-circle me-2"></i><small>Scan QR code ini dengan aplikasi DANA Anda. Pembayaran akan diproses otomatis.</small></div>')
raw('<div id="qrisPaymentStatus" class="mt-3">')
raw('  <div class="spinner-border text-primary me-2" role="status"><span class="visually-hidden">Loading...</span></div>')
raw('  <span class="text-muted">Menunggu pembayaran...</span>')
raw('</div>')
raw('<div class="mt-3"><button type="button" class="btn btn-sm btn-outline-secondary" onclick="simulateQRISSuccess()"><i class="bi bi-check-circle me-1"></i>Simulasikan Pembayaran Berhasil</button></div>')
add("/div")
add("/div")
add("/div")
add("/div")

# Success Modal
add('div class="modal fade modal-gn" id="successModal" tabindex="-1" data-bs-backdrop="static"')
add('div class="modal-dialog modal-dialog-centered"')
add('div class="modal-content"')
add('div class="modal-header bg-success text-white"')
raw('<h5 class="modal-title fw-bold"><i class="bi bi-check-circle-fill me-2"></i>Pembayaran Berhasil</h5>')
add("/div")
add('div class="modal-body text-center py-4"')
raw('<div class="mb-3"><i class="bi bi-check-circle-fill text-success" style="font-size:4rem;"></i></div>')
raw('<h4 class="fw-bold text-success mb-2">Pembayaran GiNova Berhasil!</h4>')
raw('<p class="text-muted mb-0">Terima kasih sudah bermain.</p>')
raw('<p class="text-muted">Semoga harimu menyenangkan!</p>')
raw('<div class="alert alert-light border mt-3"><small class="text-muted"><i class="bi bi-info-circle me-1"></i>Auto-transfer ke rekening bank telah diaktifkan.</small></div>')
add("/div")
add('div class="modal-footer justify-content-center"')
raw('<button type="button" class="btn btn-gn-primary btn-lg" onclick="closeSuccessModal()"><i class="bi bi-check-lg me-1"></i>OK</button>')
add("/div")
add("/div")
add("/div")
add("/div")

# Scripts
raw('<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"></script>')
raw('<script src="js/app.js"></script>')
raw('<script src="js/auth.js"></script>')
raw('<script src="js/dashboard.js"></script>')
raw('<script>Auth.protect([\'kasir\',\'admin\']);Auth.updateUI();</script>')

add("/body")
add("/html")

html = "\n".join(lines)

with open("dashboard.html", "w", encoding="utf-8") as f:
    f.write(html)

# Verify
open_div = html.count("<div")
close_div = html.count("</div>")
depth = 0
max_depth = 0
line_issues = []
for i, line in enumerate(lines, 1):
    o = len(re.findall(r'<div[>\s]', line))
    c = len(re.findall(r'</div>', line))
    depth += o - c
    if depth > max_depth:
        max_depth = depth
    if depth < 0:
        line_issues.append(f"Line {i}: negative depth")

print(f"HTML written: open={open_div} close={close_div} diff={open_div-close_div}")
print(f"Max nesting: {max_depth}")
print(f"Final depth: {depth}")
print(f"Issues: {line_issues[:5] if line_issues else 'None'}")
print(f"Total lines: {len(lines)}")
