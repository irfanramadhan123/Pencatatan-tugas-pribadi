# React Vite Todo + Neon

Project ini sudah diubah dari todo statis berbasis `localStorage` menjadi aplikasi client-server yang siap untuk lokal dan deploy ke Vercel:

- Frontend React Vite mengambil data dari endpoint `/api/todos`
- Backend API menyimpan data ke Neon PostgreSQL
- Proxy Vite sudah diarahkan ke `http://localhost:3001`
- Route backend juga sudah disusun mengikuti pola Vercel Functions

## File penting

- `src/App.jsx`: frontend yang fetch data dari backend
- `api/todos/index.js`: handler `GET /api/todos` dan `POST /api/todos`
- `api/todos/[id].js`: handler `PATCH /api/todos/:id` dan `DELETE /api/todos/:id`
- `api/todos/completed.js`: handler `DELETE /api/todos/completed`
- `api/health.js`: handler `GET /api/health`
- `server.js`: server lokal untuk development
- `schema.sql`: schema tabel todo
- `.env.example`: contoh environment variable

## Cara pakai

1. Install dependency:

```bash
npm install
```

2. Buat file `.env` berdasarkan `.env.example`

```env
DATABASE_URL=postgresql://USER:PASSWORD@YOUR-NEON-HOST/neondb?sslmode=require
PORT=3001
VITE_API_URL=http://localhost:3001
```

3. Jalankan backend:

```bash
npm run server
```

4. Jalankan frontend Vite di terminal lain:

```bash
npm run dev
```

## Endpoint API

- `GET /api/todos`
- `POST /api/todos`
- `PATCH /api/todos/:id`
- `DELETE /api/todos/:id`
- `DELETE /api/todos/completed`
- `GET /api/health`

## Deploy ke Vercel

1. Push project ke GitHub
2. Import repository ke Vercel
3. Tambahkan environment variable `DATABASE_URL` di Vercel Project Settings
4. Deploy

Saat deploy ke Vercel:
- frontend tetap memakai request relatif ke `/api/...`
- file pada folder `api/` akan berjalan sebagai Vercel Functions
- `server.js` hanya dipakai untuk development lokal

## Catatan

Tabel `todos` akan dibuat otomatis saat endpoint dipanggil pertama kali. Jika mau membuatnya manual dari Neon SQL Editor, pakai isi file `schema.sql`.
