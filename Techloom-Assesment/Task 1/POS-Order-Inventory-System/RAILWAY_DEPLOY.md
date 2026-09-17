# 🚀 Railway Deployment Guide: Frontend, Backend & Database (PostgreSQL)

This guide explains how to host the **POS Order & Inventory System** (React Frontend, Node.js Backend, and PostgreSQL Database) on **[Railway](https://railway.app)**.

---

## 🏗️ Architecture Options

### Option 1: Unified Fullstack + Railway Native PostgreSQL (Recommended ⭐)
- **1 Web Service**: Builds React with Vite, serves both the compiled frontend and Express API on a single port.
- **1 Database Service**: Railway's official 1-click **PostgreSQL** database service.
- **Benefits**:
  - Official first-class database on Railway (zero community Docker templates needed).
  - Included within Railway's free monthly usage credit.
  - Zero CORS configuration, single public domain (`https://*.up.railway.app`).
  - Native ACID transactions and concurrency-safe atomic inventory updates.

```
┌─────────────────────────────────────────────────────────────┐
│                       Railway Project                       │
│                                                             │
│  ┌─────────────────────────┐     DATABASE_URL               │
│  │   Fullstack Service     │ ────────────────────────────── │
│  │  - React Frontend (Vite)│                                │
│  │  - Express.js API       │         ┌───────────────────┐  │
│  │  - Expiry Worker        │         │ Railway PostgreSQL│  │
│  │  - Port 0.0.0.0:$PORT   │         │ (Official Plugin) │  │
│  └─────────────────────────┘         └───────────────────┘  │
│               │                                             │
│               ▼                                             │
│     Public Railway Domain                                   │
│  (https://*.up.railway.app)                                 │
└─────────────────────────────────────────────────────────────┘
```

---

### Option 2: Fullstack Service + Free Cloud Database (Neon.tech / Supabase)
If you want a 100% free forever database without using Railway credits:
- Create a free PostgreSQL instance on [Neon.tech](https://neon.tech) or [Supabase](https://supabase.com).
- Copy your connection string (`postgres://...`) and paste it as `DATABASE_URL` in your Railway web service variables.

---

### Option 3: Zero-Database Embedded Deployment (PGlite)
If you do NOT want to provision any database service on Railway at all:
- Leave `DATABASE_URL` unset.
- The server will automatically use embedded **PGlite** (WASM PostgreSQL).
- You can attach a Railway persistent volume to `/app/data` to persist data across deployments.

---

## 📋 Step-by-Step Deployment (Option 1: Recommended)

### Step 1: Push Your Code to GitHub
Ensure all latest files are committed and pushed:
```bash
git add .
git commit -m "feat: migrate to PostgreSQL for seamless Railway hosting"
git push origin main
```

---

### Step 2: Create a Project on Railway
1. Go to [Railway Dashboard](https://railway.app/dashboard).
2. Click **"+ New Project"**.
3. Select **"Deploy from GitHub repo"** and choose your repository.

---

### Step 3: Add PostgreSQL Database on Railway
1. In your Railway project canvas, click **"+ New"** in the top right.
2. Select **"Database"** ➔ **"Add PostgreSQL"**.
3. Railway instantly provisions a managed PostgreSQL database.
4. Railway automatically creates connection variables, including `DATABASE_URL`.

---

### Step 4: Link PostgreSQL to Your Web Service
1. Click on your **Web Service** card (your GitHub repo) in the Railway canvas.
2. Open the **"Variables"** tab.
3. Click **"+ New Variable"** ➔ **"Add Reference"**.
4. Select `DATABASE_URL` from your PostgreSQL database service.
   *(Alternatively, type `DATABASE_URL` with value `${{Postgres.DATABASE_URL}}`)*.
5. Add optional variables:
   - `NODE_ENV`: `production`
   - `JWT_SECRET`: `your-random-super-secret-jwt-key`
   - `RESERVATION_DURATION_SEC`: `300`
   - `EXPIRY_WORKER_INTERVAL_MS`: `5000`

---

### Step 5: Generate a Public Domain
1. In your Web Service settings, go to the **"Settings"** tab.
2. Scroll down to the **"Networking"** section.
3. Under **"Public Networking"**, click **"Generate Domain"**.
4. Railway will create a secure HTTPS URL (e.g., `https://pos-production.up.railway.app`).

---

### Step 6: Verify Deployment

1. **Check Health Endpoint**:
   Visit:
   ```
   https://<your-railway-domain>/api/health
   ```
   Expected response:
   ```json
   {
     "status": "ok",
     "service": "POS Order & Inventory System"
   }
   ```

2. **Open the Web Application**:
   Navigate to `https://<your-railway-domain>`.
   - The storefront will load with **pre-seeded demo products** automatically populated.
   - Click **"Sign In"** in the header.
   - Default Administrator Credentials:
     - **Username**: `admin`
     - **Password**: `admin123`

3. **Test Concurrency & Reservation**:
   - Open the **"⚡ Concurrency Simulator"** tab in the UI.
   - Run 20 simultaneous concurrent orders on a product with 5 stock.
   - Confirm exactly 5 succeed and 15 receive out-of-stock without negative inventory!

---

## 🐳 Alternative: Local / VPS Docker Compose

To test locally with PostgreSQL using Docker Compose:

```bash
# Build and run the entire stack (App + PostgreSQL)
docker compose up --build -d

# Check running containers
docker compose ps

# Access application
# Frontend + Backend: http://localhost:5000
# Health check:       http://localhost:5000/api/health
# PostgreSQL:         localhost:5432
```
