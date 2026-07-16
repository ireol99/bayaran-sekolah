# 🚀 Panduan Deployment Ke Ubuntu Server

Dokumen ini menjelaskan langkah-langkah mudah untuk men-deploy backend **Aplikasi Bayaran Madrasah** ke server Ubuntu Linux.

---

## Opsi 1: Deployment Menggunakan Docker Compose (Direkomendasikan & Paling Mudah)

Metode ini akan menjalankan **PostgreSQL**, **Redis**, dan **Backend App** secara otomatis dalam container Docker yang terisolasi.

### Step 1: Install Docker & Docker Compose di Ubuntu Server
```bash
# Update package list
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com | sh

# Tambahkan user saat ini ke group docker agar tidak perlu `sudo`
sudo usermod -aG docker $USER
newgrp docker

# Verifikasi instalasi Docker
docker --version
docker compose version
```

### Step 2: Clone Repository & Masuk ke Folder Backend
```bash
git clone <URL_REPOSITORY_ANDA>
cd bayaran_bun/backend
```

### Step 3: Jalankan Aplikasi
```bash
# Buat file .env dari template
cp .env.example .env

# Build dan jalankan seluruh service di background
docker compose up -d --build
```

### Step 4: Jalankan Migration & Seed Data Awal
```bash
# Push skema database ke PostgreSQL container
docker compose exec backend bun run db:push

# Seed data superadmin & master data awal
docker compose exec backend bun run db:seed
```

Selesai! Aplikasi backend sekarang sudah berjalan di `http://IP_SERVER_ANDA:3000`.  
Dokumentasi API Swagger dapat diakses di `http://IP_SERVER_ANDA:3000/swagger`.

---

## Opsi 2: Deployment Manual Menggunakan PM2 / Systemd (Tanpa Docker App)

Jika Anda sudah memiliki PostgreSQL & Redis yang terinstall langsung di Ubuntu Server:

### Step 1: Install Bun Runtime di Ubuntu Server
```bash
curl -fsSL https://bun.sh/install | bash
source ~/.bashrc
bun --version
```

### Step 2: Build & Push Schema
```bash
cd bayaran_bun/backend
bun install
cp .env.example .env
# Edit .env sesuaikan DATABASE_URL dan REDIS_URL server Anda
nano .env

# Push schema & seed data
bun run db:push
bun run db:seed
```

### Step 3: Jalankan dengan PM2
```bash
# Install PM2 secara global
sudo npm install -g pm2

# Jalankan backend dengan PM2
pm2 start "bun src/index.ts" --name "bayaran-backend"
pm2 save
pm2 startup
```

---

## 🔍 Log Monitoring & Troubleshooting

```bash
# Melihat log aplikasi (Docker)
docker compose logs -f app

# Melihat log aplikasi (PM2)
pm2 logs bayaran-backend

# Restart aplikasi
docker compose restart app
# atau
pm2 restart bayaran-backend
```
