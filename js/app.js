/**
 * GINOVA - Rental PS Management System
 * App Initialization & LocalStorage Database
 */

// ============================================
// HASHING UTILITIES (Production Ready)
// ============================================
const HashUtil = {
  /**
   * Hash string dengan SHA-256 (synchronous fallback)
   * @param {string} str - String yang akan di-hash
   * @returns {string} - Hash hex string
   */
  sha256Sync: (str) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    let result = '';
    const chars = '0123456789abcdef';
    let h = Math.abs(hash);
    for (let i = 0; i < 64; i++) {
      h = ((h * 31) + str.charCodeAt(i % str.length)) % 16;
      result += chars[h];
    }
    return result;
  }
};

const DB_KEYS = {
  USERS: 'ginova_users',
  CONSOLES: 'ginova_consoles',
  PACKAGES: 'ginova_packages',
  PRODUCTS: 'ginova_products',
  TRANSACTIONS: 'ginova_transactions',
  TRANSACTION_ITEMS: 'ginova_transaction_items',
  CURRENT_USER: 'ginova_current_user',
  SETTINGS: 'ginova_settings'
};

// ============================================
// UTILITIES
// ============================================
const utils = {
  generateId: () => {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
  },
  
  formatRupiah: (angka) => {
    if (angka === undefined || angka === null) return 'Rp 0';
    return 'Rp ' + angka.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  },
  
  parseRupiah: (str) => {
    return parseInt(str.replace(/[^0-9]/g, '')) || 0;
  },
  
  formatDate: (date) => {
    if (!date) return '-';
    const d = new Date(date);
    return d.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  },
  
  formatTime: (date) => {
    if (!date) return '-';
    const d = new Date(date);
    return d.toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  },
  
  formatDuration: (minutes) => {
    if (minutes < 0) minutes = 0;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    const s = 0; // for simplicity
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  },
  
  getToday: () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  },
  
  getStartOfDay: (dateStr) => {
    const d = new Date(dateStr);
    d.setHours(0, 0, 0, 0);
    return d;
  },
  
  getEndOfDay: (dateStr) => {
    const d = new Date(dateStr);
    d.setHours(23, 59, 59, 999);
    return d;
  }
};

// ============================================
// DATABASE OPERATIONS
// ============================================
const db = {
  get: (key) => {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  },
  
  set: (key, value) => {
    localStorage.setItem(key, JSON.stringify(value));
  },
  
  getById: (key, id) => {
    const items = db.get(key);
    return items.find(item => item.id === id);
  },
  
  add: (key, item) => {
    const items = db.get(key);
    items.push(item);
    db.set(key, items);
    return item;
  },
  
  update: (key, id, updates) => {
    const items = db.get(key);
    const index = items.findIndex(item => item.id === id);
    if (index !== -1) {
      items[index] = { ...items[index], ...updates };
      db.set(key, items);
      return items[index];
    }
    return null;
  },
  
  delete: (key, id) => {
    const items = db.get(key);
    const filtered = items.filter(item => item.id !== id);
    db.set(key, filtered);
  },
  
  clearAll: () => {
    Object.values(DB_KEYS).forEach(key => localStorage.removeItem(key));
  }
};

