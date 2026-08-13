/**
 * Google Apps Script untuk Menghapus File Lama (Google Drive Cleaner)
 * 
 * Sesuai kesepakatan arsitektur "Upload-Only", script ini akan dijalankan 
 * dari server Google secara otomatis, menjaga token server Anda tetap aman.
 */

function deleteOldBackups() {
  // GANTI INI DENGAN ID FOLDER ANDA
  var folderId = 'your_gdrive_folder_id_here'; 
  
  // Waktu retensi (dalam hari)
  var retentionDays = 30; 
  
  var folder = DriveApp.getFolderById(folderId);
  var files = folder.getFiles();
  
  var now = new Date();
  var thresholdDate = new Date(now.getTime() - (retentionDays * 24 * 60 * 60 * 1000));
  
  var count = 0;
  
  while (files.hasNext()) {
    var file = files.next();
    var dateCreated = file.getDateCreated();
    
    if (dateCreated < thresholdDate) {
      Logger.log('Deleting file: ' + file.getName() + ' (Created: ' + dateCreated + ')');
      file.setTrashed(true); // Pindahkan ke tong sampah (akan hilang dalam 30 hari otomatis)
      count++;
    }
  }
  
  Logger.log('Total files deleted: ' + count);
}

/**
 * Cara Pemasangan:
 * 1. Buka https://script.google.com/
 * 2. Buat "New Project".
 * 3. Paste kode ini ke "Code.gs".
 * 4. Ganti 'your_gdrive_folder_id_here' dengan ID folder Drive Anda.
 * 5. Klik logo jam (Triggers).
 * 6. Tambahkan Trigger baru:
 *    - Choose which function to run: deleteOldBackups
 *    - Select event source: Time-driven
 *    - Select type of time based trigger: Day timer
 *    - Select time of day: (Pilih waktu, misal 2am to 3am)
 * 7. Simpan trigger. Google akan meminta otorisasi akun.
 */
