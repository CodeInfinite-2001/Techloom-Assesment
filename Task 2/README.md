# CYBERSTORE // Next-Gen Checkout & Payment Engine

An end-to-end e-commerce store and payment resilience simulation built with **Node.js, Express, React (Vite)**, and **Tailwind CSS**. Designed with a **futuristic Black & Neon Green glassmorphism aesthetic** and architected for **zero-configuration 1-click deployment on Railway**.

---

## 🌟 Key Highlights & Evaluation Criteria

### 1. Product Discovery
- **Live Search & Multi-Criteria Filtering**: Filter by category (Audio, Wearables, Computing, Storage, Gaming, Accessories), price range slider, and an "In Stock Only" toggle.
- **Product Details View**: Comprehensive modal featuring high-resolution imagery, full technical specifications, real-time warehouse inventory indicators, and instant checkout triggers.

### 2. Cart & Atomic Stock Reservation
- **Exclusive 10-Minute Reservation Hold**: Items in the cart are atomically reserved the moment the customer enters checkout (`RESERVED` status with TTL countdown).
- **Over-Reservation & Concurrency Protection**: Multiple shoppers cannot reserve the same limited inventory simultaneously.
- **Automated Sweeper**: Expired reservations are automatically released by a background worker every 20 seconds, returning stock to the store.

### 3. Mock Payment Gateway & Fault Simulation
Interactive gateway sandbox embedded directly in the checkout modal:
- 🟢 **Success (HTTP 200)**: Simulates approved transaction, permanently deducts reserved stock, issues unique transaction ID (`tx_live_...`), and triggers confetti receipt.
- 🔴 **Card Declined / Failure (HTTP 402)**: Simulates insufficient funds or invalid card, records `FAILED` status, and **immediately restores held stock to store inventory**.
- 🟡 **Gateway Timeout (HTTP 504)**: Simulates network drop or slow response, retains the active 10-minute hold, and allows the customer to retry.
- ⚡ **Duplicate Payment Prevention (Idempotency Guard)**:
  - Generates unique idempotency keys per transaction.
  - Prevents rapid double-clicks or duplicate requests from double-charging or creating duplicate orders.
  - Includes an interactive **"Test Concurrent Duplicate Clicks"** button in checkout to prove idempotency handling in real time.

### 4. Post-Purchase Flow & Refund Simulation
- **Order History Dashboard**: Displays real-time status transitions (`PAID`, `PENDING_PAYMENT`, `FAILED`, `CANCELLED`, `REFUNDED`).
- **Simulated Refund & Stock Restitution**:
  - Customers can cancel paid orders with a single click.
  - Generates a simulated refund record (`ref_...`), sets status to `REFUNDED`, and **instantly restores purchased quantities back into available store stock**.

---

## 🎨 Glassmorphism & Cyber Black/Green Theme
- **Backdrop**: Deep obsidian black (`#030706`) with ambient neon emerald gradients.
- **Glass Surfaces**: `backdrop-blur-xl`, semi-transparent frosted panels (`rgba(8, 16, 12, 0.7)`), and thin emerald glowing borders (`border-emerald-500/25`).
- **Typography & Accents**: High-contrast typography paired with JetBrains Mono, cyber status badges, and neon button glows.

---

## 🚀 How to Run Locally

### Prerequisites
- Node.js (v18 or higher)
- npm

### 1. Clone & Install
```bash
# Install root server dependencies
npm install

# Build the client application
npm run build
```

### 2. Start Application
```bash
npm start
```
The server will start at: **`http://localhost:5050`** (serving both the REST API and the React client).

### 3. Run Automated Integration Verification
```bash
npm run test:verify
```
Runs an end-to-end test suite testing:
- Catalog reset and search
- Stock reservation hold
- Idempotency duplicate attack prevention
- Order cancellation and refund stock restitution
- Payment failure stock release
- 504 Gateway timeout recovery

---

## 🚆 Deploy to Railway (1-Click Ready)

This repository is optimized for **Railway's single-service deployment**:
1. Push this repository to GitHub.
2. Log into [Railway.app](https://railway.app) and click **"New Project"** -> **"Deploy from GitHub repo"**.
3. Select your repository.
4. Railway will automatically detect `railway.json`, run `npm run build`, and start with `npm start`.
5. *(Optional)* If you want to connect an external database:
   - Add a MongoDB plugin on Railway or supply `MONGODB_URI` in the Railway environment variables.
   - If omitted, the application uses its built-in transactional persistent database with zero extra configuration or cost!

---

## 📡 REST API Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Service health status |
| `GET` | `/api/products` | Search & filter products (`?search=`, `?category=`, `?minPrice=`, `?maxPrice=`, `?inStock=`) |
| `GET` | `/api/products/:id` | Single product detail with real-time available stock |
| `POST` | `/api/checkout/reserve` | Initiates 10-minute atomic stock reservation |
| `GET` | `/api/checkout/session/:id` | Get reservation countdown & status |
| `POST` | `/api/checkout/release/:id` | Early manual release of stock hold |
| `POST` | `/api/checkout/pay` | Mock payment gateway with idempotency key & simulation modes |
| `GET` | `/api/orders` | Order history list with status filtering |
| `GET` | `/api/orders/:id` | Order receipt & transaction details |
| `POST` | `/api/orders/:id/cancel` | Process order cancellation & simulated refund with stock restitution |
| `POST` | `/api/admin/reset` | Resets stock levels to default demo values |
