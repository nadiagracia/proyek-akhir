# Dicoding Stories PWA

Aplikasi Progressive Web App (PWA) untuk berbagi cerita seputar Dicoding, mirip seperti Instagram namun khusus untuk komunitas Dicoding.

## Fitur

- ✅ SPA (Single Page Application) dengan transisi halaman
- ✅ Menampilkan data dan marker pada peta
- ✅ Fitur tambah data baru (dengan/s tanpa login)
- ✅ Aksesibilitas sesuai standar
- ✅ Push Notification (Web Push)
- ✅ PWA dengan dukungan instalasi dan mode offline
- ✅ IndexedDB untuk menyimpan data offline
- ✅ Sinkronisasi data offline ke server

## Teknologi

- Vite 5.x
- Vanilla JavaScript (ES6+)
- Leaflet.js untuk peta
- IndexedDB (dengan library idb)
- Service Worker untuk PWA dan Push Notifications
- Workbox untuk caching

## Cara Menjalankan

### 1. Install Dependencies

```bash
npm install
```

### 2. Jalankan Development Server

```bash
npm run dev
```

Aplikasi akan berjalan di `http://localhost:5173`

### 3. Build untuk Production

```bash
npm run build
```

### 4. Preview Production Build

```bash
npm run preview
```

## API Endpoint

Aplikasi menggunakan API dari:
- Base URL: `https://story-api.dicoding.dev/v1`
- VAPID Public Key: `BCCs2eonMI-6H2ctvFaWg-UYdDv387Vno_bzUzALpB442r2lCnsHmtrx8biyPi_E-1fSGABK_Qs_GlvPoJJqxbk`

## Push Notification

Untuk mengaktifkan push notification:
1. Login ke aplikasi
2. Klik tombol "🔔 Notifikasi" di halaman home
3. Izinkan notifikasi di browser
4. Push notification akan aktif dan akan menerima notifikasi ketika ada story baru

**Catatan:** Push notification memerlukan HTTPS. Untuk development lokal, deploy ke Netlify atau platform lain yang menyediakan HTTPS.

## PWA Features

- **Installable:** Aplikasi dapat diinstall di perangkat mobile atau desktop
- **Offline Support:** Aplikasi dapat diakses secara offline dengan caching
- **App Shell:** Application shell tetap tampil saat offline
- **Dynamic Data Caching:** Data stories di-cache untuk akses offline

## IndexedDB Features

- **Create:** Simpan story ke IndexedDB
- **Read:** Baca story dari IndexedDB
- **Delete:** Hapus story dari IndexedDB
- **Filter:** Filter story berdasarkan kriteria
- **Sort:** Sort story berdasarkan field (tanggal, nama, deskripsi)
- **Search:** Cari story berdasarkan keyword
- **Sync:** Sinkronisasi data offline ke server ketika kembali online

## Struktur Project

```
src/
├── index.html
├── sw.js                    # Service Worker
├── scripts/
│   ├── index.js            # Entry point
│   ├── config.js           # Konfigurasi API
│   ├── data/
│   │   └── api.js          # API functions
│   ├── pages/
│   │   ├── app.js          # Main app controller
│   │   ├── home/           # Home page
│   │   ├── add-story/      # Add story page
│   │   ├── favorites/      # Favorites page
│   │   ├── login/          # Login page
│   │   └── register/       # Register page
│   ├── routes/             # Routing
│   └── utils/
│       ├── indexeddb.js    # IndexedDB utilities
│       ├── push-notification.js  # Push notification utilities
│       └── index.js        # Utility functions
└── styles/
    └── styles.css          # Styles
```

## Deployment

### Deploy ke Netlify

1. Build aplikasi:
   ```bash
   npm run build
   ```

2. Deploy folder `dist` ke Netlify

3. Update URL deployment di `STUDENT.txt`

### Catatan Deployment

- Pastikan file PWA icons ada di `src/public/`:
  - `pwa-192x192.png`
  - `pwa-512x512.png`
  - `screenshot-wide.png` (opsional)
  - `screenshot-narrow.png` (opsional)

## Troubleshooting

### Error: npm run dev tidak bisa dijalankan

Pastikan Anda menjalankan command di direktori project yang benar:
```bash
cd "d:\Collage\Semester 7\Dicoding\proyek akhir"
npm run dev
```

### Push Notification tidak bekerja

- Push notification memerlukan HTTPS
- Pastikan Anda sudah login
- Pastikan browser mendukung push notification
- Cek console browser untuk error

### Service Worker tidak terdaftar

- Pastikan aplikasi dijalankan melalui HTTP/HTTPS (bukan file://)
- Cek console browser untuk error
- Clear cache dan reload

## Lisensi

Proyek ini dibuat untuk submission Dicoding.