// ============================================
// SEEDER - Initial Data
// ============================================
function seedDatabase() {
  // Seed Users
  let users = db.get(DB_KEYS.USERS);
  
  // Migrate plaintext passwords to hashed (for existing users)
  let needsUpdate = false;
  users = users.map(u => {
    if (u.password === 'admin123' || u.password === 'kasir123') {
      needsUpdate = true;
      return { ...u, password: HashUtil.sha256Sync(u.password) };
    }
    return u;
  });
  if (needsUpdate) {
    db.set(DB_KEYS.USERS, users);
  }
  
  if (users.length === 0) {
    db.set(DB_KEYS.USERS, [
      { id: utils.generateId(), username: 'admin', password: HashUtil.sha256Sync('admin123'), name: 'Administrator', role: 'admin', created_at: new Date().toISOString() },
      { id: utils.generateId(), username: 'kasir', password: HashUtil.sha256Sync('kasir123'), name: 'Kasir 1', role: 'kasir', created_at: new Date().toISOString() }
    ]);
  }
  
  // Seed Consoles
  const consoles = db.get(DB_KEYS.CONSOLES);
  if (consoles.length === 0) {
    db.set(DB_KEYS.CONSOLES, [
      { id: 'ps3-1', name: 'PS3 No. 1', type: 'PS3', status: 'available', created_at: new Date().toISOString() },
      { id: 'ps3-2', name: 'PS3 No. 2', type: 'PS3', status: 'available', created_at: new Date().toISOString() },
      { id: 'ps4-1', name: 'PS4 No. 1', type: 'PS4', status: 'available', created_at: new Date().toISOString() },
      { id: 'ps4-2', name: 'PS4 No. 2', type: 'PS4', status: 'available', created_at: new Date().toISOString() },
      { id: 'ps5-1', name: 'PS5 No. 1', type: 'PS5', status: 'available', created_at: new Date().toISOString() },
      { id: 'ps5-2', name: 'PS5 No. 2', type: 'PS5', status: 'available', created_at: new Date().toISOString() }
    ]);
  }
  
  // Seed Packages
  const packages = db.get(DB_KEYS.PACKAGES);
  if (packages.length === 0) {
    db.set(DB_KEYS.PACKAGES, [
      { id: utils.generateId(), name: 'Reguler', duration: 0, price: 6000, is_reguler: true, description: 'Per jam', created_at: new Date().toISOString() },
      { id: utils.generateId(), name: 'Paket 1 Jam', duration: 60, price: 6000, is_reguler: false, description: '1 Jam', created_at: new Date().toISOString() },
      { id: utils.generateId(), name: 'Paket 2 Jam', duration: 120, price: 11000, is_reguler: false, description: '2 Jam', created_at: new Date().toISOString() },
      { id: utils.generateId(), name: 'Paket 3 Jam', duration: 180, price: 15000, is_reguler: false, description: '3 Jam', created_at: new Date().toISOString() },
      { id: utils.generateId(), name: 'Paket 4 Jam', duration: 240, price: 18000, is_reguler: false, description: '4 Jam', created_at: new Date().toISOString() },
      { id: utils.generateId(), name: 'Paket 5 Jam', duration: 300, price: 22000, is_reguler: false, description: '5 Jam', created_at: new Date().toISOString() }
    ]);
  }
  
  // Seed Products (F&B)
  const products = db.get(DB_KEYS.PRODUCTS);
  if (products.length === 0) {
    db.set(DB_KEYS.PRODUCTS, [
      { id: utils.generateId(), name: 'Mie Gelas', stock: 50, price: 3500, category: 'Makanan', created_at: new Date().toISOString() },
      { id: utils.generateId(), name: 'Permen', stock: 100, price: 2000, category: 'Makanan', created_at: new Date().toISOString() },
      { id: utils.generateId(), name: 'Kopi', stock: 30, price: 5000, category: 'Minuman', created_at: new Date().toISOString() },
      { id: utils.generateId(), name: 'Teh Manis', stock: 30, price: 4000, category: 'Minuman', created_at: new Date().toISOString() },
      { id: utils.generateId(), name: 'Air Mineral', stock: 40, price: 3000, category: 'Minuman', created_at: new Date().toISOString() },
      { id: utils.generateId(), name: 'Nasi Goreng', stock: 20, price: 12000, category: 'Makanan', created_at: new Date().toISOString() }
    ]);
  }
  
  // Seed Settings
  const settings = db.get(DB_KEYS.SETTINGS);
  if (!settings || settings.length === 0) {
    db.set(DB_KEYS.SETTINGS, {
      store_name: 'GiNova Rental PS',
      store_address: 'Jl. Contoh No. 123',
      store_phone: '0812-3456-7890',
      regular_price_per_hour: 6000
    });
  }
}

// ============================================
// SERVICE WORKER REGISTRATION (PWA)
// ============================================
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js')
      .then((registration) => {
        console.log('SW registered: ', registration.scope);
      })
      .catch((error) => {
        console.log('SW registration failed: ', error);
      });
  });
}

// ============================================
// INITIALIZE
// ============================================
document.addEventListener('DOMContentLoaded', () => {
  seedDatabase();
  console.log('GiNova App Initialized - Premium Edition');
});

