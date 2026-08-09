# ==========================================
# STAGE 1: Build & Dependencies (Development/Build)
# ==========================================
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Salin file package untuk caching layer yang efisien
COPY package*.json ./

# Install SELURUH dependencies (termasuk devDependencies jika butuh build/compile TypeScript)
RUN npm ci

# Salin seluruh kode aplikasi
COPY . .

# Jika menggunakan TypeScript atau butuh build step, aktifkan baris berikut:
# RUN npm run build

# Hapus devDependencies agar tersisa hanya production dependencies
RUN npm prune --production


# ==========================================
# STAGE 2: Production Image (Final & Light)
# ==========================================
FROM node:20-alpine AS runner

WORKDIR /app

# Atur environment ke production
ENV NODE_ENV=production

# Keamanan: Buat user non-root agar container tidak berjalan sebagai root
USER node

# Salin hanya file package dan folder node_modules dari Stage 1
COPY --chown=node:node package*.json ./
COPY --chown=node:node --from=builder /app/node_modules ./node_modules

# Salin berkas/kode aplikasi yang sudah siap dari Stage 1
COPY --chown=node:node --from=builder /app ./
# (Catatan: Jika pakai TypeScript, salin folder dist/ hasil compile: COPY --from=builder /app/dist ./dist)

# Buka port aplikasi (misal port 3000)
EXPOSE 3000

# Jalankan aplikasi Node.js
CMD ["node", "index.js"]