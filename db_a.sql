CREATE TABLE kategori (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nama_kategori VARCHAR(100) NOT NULL
);

CREATE TABLE produk (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nama_produk VARCHAR(150) NOT NULL,
    harga_produk DECIMAL(10,2) NOT NULL,
    foto_produk VARCHAR(255) NOT NULL,
    id_kategori INT NOT NULL
);

INSERT INTO kategori (id, nama_kategori) VALUES (1, 'Elektronik'), (2, 'Pakaian');
INSERT INTO produk (nama_produk, harga_produk, foto_produk, id_kategori) VALUES 
('Smartphone X', 3500000.00, 'smartphone.jpg', 1);