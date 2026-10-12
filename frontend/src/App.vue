<template>
  <main class="dashboard-wrapper">
    <header class="app-header">
      <div class="header-content">
        <h1 class="page-title">Sistem Keamanan Data Produk</h1>
        <p class="subtitle">Model Enkripsi Database Terdistribusi: AES-256-CBC</p>
      </div>

      <div class="header-actions">
        <button 
          type="button" 
          class="btn btn-secondary" 
          :disabled="isLoading" 
          @click="fetchSecureData"
          aria-label="Segarkan data produk"
        >
          {{ isLoading ? 'Memuat...' : 'Segarkan Data' }}
        </button>
      </div>
    </header>

    <section class="security-diagram-card" aria-label="Informasi Arsitektur">
      <h2 class="section-title">Alur Keamanan Terintegrasi</h2>
      <div class="flow-steps">
        <div class="flow-step">
          <span class="step-num">1</span>
          <div class="step-desc">
            <strong>Client Kirim Payload</strong>
            <small>Input form produk dikirim ke endpoint Express</small>
          </div>
        </div>
        <div class="flow-step">
          <span class="step-num">2</span>
          <div class="step-desc">
            <strong>Enkripsi AES-256-CBC</strong>
            <small>Server mengenkripsi payload lalu simpan ke DB B</small>
          </div>
        </div>
        <div class="flow-step">
          <span class="step-num">3</span>
          <div class="step-desc">
            <strong>Query Ciphertext</strong>
            <small>Server mengambil data terenkripsi dari DB B</small>
          </div>
        </div>
        <div class="flow-step">
          <span class="step-num">4</span>
          <div class="step-desc">
            <strong>Dekripsi Server</strong>
            <small>Didekripsi dengan kunci valid sebelum dikirim ke UI</small>
          </div>
        </div>
      </div>
    </section>

    <div class="content-grid">
      <!-- FORM TAMBAH DATA (POST: Langkah 1 & 2) -->
      <section class="panel form-panel" aria-labelledby="form-heading">
        <h2 id="form-heading" class="section-title">Tambah Produk Baru</h2>
        <p class="panel-desc">Data akan dienkripsi di server sebelum disimpan ke database DB B.</p>

        <form @submit.prevent="handleSubmitProduk" class="form-container">
          <div class="form-group">
            <label for="nama_produk">Nama Produk</label>
            <input 
              id="nama_produk" 
              v-model="form.nama_produk" 
              type="text" 
              placeholder="Contoh: Laptop Ultrabook" 
              required 
            />
          </div>

          <div class="form-group">
            <label for="harga_produk">Harga Produk (Rp)</label>
            <input 
              id="harga_produk" 
              v-model.number="form.harga_produk" 
              type="number" 
              min="0" 
              placeholder="Contoh: 8500000" 
              required 
            />
          </div>

          <div class="form-group">
            <label for="foto_produk">Nama File Foto</label>
            <input 
              id="foto_produk" 
              v-model="form.foto_produk" 
              type="text" 
              placeholder="Contoh: laptop.jpg" 
              required 
            />
          </div>

          <div class="form-group">
            <label for="id_kategori">Kategori</label>
            <select id="id_kategori" v-model.number="form.id_kategori" required>
              <option :value="1">1: Elektronik</option>
              <option :value="2">2: Pakaian</option>
            </select>
          </div>

          <button 
            type="submit" 
            class="btn btn-primary" 
            :disabled="isSubmitting"
          >
            {{ isSubmitting ? 'Mengenkripsi & Menyimpan...' : 'Simpan Produk Terenkripsi' }}
          </button>
        </form>

        <!-- Feedback Hasil Enkripsi Terbaru -->
        <div v-if="lastEncryptedPayload" class="audit-box">
          <div class="audit-title">Hasil Enkripsi Terakhir (Payload DB B):</div>
          <code class="audit-code">{{ lastEncryptedPayload }}</code>
        </div>
      </section>

      <!-- DAFTAR PRODUK (GET: Langkah 3 & 4) -->
      <section class="panel list-panel" aria-labelledby="list-heading">
        <div class="panel-header">
          <div>
            <h2 id="list-heading" class="section-title">Daftar Produk Terdekripsi</h2>
            <p class="panel-desc">Data aman didekripsi langsung oleh server menggunakan kunci valid.</p>
          </div>

          <div class="view-toggles">
            <button 
              type="button" 
              class="tab-btn" 
              :class="{ active: activeTab === 'decrypted' }"
              @click="activeTab = 'decrypted'"
            >
              Data Bersih
            </button>
            <button 
              type="button" 
              class="tab-btn" 
              :class="{ active: activeTab === 'raw' }"
              @click="fetchRawData"
            >
              Audit Ciphertext (DB B)
            </button>
          </div>
        </div>

        <!-- State 1: Loading -->
        <div v-if="isLoading" class="state-message">
          <div class="spinner" aria-hidden="true"></div>
          <p>Sedang memuat data terenkripsi dari server...</p>
        </div>

        <!-- State 2: Error -->
        <div v-else-if="errorMessage" class="state-message error-box">
          <p><strong>Terjadi Kesalahan:</strong> {{ errorMessage }}</p>
          <button type="button" class="btn btn-secondary" @click="fetchSecureData">Coba Lagi</button>
        </div>

        <!-- State 3: Tampilan Data Terdekripsi -->
        <div v-else-if="activeTab === 'decrypted'">
          <div v-if="produkList.length === 0" class="state-message empty-box">
            <p>Belum ada produk yang tersimpan di DB B.</p>
          </div>

          <div v-else class="cards-grid">
            <article v-for="item in produkList" :key="item.id" class="card">
              <div class="card-badge">ID DB B: {{ item.id }}</div>
              <h3 class="card-title">{{ item.nama_produk }}</h3>
              <p class="card-price">{{ formatRupiah(item.harga_produk) }}</p>
              <div class="card-meta">
                <span>Kategori: {{ item.id_kategori === 1 ? 'Elektronik' : 'Pakaian' }} (ID {{ item.id_kategori }})</span>
                <span>Foto: {{ item.foto_produk }}</span>
              </div>
            </article>
          </div>
        </div>

        <!-- State 4: Tampilan Raw Ciphertext DB B (Audit Keamanan) -->
        <div v-else-if="activeTab === 'raw'">
          <div v-if="rawList.length === 0" class="state-message empty-box">
            <p>Tidak ada data mentah yang ditemukan di DB B.</p>
          </div>
          <div v-else class="raw-table-wrapper">
            <table class="raw-table">
              <thead>
                <tr>
                  <th scope="col">ID</th>
                  <th scope="col">Kategori</th>
                  <th scope="col">Data Terenkripsi (AES-256-CBC)</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="raw in rawList" :key="raw.id">
                  <td>{{ raw.id }}</td>
                  <td>{{ raw.id_kategori }}</td>
                  <td class="cipher-cell"><code>{{ raw.data_terenkripsi }}</code></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  </main>
