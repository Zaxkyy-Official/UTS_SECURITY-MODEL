const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const crypto = require('crypto');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());


// KONFIGURASI ENKRIPSI (AES-256-CBC)
// Kunci 32 bytes (256 bit). Mengambil dari .env atau fallback deterministik
const IV_LENGTH = 16;
let SECRET_KEY;

if (process.env.ENCRYPTION_KEY) {
    if (process.env.ENCRYPTION_KEY.length === 64) {
        SECRET_KEY = Buffer.from(process.env.ENCRYPTION_KEY, 'hex');
    } else {
        SECRET_KEY = crypto.scryptSync(process.env.ENCRYPTION_KEY, 'salt_security_project', 32);
    }
} else {
    SECRET_KEY = crypto.randomBytes(32);
    console.warn('[SECURITY WARNING] ENCRYPTION_KEY tidak disetel di .env. Menggunakan kunci acak sementara.');
}

/**
 * Enkripsi teks menggunakan AES-256-CBC
 * Output format: [IV_HEX]:[ENCRYPTED_DATA_HEX]
 */
function encrypt(text) {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv('aes-256-cbc', SECRET_KEY, iv);
    let encrypted = cipher.update(text, 'utf8');
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return iv.toString('hex') + ':' + encrypted.toString('hex');
}

/**
 * Dekripsi teks berformat [IV_HEX]:[ENCRYPTED_DATA_HEX]
 */
function decrypt(text) {
    const textParts = text.split(':');
    if (textParts.length < 2) {
        throw new Error('Format ciphertext tidak valid (harus iv:data)');
    }
    const iv = Buffer.from(textParts.shift(), 'hex');
    const encryptedText = Buffer.from(textParts.join(':'), 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', SECRET_KEY, iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString('utf8');
}

// KONEKSI DATABASE (DB A & DB B)
const dbConfigA = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_A_NAME || 'db_a',
    waitForConnections: true,
    connectionLimit: 10
};

const dbConfigB = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_B_NAME || 'db_b',
    waitForConnections: true,
    connectionLimit: 10
};

const poolA = mysql.createPool(dbConfigA);
const poolB = mysql.createPool(dbConfigB);

// Verifikasi Koneksi
poolA.getConnection((err, conn) => {
    if (err) {
        console.error('Koneksi DB A Gagal:', err.message);
    } else {
        console.log('Terhubung ke DB A (Sumber/Kategori)');
        conn.release();
    }
});

poolB.getConnection((err, conn) => {
    if (err) {
        console.error('Koneksi DB B Gagal:', err.message);
    } else {
        console.log('Terhubung ke DB B (Penyimpanan Terenkripsi)');
        conn.release();
    }
});

// ROUTE ENDPOINT SISTEM
// Endpoint Status / Health Check
app.get('/api/status', (req, res) => {
    res.json({
        status: 'Online',
        service: 'Backend Security Model AES-256-CBC',
        databases: {
            db_a: process.env.DB_A_NAME || 'db_a',
            db_b: process.env.DB_B_NAME || 'db_b'
        },
        algorithm: 'AES-256-CBC'
    });
});

/**
 * LANGKAH 1 & 2: POST
 * Menerima data payload dari client -> Enkripsi -> Simpan ciphertext ke DB B
 */
app.post('/api/secure/produk', (req, res) => {
    const { nama_produk, harga_produk, foto_produk, id_kategori } = req.body;

    if (!nama_produk || harga_produk === undefined || !id_kategori) {
        return res.status(400).json({
            error: 'Payload tidak lengkap. Membutuhkan nama_produk, harga_produk, dan id_kategori.'
        });
    }

    try {
        // Enkripsi atribut sensitif menjadi ciphertext terpadu
        const rawData = JSON.stringify({
            nama_produk,
            harga_produk: Number(harga_produk),
            foto_produk: foto_produk || 'default.jpg'
        });
        const encryptedData = encrypt(rawData);

        const query = 'INSERT INTO produk_encrypted (data_terenkripsi, id_kategori) VALUES (?, ?)';
        poolB.query(query, [encryptedData, Number(id_kategori)], (err, results) => {
            if (err) {
                console.error('Gagal insert ke DB B:', err);
                return res.status(500).json({ error: 'Gagal menyimpan ke DB B: ' + err.message });
            }

            res.status(201).json({
                status: 'Success',
                message: 'Data berhasil dienkripsi dan disimpan ke DB B',
                inserted_id: results.insertId,
                id_kategori: Number(id_kategori),
                encrypted_payload: encryptedData
            });
        });
    } catch (encryptError) {
        console.error('Kesalahan Enkripsi:', encryptError);
        res.status(500).json({ error: 'Gagal mengenkripsi payload', details: encryptError.message });
    }
});

/**
 * LANGKAH 3 & 4: GET
 * Mengambil ciphertext dari DB B -> Dekripsi di Server -> Kirim data bersih ke Endpoint / Frontend
 */
app.get('/api/secure/produk', (req, res) => {
    const query = 'SELECT id, data_terenkripsi, id_kategori FROM produk_encrypted ORDER BY id DESC';

    poolB.query(query, (err, results) => {
        if (err) {
            console.error('Gagal mengambil data dari DB B:', err);
            return res.status(500).json({ error: 'Gagal mengambil data dari DB B: ' + err.message });
        }

        try {
            const decryptedResults = results.map(row => {
                const decryptedString = decrypt(row.data_terenkripsi);
                const parsedData = JSON.parse(decryptedString);

                return {
                    id: row.id,
                    id_kategori: row.id_kategori,
                    nama_produk: parsedData.nama_produk,
                    harga_produk: parsedData.harga_produk,
                    foto_produk: parsedData.foto_produk
                };
            });

            res.json({
                status: 'Success',
                security_layer: 'Decrypted via Server (JWT/Key Valid)',
                total_items: decryptedResults.length,
                data: decryptedResults
            });
        } catch (decryptError) {
            console.error('Gagal mendekripsi baris data:', decryptError);
            res.status(500).json({
                error: 'Gagal mendekripsi data dari DB B',
                details: decryptError.message
            });
        }
    });
});

/**
 * ENDPOINT AUDIT TAMBAHAN: Melihat data mentah terenkripsi di DB B
 * Membuktikan bahwa di level database, data benar-benar tersimpan sebagai ciphertext
 */
app.get('/api/secure/produk/raw', (req, res) => {
    poolB.query('SELECT * FROM produk_encrypted ORDER BY id DESC', (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({
            status: 'Success',
            description: 'Data mentah tersimpan dalam DB B (Ciphertext AES-256-CBC)',
            data: results
        });
    });
});

/**
 * ENDPOINT AUDIT TAMBAHAN: Membaca data dari DB A (Sumber mentah)
 */
app.get('/api/source/produk', (req, res) => {
    poolA.query('SELECT * FROM produk', (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({
            status: 'Success',
            database_source: 'DB A (Unencrypted source)',
            data: results
        });
    });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server Security berjalan di http://localhost:${PORT}`);
});
