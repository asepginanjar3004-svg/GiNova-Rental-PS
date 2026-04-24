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

  // Login
  login: (username, password) => {
    if (!username || !password) {
      return { success: false, message: 'Username dan password wajib diisi!' };
    }

    const users = db.get(DB_KEYS.USERS);
    // Hash password input untuk dibandingkan
    const hashedPassword = HashUtil.sha256Sync(password);
    const user = users.find(u => u.username === username && u.password === hashedPassword);

    if (user) {
      try {
        localStorage.setItem(DB_KEYS.CURRENT_USER, JSON.stringify(user));
        return { success: true, user };
      } catch (e) {
        console.error('Auth error: Failed to save session', e);
        return { success: false, message: 'Gagal menyimpan sesi. Penyimpanan penuh?' };
      }
    }
    return { success: false, message: 'Username atau password salah!' };
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

  // Protect page - redirect if not authorized
  protect: (allowedRoles = []) => {
    const user = Auth.getCurrentUser();

    if (!user) {
      window.location.replace('index.html');
      return false;
    }

    if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
      // Redirect based on role
      if (user.role === 'admin') {
        window.location.replace('admin.html');
      } else {
        window.location.replace('dashboard.html');
      }
      return false;
    }

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

