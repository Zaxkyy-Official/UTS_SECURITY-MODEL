CREATE TABLE kategori (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nama_kategori VARCHAR(100) NOT NULL
);

CREATE TABLE produk_encrypted (
    id INT AUTO_INCREMENT PRIMARY KEY,
    data_terenkripsi TEXT NOT NULL,
    id_kategori INT NOT NULL
);
