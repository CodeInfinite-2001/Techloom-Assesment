/**
 * API Client for POS Backend with Authentication & LKR Currency Support
 */

const VITE_API_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
const API_BASE = VITE_API_URL ? `${VITE_API_URL}/api` : '/api';

export const TOKEN_KEY = 'pos_auth_token';
export const USER_KEY = 'pos_auth_user';

export function getStoredToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredAuth(token, user) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearStoredAuth() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function getStoredUser() {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/**
 * Global Currency Formatter (LKR)
 */
export function formatLKR(amount) {
  const num = Number(amount) || 0;
  return `LKR ${num.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function getHeaders(extraHeaders = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...extraHeaders,
  };
  const token = getStoredToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

async function handleResponse(response) {
  const data = await response.json().catch(() => ({ message: response.statusText }));
  if (!response.ok) {
    const error = new Error(data.message || data.error || 'An error occurred');
    error.status = response.status;
    error.data = data;
    throw error;
  }
  return data;
}

export const api = {
  // Authentication & User Management
  async login(username, password) {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    const data = await handleResponse(res);
    setStoredAuth(data.token, data.user);
    return data;
  },

  async getMe() {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: getHeaders(),
    });
    return handleResponse(res);
  },

  async getUsers() {
    const res = await fetch(`${API_BASE}/auth/users`, {
      headers: getHeaders(),
    });
    return handleResponse(res);
  },

  async createUser({ username, password, role, name }) {
    const res = await fetch(`${API_BASE}/auth/users`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ username, password, role, name }),
    });
    return handleResponse(res);
  },

  logout() {
    clearStoredAuth();
  },

  // Products
  async getProducts(params = {}) {
    const query = new URLSearchParams(params).toString();
    const res = await fetch(`${API_BASE}/products${query ? `?${query}` : ''}`, {
      headers: getHeaders(),
    });
    return handleResponse(res);
  },

  async createProduct(product) {
    const res = await fetch(`${API_BASE}/products`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(product),
    });
    return handleResponse(res);
  },

  async updateProduct(id, updates) {
    const res = await fetch(`${API_BASE}/products/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(updates),
    });
    return handleResponse(res);
  },

  async deleteProduct(id) {
    const res = await fetch(`${API_BASE}/products/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    return handleResponse(res);
  },

  async seedProducts() {
    const res = await fetch(`${API_BASE}/products/seed`, {
      method: 'POST',
      headers: getHeaders(),
    });
    return handleResponse(res);
  },

  // Orders
  async createOrder({ items, customerName, reservationDurationSec }) {
    const res = await fetch(`${API_BASE}/orders`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ items, customerName, reservationDurationSec }),
    });
    return handleResponse(res);
  },

  async getOrders(params = {}) {
    const query = new URLSearchParams(params).toString();
    const res = await fetch(`${API_BASE}/orders${query ? `?${query}` : ''}`, {
      headers: getHeaders(),
    });
    return handleResponse(res);
  },

  async getOrder(id) {
    const res = await fetch(`${API_BASE}/orders/${id}`, {
      headers: getHeaders(),
    });
    return handleResponse(res);
  },

  async cancelOrder(id, reason) {
    const res = await fetch(`${API_BASE}/orders/${id}/cancel`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ reason }),
    });
    return handleResponse(res);
  },

  async expireOrder(id, reason) {
    const res = await fetch(`${API_BASE}/orders/${id}/expire`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ reason }),
    });
    return handleResponse(res);
  },

  async completeOrder(id, reason) {
    const res = await fetch(`${API_BASE}/orders/${id}/complete`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ reason }),
    });
    return handleResponse(res);
  },

  // Payments
  async processPayment({ orderId, idempotencyKey, paymentMethod, outcome }) {
    const res = await fetch(`${API_BASE}/payments/process`, {
      method: 'POST',
      headers: getHeaders({
        'Idempotency-Key': idempotencyKey,
      }),
      body: JSON.stringify({ orderId, idempotencyKey, paymentMethod, outcome }),
    });
    return handleResponse(res);
  },

  async getPaymentByOrder(orderId) {
    const res = await fetch(`${API_BASE}/payments/order/${orderId}`, {
      headers: getHeaders(),
    });
    return handleResponse(res);
  },

  // Health
  async checkHealth() {
    const res = await fetch(`${API_BASE}/health`);
    return handleResponse(res);
  },
};
