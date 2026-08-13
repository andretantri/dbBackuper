# Setup Database Backup to Google Drive (Ubuntu Server)

Proyek ini memungkinkan Anda melakukan backup database MySQL dan mengirimkannya secara otomatis ke Google Drive. Skrip Python menggunakan konsep "Upload-Only" untuk menjaga keamanan akun Anda (hanya punya akses tulis/upload, tidak bisa menghapus). Penghapusan file lama dilakukan oleh Google Apps Script di sisi server Google.

---

## Bagian 1: Mendapatkan Token Kredensial Google (Service Account)

Skrip ini menggunakan otentikasi "Service Account" karena skrip berjalan secara background (tanpa interaksi manusia/UI browser). Berikut cara mendapatkannya:

1. **Buka Google Cloud Console**
   - Kunjungi [Google Cloud Console](https://console.cloud.google.com/).
   - Login dengan akun Google yang memiliki Google Drive tujuan backup.
   - Buat Project baru atau pilih Project yang sudah ada.

2. **Aktifkan Google Drive API**
   - Pergi ke menu navigasi (garis tiga) -> **APIs & Services** -> **Library**.
   - Cari "Google Drive API".
   - Klik **Enable** (Aktifkan).

3. **Buat Service Account**
   - Pergi ke **APIs & Services** -> **Credentials**.
   - Klik tombol **+ CREATE CREDENTIALS** di atas, pilih **Service account**.
   - Beri nama service account (misal: `db-backup-bot`). Lanjutkan dan klik **Done**.

4. **Buat Kunci Token (credentials.json)**
   - Masih di halaman **Credentials**, cari tabel "Service Accounts" di bawah, lalu klik email service account yang baru saja Anda buat.
   - Pergi ke tab **KEYS**.
   - Klik **ADD KEY** -> **Create new key**.
   - Pilih **JSON** dan klik **Create**.
   - File JSON akan terdownload otomatis. Ubah namanya menjadi `credentials.json` dan letakkan satu folder dengan skrip Python (`backup.py`).

5. **Berikan Akses Folder Google Drive ke Service Account**
   - Ini bagian paling krusial! Service account adalah seperti akun email virtual. (Emailnya terlihat seperti: `db-backup-bot@project-id.iam.gserviceaccount.com`).
   - Salin alamat email tersebut.
   - Buka akun Google Drive Anda.
   - Buat atau pilih Folder yang akan jadi tempat backup.
   - Klik kanan folder tersebut -> **Share** (Bagikan).
   - Paste alamat email service account ke kolom orang/grup.
   - Berikan hak sebagai **Editor** (atau Contributor).
   - Simpan ID Folder tersebut (ada di URL browser, misalnya `1Ab2Cd...`), masukkan ke `.env` pada variabel `GDRIVE_FOLDER_ID`.

---

## Bagian 2: Instalasi & Deployment di Ubuntu Server

Berikut adalah langkah-langkah menjalankan skrip di Ubuntu Server Anda:

1. **Persiapan Sistem & Python (Ubuntu 20.04/22.04)**
   Pastikan Python 3 dan PIP terinstal:
   ```bash
   sudo apt update
   sudo apt install python3 python3-pip python3-venv default-mysql-client -y
   ```

2. **Clone/Pindahkan Kode ke Server**
   Letakkan file proyek ini, misalnya di `/opt/dbbackuper`.
   ```bash
   sudo mkdir -p /opt/dbbackuper
   # ... (salin file .env, backup.py, requirements.txt, credentials.json ke folder ini) ...
   sudo chown -R $USER:$USER /opt/dbbackuper
   cd /opt/dbbackuper
   ```

3. **Buat Virtual Environment & Install Dependensi**
   ```bash
   python3 -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   ```

4. **Konfigurasi Lingkungan (.env)**
   ```bash
   cp .env.example .env
   nano .env
   ```
   *Isi konfigurasi database dan Google Drive Anda (Folder ID). Letakkan `credentials.json` di direktori yang sama.*
   *Buat juga folder backup lokal yang dituju di .env (misal `/var/backups/mysql`), pastikan folder itu ada dan bisa ditulis (writable).*

5. **Uji Coba Manual**
   Masih di dalam virtual environment, jalankan:
   ```bash
   python backup.py
   ```
   *Jika berhasil, Anda akan melihat log file tersimpan lokal lalu terupload.*

---

## Bagian 3: Otomatisasi dengan Cron Job (Ubuntu)

Agar script berjalan otomatis setiap jam 2 pagi, kita gunakan cron.

1. Buka konfigurasi crontab:
   ```bash
   crontab -e
   ```
2. Tambahkan baris berikut di paling bawah (pastikan path disesuaikan):
   ```cron
   0 2 * * * cd /opt/dbbackuper && /opt/dbbackuper/venv/bin/python /opt/dbbackuper/backup.py >> /opt/dbbackuper/backup.log 2>&1
   ```
   *Cron ini berjalan pada pukul 02:00 pagi setiap hari. Output log disimpan di `backup.log`.*

---

## Bagian 4: Setup Penghapus Otomatis (Google Apps Script)

Karena script Python Anda hanya bisa *Upload*, jangan lupa pasang script `apps_script_cleaner.js` di [Google Apps Script](https://script.google.com/) menggunakan akun utama Anda, agar backup yang berumur di atas 30 hari di Google Drive otomatis terhapus. (Baca instruksi pemasangannya di dalam file `apps_script_cleaner.js`).