</template>

<script>
import { ref, reactive, onMounted } from 'vue';

export default {
  name: 'SecurityDashboard',
  setup() {
    const produkList = ref([]);
    const rawList = ref([]);
    const isLoading = ref(false);
    const isSubmitting = ref(false);
    const errorMessage = ref('');
    const lastEncryptedPayload = ref('');
    const activeTab = ref('decrypted');

    const form = reactive({
      nama_produk: '',
      harga_produk: '',
      foto_produk: '',
      id_kategori: 1
    });

    const API_BASE = 'http://localhost:5000/api';

    const formatRupiah = (number) => {
      return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        maximumFractionDigits: 0
      }).format(number);
    };

    const fetchSecureData = async () => {
      isLoading.value = true;
      errorMessage.value = '';
      try {
        const response = await fetch(`${API_BASE}/secure/produk`);
        if (!response.ok) {
          throw new Error(`HTTP Error status: ${response.status}`);
        }
        const result = await response.json();
        produkList.value = result.data || [];
      } catch (err) {
        errorMessage.value = err.message || 'Gagal menghubungi server backend.';
      } finally {
        isLoading.value = false;
      }
    };

    const fetchRawData = async () => {
      activeTab.value = 'raw';
      isLoading.value = true;
      errorMessage.value = '';
      try {
        const response = await fetch(`${API_BASE}/secure/produk/raw`);
        if (!response.ok) {
          throw new Error(`HTTP Error status: ${response.status}`);
        }
        const result = await response.json();
        rawList.value = result.data || [];
      } catch (err) {
        errorMessage.value = err.message || 'Gagal memuat data mentah.';
      } finally {
        isLoading.value = false;
      }
    };

    const handleSubmitProduk = async () => {
      isSubmitting.value = true;
      errorMessage.value = '';
      try {
        const response = await fetch(`${API_BASE}/secure/produk`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            nama_produk: form.nama_produk,
            harga_produk: Number(form.harga_produk),
            foto_produk: form.foto_produk,
            id_kategori: Number(form.id_kategori)
          })
        });

        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.error || 'Gagal menyimpan data.');
        }

        const result = await response.json();
        lastEncryptedPayload.value = result.encrypted_payload;

        // Reset form input
        form.nama_produk = '';
        form.harga_produk = '';
        form.foto_produk = '';

        // Muat ulang daftar produk
        activeTab.value = 'decrypted';
        await fetchSecureData();
      } catch (err) {
        errorMessage.value = err.message;
      } finally {
        isSubmitting.value = false;
      }
    };

    onMounted(() => {
      fetchSecureData();
    });

    return {
      produkList,
      rawList,
      isLoading,
      isSubmitting,
      errorMessage,
      lastEncryptedPayload,
      activeTab,
      form,
      formatRupiah,
      fetchSecureData,
      fetchRawData,
      handleSubmitProduk
    };
  }
};
</script>

<style scoped>
:global(body) {
  margin: 0;
  padding: 0;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  background-color: #f4f6f8;
  color: #1a202c;
  line-height: 1.5;
}

.dashboard-wrapper {
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px 16px;
}

.app-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
  padding-bottom: 20px;
  border-bottom: 2px solid #e2e8f0;
}

