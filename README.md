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

Karena script Python Anda hanya bisa *Upload* (demi keamanan), Anda **wajib** memasang script `apps_script_cleaner.js` di [Google Apps Script](https://script.google.com/) menggunakan akun utama Anda. Script ini akan berjalan otomatis setiap hari untuk menghapus backup yang umurnya lebih dari 30 hari.

### Langkah-langkah Instalasi:

1. **Buka Google Apps Script**
   - Pastikan Anda login ke akun Google (Google Workspace Anda).
   - Kunjungi: [https://script.google.com/](https://script.google.com/)

2. **Buat Proyek Baru**
   - Klik tombol **New Project** (Proyek Baru) di sebelah kiri atas.
   - Hapus kode bawaan (`function myFunction() {...}`).
   - Buka file `apps_script_cleaner.js` di proyek ini, **Copy** seluruh isinya, dan **Paste** ke editor Apps Script tersebut.

3. **Konfigurasi Folder ID**
   - Di dalam kode yang baru Anda paste, cari variabel `folderId`.
   - Ganti nilainya dengan ID Folder Google Drive / Shared Drive Anda (Sama seperti yang Anda isikan di `.env`).

4. **Simpan Proyek**
   - Klik ikon **Disket** (Save / Simpan).
   - Beri nama proyek di bagian atas, misalnya "Auto Cleaner Backup".

5. **Menguji Script (Test Run)**
   - Pilih fungsi `deleteOldBackups` di menu atas (di sebelah tombol Debug).
   - Klik tombol **Run** (Jalankan).
   - Anda akan diminta memberikan "Authorization" (Otorisasi).
     - Klik **Review Permissions**, pilih akun Google Anda.
     - Jika ada peringatan "Google hasn't verified this app", klik **Advanced** (Lanjutan) lalu klik **Go to ... (unsafe)**.
     - Klik **Allow** (Izinkan).
   - Buka menu **Execution log** (Log Eksekusi) di bagian bawah layar untuk melihat apakah ada file lama yang dihapus atau dibatalkan karena tidak ada backup hari ini.

6. **Membuat Jadwal Otomatis (Cron Job / Trigger)**
   - Di menu sebelah kiri layar, klik ikon **Jam** ("Triggers" / Pemicu).
   - Klik tombol biru **Add Trigger** (Tambahkan Pemicu) di kanan bawah.
   - Atur pengaturannya sebagai berikut:
     - *Choose which function to run:* **deleteOldBackups**
     - *Choose which deployment should run:* **Head**
     - *Select event source:* **Time-driven**
     - *Select type of time based trigger:* **Day timer**
     - *Select time of day:* **3am to 4am** *(Sangat disarankan memilih 1-2 jam SETELAH server Ubuntu Anda melakukan upload agar tidak bentrok).*
   - Klik **Save** (Simpan).

Selesai! Script pengaman Google Anda kini akan otomatis mengecek dan menghapus file usang setiap hari.
