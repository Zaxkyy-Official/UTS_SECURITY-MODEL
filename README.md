# Arsitektur Keamanan Full-Stack: Database Encryption AES-256-CBC

Implementasi sistem full-stack dengan model keamanan enkripsi database terdistribusi sesuai spesifikasi UTS Workshop Pemrograman Framework.

---

## 1. Arsitektur & Model Keamanan

Berdasarkan diagram arsitektur sistem:

```
[Sumber DB A]                   [Server Express (Node.js)]                     [Penyimpanan DB B]
kategori & produk  ===> [Langkah 1: POST Payload] ===> [Enkripsi AES-256-CBC] ===> [Langkah 2: Simpan Ciphertext]
                                                                                     ke produk_encrypted
[Client / Vue.js]  <=== [Langkah 4: Response Decrypted] <=== [Langkah 3: GET & Dekripsi Server] <=== [Query Ciphertext]
```

### 4 Alur Utama:
1. **Langkah 1 (Client POST Payload):** Client atau server pengirim mengirimkan data produk mentah (`nama_produk`, `harga_produk`, `foto_produk`, `id_kategori`) ke endpoint `/api/secure/produk`.
2. **Langkah 2 (Enkripsi & Simpan ke DB B):** Server Express mengenkripsi atribut sensitif dengan cipher `aes-256-cbc` menggunakan Secret Key (32-byte) dan Initial Vector (IV, 16-byte acak per payload). Format ciphertext yang disimpan adalah `[IV_HEX]:[ENCRYPTED_DATA_HEX]`. Data tersimpan ke tabel `produk_encrypted` di **DB B**.
3. **Langkah 3 (Query Ciphertext dari DB B):** Server mengeksekusi query `SELECT * FROM produk_encrypted` dari DB B ketika menerima request GET.
4. **Langkah 4 (Dekripsi Server & Kirim ke Endpoint):** Server memisahkan IV dan data terenkripsi, mendekripsi data dengan Secret Key valid, memvalidasi JSON hasil dekripsi, lalu mengirimkan payload bersih ke Client/Frontend.

---

## 2. Struktur Database (XAMPP / MySQL)

### Database: `db_a` (Sumber Mentah / Master)
- **Tabel `kategori`**:
  - `id` (INT, Primary Key, Auto Increment)
  - `nama_kategori` (VARCHAR 100)
- **Tabel `produk`**:
  - `id` (INT, Primary Key, Auto Increment)
  - `nama_produk` (VARCHAR 150)
  - `harga_produk` (DECIMAL 10,2)
  - `foto_produk` (VARCHAR 255)
  - `id_kategori` (INT)

File migrasi SQL: [db_a.sql](file:///d:/Kumpulan%20Tugas%20Kuliah/Semester%203/Workshop%20Pemrograman%20Framework/Praktek/Uts_Mohamad%20Zaky%20Bahtiar%20Arifianto/db_a.sql)

### Database: `db_b` (Penyimpanan Aman Terenkripsi)
- **Tabel `kategori`**:
  - `id` (INT, Primary Key, Auto Increment)
  - `nama_kategori` (VARCHAR 100)
- **Tabel `produk_encrypted`**:
  - `id` (INT, Primary Key, Auto Increment)
  - `data_terenkripsi` (TEXT)
  - `id_kategori` (INT)

File migrasi SQL: [db_b.sql](file:///d:/Kumpulan%20Tugas%20Kuliah/Semester%203/Workshop%20Pemrograman%20Framework/Praktek/Uts_Mohamad%20Zaky%20Bahtiar%20Arifianto/db_b.sql)

---

## 3. Menjalankan Backend (Express.js)

Masuk ke folder `backend-security`:
```bash
cd backend-security
npm install
node server.js
```

Server akan aktif pada: `http://localhost:5000`

### Variabel Lingkungan (`.env`)
File: [backend-security/.env](file:///d:/Kumpulan%20Tugas%20Kuliah/Semester%203/Workshop%20Pemrograman%20Framework/Praktek/Uts_Mohamad%20Zaky%20Bahtiar%20Arifianto/backend-security/.env)
- `PORT=5000`
- `DB_HOST=localhost`
- `DB_USER=root`
- `DB_PASSWORD=`
- `DB_A_NAME=db_a`
- `DB_B_NAME=db_b`
- `ENCRYPTION_KEY=a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90` (32 bytes / 64 hex)

---

## 4. Pengujian Menggunakan Bruno API Client

Buka aplikasi **Bruno**, pilih **Open Collection**, lalu arahkan ke folder [bruno-collection](file:///d:/Kumpulan%20Tugas%20Kuliah/Semester%203/Workshop%20Pemrograman%20Framework/Praktek/Uts_Mohamad%20Zaky%20Bahtiar%20Arifianto/bruno-collection).

### Koleksi yang Tersedia:
1. **1. POST Secure Produk (Enkripsi & Simpan ke DB B)**
   - Method: `POST`
   - URL: `http://localhost:5000/api/secure/produk`
   - Headers: `Content-Type: application/json`
   - Body:
     ```json
     {
       "nama_produk": "Laptop Gaming Pro",
       "harga_produk": 15000000,
       "foto_produk": "laptop.jpg",
       "id_kategori": 1
     }
     ```
2. **2. GET Secure Produk (Ambil & Dekripsi Server ke Endpoint)**
   - Method: `GET`
   - URL: `http://localhost:5000/api/secure/produk`
3. **3. GET Raw Encrypted Data (Audit DB B)**
   - Method: `GET`
   - URL: `http://localhost:5000/api/secure/produk/raw`

---

## 5. Menjalankan Frontend (Vue.js 3)

Masuk ke folder `frontend`:
```bash
cd frontend
npm install
npm run dev
```

Buka browser pada: `http://localhost:3000`

Komponen utama: [frontend/src/App.vue](file:///d:/Kumpulan%20Tugas%20Kuliah/Semester%203/Workshop%20Pemrograman%20Framework/Praktek/Uts_Mohamad%20Zaky%20Bahtiar%20Arifianto/frontend/src/App.vue)
- Menggunakan Vue 3 Composition API murni.
- Menangani 3 state utama: Loading, Error (lengkap dengan tombol coba lagi), dan Empty State.
- Menyediakan tab "Data Bersih" dan tab "Audit Ciphertext (DB B)" untuk melihat data terenkripsi secara langsung.
- Dilengkapi form interaktif untuk menguji POST enkripsi langsung dari peramban.