.page-title {
  margin: 0;
  font-size: 24px;
  font-weight: 700;
  color: #0f172a;
}

.subtitle {
  margin: 4px 0 0 0;
  font-size: 14px;
  color: #475569;
}

.security-diagram-card {
  margin-top: 20px;
  background-color: #ffffff;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  padding: 20px;
}

.section-title {
  margin: 0 0 12px 0;
  font-size: 18px;
  font-weight: 600;
  color: #0f172a;
}

.flow-steps {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 12px;
}

.flow-step {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px;
  background-color: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
}

.step-num {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  background-color: #0284c7;
  color: #ffffff;
  font-weight: 700;
  font-size: 14px;
  border-radius: 50%;
  flex-shrink: 0;
}

.step-desc strong {
  display: block;
  font-size: 14px;
  color: #0f172a;
}

.step-desc small {
  display: block;
  font-size: 12px;
  color: #64748b;
  margin-top: 2px;
}

.content-grid {
  display: grid;
  grid-template-columns: 360px 1fr;
  gap: 24px;
  margin-top: 24px;
}

@media (max-width: 860px) {
  .content-grid {
    grid-template-columns: 1fr;
  }
}

.panel {
  background-color: #ffffff;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  padding: 20px;
}

.panel-desc {
  margin: 0 0 16px 0;
  font-size: 13px;
  color: #475569;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 16px;
}

.form-container {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-group label {
  font-size: 13px;
  font-weight: 600;
  color: #334155;
}

.form-group input,
.form-group select {
  padding: 9px 12px;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  font-size: 14px;
  color: #0f172a;
  background-color: #ffffff;
  outline: none;
  transition: border-color 0.2s ease;
}

.form-group input:focus,
.form-group select:focus {
  border-color: #0284c7;
  box-shadow: 0 0 0 2px rgba(2, 132, 199, 0.2);
}

.btn {
  padding: 10px 16px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  border: 1px solid transparent;
  transition: background-color 0.2s ease;
}

.btn-primary {
  background-color: #0284c7;
  color: #ffffff;
}

.btn-primary:hover:not(:disabled) {
  background-color: #0369a1;
}

.btn-secondary {
  background-color: #ffffff;
  border-color: #cbd5e1;
  color: #334155;
}

.btn-secondary:hover:not(:disabled) {
  background-color: #f1f5f9;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.audit-box {
  margin-top: 16px;
  padding: 12px;
  background-color: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
}

.audit-title {
  font-size: 12px;
  font-weight: 600;
  color: #475569;
  margin-bottom: 6px;
}

.audit-code {
  display: block;
  font-family: monospace;
  font-size: 11px;
  color: #0f172a;
  word-break: break-all;
  background-color: #e2e8f0;
  padding: 6px;
  border-radius: 4px;
}

.view-toggles {
  display: flex;
  gap: 4px;
  background-color: #f1f5f9;
  padding: 3px;
  border-radius: 6px;
}

.tab-btn {
  border: none;
  background: transparent;
  padding: 6px 12px;
  font-size: 13px;
  font-weight: 500;
  color: #475569;
  border-radius: 4px;
  cursor: pointer;
}

.tab-btn.active {
  background-color: #ffffff;
  color: #0f172a;
  box-shadow: 0 1px 2px rgba(0,0,0,0.05);
}

.cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 16px;
}

.card {
  background-color: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  padding: 16px;
  display: flex;
  flex-direction: column;
}

.card-badge {
  align-self: flex-start;
  font-size: 11px;
  font-weight: 600;
  background-color: #f1f5f9;
  color: #475569;
  padding: 2px 6px;
  border-radius: 4px;
  margin-bottom: 8px;
}

.card-title {
  margin: 0 0 6px 0;
  font-size: 16px;
  font-weight: 600;
  color: #0f172a;
}

.card-price {
  margin: 0 0 12px 0;
  font-size: 15px;
  font-weight: 700;
  color: #0284c7;
}

.card-meta {
  margin-top: auto;
  font-size: 12px;
  color: #64748b;
  display: flex;
  flex-direction: column;
  gap: 4px;
  border-top: 1px solid #f1f5f9;
  padding-top: 8px;
}

.state-message {
  padding: 32px 16px;
  text-align: center;
  border-radius: 6px;
}

.error-box {
  background-color: #fef2f2;
  border: 1px solid #fecaca;
  color: #991b1b;
}

.empty-box {
  background-color: #f8fafc;
  border: 1px dashed #cbd5e1;
  color: #64748b;
}

.spinner {
  width: 24px;
  height: 24px;
  border: 3px solid #cbd5e1;
  border-top-color: #0284c7;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin: 0 auto 12px auto;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.raw-table-wrapper {
  overflow-x: auto;
}

.raw-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.raw-table th,
.raw-table td {
  border: 1px solid #e2e8f0;
  padding: 8px 12px;
  text-align: left;
}

.raw-table th {
  background-color: #f8fafc;
  color: #334155;
  font-weight: 600;
}

.cipher-cell {
  word-break: break-all;
  font-family: monospace;
  font-size: 11px;
  color: #0f172a;
  max-width: 400px;
}
</style>
