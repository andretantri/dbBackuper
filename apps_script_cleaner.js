/**
 * Google Apps Script untuk Menghapus File Lama (Google Drive Cleaner)
 * 
 * Fitur Keamanan:
 * Script ini HANYA akan menghapus file lama JIKA terdeteksi ada backup baru 
 * yang berhasil diunggah dalam 24 jam terakhir. Ini mencegah hilangnya
 * semua data jika server gagal melakukan backup selama berhari-hari.
 */

function deleteOldBackups() {
  // === KONFIGURASI ===
  // Masukkan ID folder-folder Shared Drive Anda ke dalam list/array di bawah ini
  // (Pastikan menggunakan tanda kutip dan dipisahkan koma)
  var folderIds = [
    'id_folder_pertama_di_sini',
    // 'id_folder_kedua_di_sini', 
    // 'id_folder_ketiga_di_sini'
  ]; 
  // Waktu retensi (dalam hari)
  var retentionDays = 30; 
  // ===================
  
  var now = new Date();
  var thresholdDate = new Date(now.getTime() - (retentionDays * 24 * 60 * 60 * 1000));
  var oneDayAgo = new Date(now.getTime() - (24 * 60 * 60 * 1000));
  
  for (var f = 0; f < folderIds.length; f++) {
    var folderId = folderIds[f].trim();
    if (!folderId || folderId.startsWith('id_folder_')) continue;
    
    Logger.log('=== Memeriksa Folder ID: ' + folderId + ' ===');
    
    try {
      var folder = DriveApp.getFolderById(folderId);
      var files = folder.getFiles();
      
      var hasRecentBackup = false;
      var filesToDelete = [];
      
      // Lakukan pengecekan satu per satu
      while (files.hasNext()) {
        var file = files.next();
        var dateCreated = file.getDateCreated();
        
        // Cek apakah ada file yang dibuat dalam 24 jam terakhir
        if (dateCreated >= oneDayAgo) {
          hasRecentBackup = true;
        }
        
        // Kumpulkan file yang lebih tua dari threshold
        if (dateCreated < thresholdDate) {
          filesToDelete.push(file);
        }
      }
      
      // FITUR KEAMANAN: Jangan hapus jika hari ini tidak ada backup!
      if (!hasRecentBackup) {
        Logger.log('BAHAYA: Tidak ada backup baru dalam 24 jam terakhir di folder ini!');
        Logger.log('Proses penghapusan dibatalkan untuk folder ini demi mencegah hilangnya data.');
        continue; // Lanjut ke folder berikutnya
      }
      
      // Jika aman (ada backup baru), lanjutkan penghapusan
      Logger.log('Status Aman: Ditemukan backup baru hari ini. Melanjutkan pembersihan rutin.');
      var count = 0;
      
      for (var i = 0; i < filesToDelete.length; i++) {
        var fileToDelete = filesToDelete[i];
        Logger.log('Menghapus file: ' + fileToDelete.getName() + ' (Dibuat: ' + fileToDelete.getDateCreated() + ')');
        fileToDelete.setTrashed(true); // Pindah ke tong sampah
        count++;
      }
      
      Logger.log('Total file lama yang dihapus di folder ini: ' + count);
      
    } catch (e) {
      Logger.log('ERROR: Gagal memproses folder ' + folderId + '. Pesan: ' + e.message);
    }
  }
}

/**
 * PANDUAN CARA INSTALL GOOGLE APPS SCRIPT
 * -----------------------------------------
 * 1. Buka browser dan login ke akun Google (Google Workspace Anda).
 * 2. Kunjungi: https://script.google.com/
 * 3. Klik tombol "New Project" (Proyek Baru) di sebelah kiri atas.
 * 4. Hapus kode bawaan (function myFunction() {...}), lalu PASTE semua kode di atas.
 * 5. Ganti tulisan 'your_gdrive_folder_id_here' di atas dengan ID Folder Drive Anda.
 * 6. Klik ikon Disket (Save / Simpan). Beri nama proyek misalnya "Auto Cleaner Backup".
 * 
 * MENGUJI SCRIPT:
 * 1. Pilih fungsi `deleteOldBackups` di menu atas, lalu klik "Run" (Jalankan).
 * 2. Anda akan diminta memberikan "Authorization" (Otorisasi).
 * 3. Klik "Review Permissions", pilih akun Google Anda.
 * 4. Jika ada peringatan "Google hasn't verified this app", klik "Advanced" (Lanjutan) lalu klik "Go to ... (unsafe)".
 * 5. Klik "Allow" (Izinkan).
 * 6. Buka menu "Execution log" (Log Eksekusi) di bagian bawah layar untuk melihat apakah statusnya aman atau tidak.
 * 
 * MEMBUAT JADWAL OTOMATIS (CRON JOB):
 * 1. Di menu sebelah kiri layar, klik ikon Jam ("Triggers" / Pemicu).
 * 2. Klik tombol biru "Add Trigger" (Tambahkan Pemicu) di kanan bawah.
 * 3. Atur pengaturannya sebagai berikut:
 *    - Choose which function to run: deleteOldBackups
 *    - Choose which deployment should run: Head
 *    - Select event source: Time-driven
 *    - Select type of time based trigger: Day timer
 *    - Select time of day: 3am to 4am (Pilih 1-2 jam SETELAH server Ubuntu Anda melakukan upload).
 * 4. Klik "Save" (Simpan). Selesai! Script akan otomatis mengecek dan menghapus file lama setiap hari.
 */
