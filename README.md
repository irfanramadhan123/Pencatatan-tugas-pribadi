# React Vite Todo + Neon

Project kecil-kecilan untuk membuat website pencatatan tugas yang sudah dikembangkan menjadi aplikasi client-server dengan Google Auth, Neon PostgreSQL, dan siap deploy ke Vercel.

- Frontend React Vite mengambil data dari endpoint `/api/todos`
- Backend API menyimpan data ke Neon PostgreSQL
- Proxy Vite diarahkan ke `http://localhost:3001` untuk development lokal
- Route backend disusun mengikuti pola Vercel Functions

## File penting

- `src/App.jsx`: frontend yang fetch data dari backend
- `api/todos/index.js`: handler `GET /api/todos` dan `POST /api/todos`
- `api/todos/[id].js`: handler `PATCH /api/todos/:id` dan `DELETE /api/todos/:id`
- `api/todos/completed.js`: handler `DELETE /api/todos/completed`
- `api/auth/google.js`: handler login Google
- `api/profile.js`: handler profile user login
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
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
VITE_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
SESSION_SECRET=ganti-dengan-random-secret-yang-panjang
```

Untuk development lokal, biarkan `VITE_API_URL` kosong atau tidak perlu diisi agar frontend memakai proxy Vite ke `/api`.
Isi `VITE_API_URL` hanya jika frontend memang perlu mengarah ke origin backend lain.

3. Jalankan backend:

```bash
npm run server
```

4. Jalankan frontend Vite di terminal lain:

```bash
npm run dev
```

5. Pastikan origin lokal frontend Anda sudah didaftarkan di Google Cloud Console, misalnya `http://localhost:5173`.

## Endpoint API

- `GET /api/todos`
- `POST /api/todos`
- `PATCH /api/todos/:id`
- `DELETE /api/todos/:id`
- `DELETE /api/todos/completed`
- `GET /api/health`
- `POST /api/auth/google`
- `GET /api/profile`

## Deploy ke Vercel

1. Push project ke GitHub
2. Import repository ke Vercel
3. Tambahkan environment variable `DATABASE_URL` di Vercel Project Settings
4. Tambahkan juga `GOOGLE_CLIENT_ID`, `VITE_GOOGLE_CLIENT_ID`, dan `SESSION_SECRET`
5. Deploy

Saat deploy ke Vercel:
- frontend tetap memakai request relatif ke `/api/...`
- file pada folder `api/` akan berjalan sebagai Vercel Functions
- `server.js` hanya dipakai untuk development lokal

## Catatan

Tabel `users` dan `todos` akan dibuat otomatis saat endpoint dipanggil pertama kali. Jika mau membuatnya manual dari Neon SQL Editor, pakai isi file `schema.sql`.
