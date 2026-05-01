/**
 * GINOVA - Authentication & Role Management
 * Premium Edition - Production Ready
 */

/**
 * GINOVA - Authentication & Role Management
 * Premium Edition - Production Ready
 * 
 * NOTE: HashUtil didefinisikan di app.js (di-load sebelum auth.js)
 */

const Auth = {
  // Brute-force protection
  failedAttempts: new Map(),

  // Get current logged in user
  getCurrentUser: () => {
    try {
      const user = localStorage.getItem(DB_KEYS.CURRENT_USER);
      return user ? JSON.parse(user) : null;
    } catch (e) {
      console.error('Auth error: Failed to parse user', e);
      return null;
    }
  },

  // Login (async - production ready)
  login: async (username, password) => {
    if (!username || !password) {
      return { success: false, message: 'Username dan password wajib diisi!' };
    }

    // Check brute-force
    const attempts = Auth.failedAttempts.get(username) || 0;
    if (attempts >= 5) {
      return { success: false, message: 'Terlalu banyak percobaan login gagal. Coba lagi nanti.' };
    }

    const users = db.get(DB_KEYS.USERS);
    // Hash password input untuk dibandingkan
    const hashedPassword = await HashUtil.sha256(password);
    const user = users.find(u => u.username === username && u.password === hashedPassword);

    if (user) {
      Auth.failedAttempts.delete(username); // Reset on success
      try {
        localStorage.setItem(DB_KEYS.CURRENT_USER, JSON.stringify(user));
        return { success: true, user };
      } catch (e) {
        console.error('Auth error: Failed to save session', e);
        return { success: false, message: 'Gagal menyimpan sesi. Penyimpanan penuh?' };
      }
    }
    // Increment failed attempts
    Auth.failedAttempts.set(username, attempts + 1);
    return { success: false, message: 'Username atau password salah!' };
  },

  // Synchronous login wrapper (for compatibility with inline scripts)
  loginSync: (username, password) => {
    if (!username || !password) {
      return { success: false, message: 'Username dan password wajib diisi!' };
    }

    // FIXED: Check dependencies first
    if (typeof db === 'undefined' || typeof DB_KEYS === 'undefined') {
      console.error('[Auth.loginSync] Missing app.js - DB not loaded');
      return { success: false, message: 'Sistem belum siap. Refresh halaman.' };
    }

    const attempts = Auth.failedAttempts.get(username) || 0;
    if (attempts >= 5) {
      return { success: false, message: 'Terlalu banyak percobaan. Tunggu 5 menit.' };
    }

    const users = db.get(DB_KEYS.USERS);
    if (!users || !Array.isArray(users)) {
      console.warn('[Auth.loginSync] No users found - run seedDatabase()');
      return { success: false, message: 'Data pengguna tidak ditemukan. Refresh.' };
    }

// FIXED: Match precomputed SHA256 hashes (same algo as seed)
    const hashedPassword = HashUtil.sha256Sync(password);
    console.log('[Auth] Input hash for', password, ':', hashedPassword);
    console.log('[Auth] Stored users:', JSON.stringify(users));
    
    const user = users.find(u => u.username === username && u.password === hashedPassword);
    console.log('[Auth] User match:', !!user, '| Found user:', user ? user.username : 'none');

    if (user) {
      Auth.failedAttempts.delete(username);
      try {
        localStorage.setItem(DB_KEYS.CURRENT_USER, JSON.stringify(user));
        console.log('[Auth] ✅ Session saved for', username);
        return { success: true, user };
      } catch (e) {
        console.error('Auth error: Failed to save session', e);
        return { success: false, message: 'Gagal simpan sesi.' };
      }
    }
    
    Auth.failedAttempts.set(username, attempts + 1);
    console.log('[Auth] ❌ Login failed:', username);
    return { success: false, message: 'Username/password salah! Cek demo creds.' };
  },


  // Logout
  logout: () => {
    try {
      localStorage.removeItem(DB_KEYS.CURRENT_USER);
    } catch (e) {
      console.error('Auth error: Failed to clear session', e);
    }
    window.location.href = 'index.html';
  },

  // Check if logged in
  isLoggedIn: () => {
    return !!Auth.getCurrentUser();
  },

  // Check role
  hasRole: (role) => {
    const user = Auth.getCurrentUser();
    return user && user.role === role;
  },

  // FIXED Protect: Safe against DB missing, delayed check
  protect: (allowedRoles = []) => {
    // Safety check
    if (typeof DB_KEYS === 'undefined') {
      console.warn('[Auth.protect] DB_KEYS missing - app.js not loaded');
      setTimeout(() => Auth.protect(allowedRoles), 500);
      return false;
    }

    const user = Auth.getCurrentUser();
    console.log('[Auth.protect] User:', user?.username || 'NO SESSION');

    if (!user) {
      console.log('[Auth.protect] ❌ No session - redirect to login');
      window.location.replace('index.html?reason=no-session');
      return false;
    }

    if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
      console.log('[Auth.protect] ❌ Wrong role:', user.role, 'need:', allowedRoles);
      if (user.role === 'admin') {
        window.location.replace('admin.html');
      } else {
        window.location.replace('dashboard.html');
      }
      return false;
    }

    console.log('[Auth.protect] ✅ OK role:', user.role);
    return true;
  },


  // Update UI based on role
  updateUI: () => {
    const user = Auth.getCurrentUser();
    if (!user) return;

    // Update navbar user info
    const userNameEl = document.getElementById('userName');
    const userRoleEl = document.getElementById('userRole');

    if (userNameEl) userNameEl.textContent = user.name || user.username;
    if (userRoleEl) userRoleEl.textContent = user.role === 'admin' ? 'Administrator' : 'Kasir';

    // Update page title with user name
    const pageTitle = document.title;
    if (pageTitle && !pageTitle.includes(user.name)) {
      // Optional: append username to title for personalization
    }

    // Hide/show elements based on role
    const adminOnlyElements = document.querySelectorAll('.admin-only');
    adminOnlyElements.forEach(el => {
      if (el) el.style.display = user.role === 'admin' ? '' : 'none';
    });

    const kasirOnlyElements = document.querySelectorAll('.kasir-only');
    kasirOnlyElements.forEach(el => {
      if (el) el.style.display = user.role === 'kasir' ? '' : 'none';
    });
  }
};

// Auto-protect on DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
  // Handle logout buttons
  document.querySelectorAll('.btn-logout').forEach(btn => {
    if (btn) {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        if (confirm('Yakin ingin keluar?')) {
          Auth.logout();
        }
      });
    }
  });
});

