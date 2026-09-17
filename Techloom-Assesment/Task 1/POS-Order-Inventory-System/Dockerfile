# ===================================================
# Multi-stage Dockerfile for POS Order & Inventory System
# Designed for Railway, Render, and Docker environments
# ===================================================

# --- Stage 1: Build React Frontend (SPA) ---
FROM node:20-alpine AS frontend-builder
WORKDIR /app/client

# Install frontend dependencies
COPY client/package*.json ./
RUN npm install

# Copy frontend source and build production assets
COPY client/ ./
RUN npm run build

# --- Stage 2: Production Node.js Server ---
FROM node:20-alpine
WORKDIR /app

# Install server production dependencies only
COPY server/package*.json ./server/
RUN cd server && npm install --omit=dev

# Copy backend source code
COPY server/ ./server/

# Copy compiled React frontend assets from Stage 1 into client/dist
COPY --from=frontend-builder /app/client/dist ./client/dist

# Set production environment defaults (Railway injects $PORT at runtime)
ENV PORT=5000
ENV NODE_ENV=production

EXPOSE 5000

# Start server (listens on 0.0.0.0:$PORT)
CMD ["node", "server/src/server.js"]
