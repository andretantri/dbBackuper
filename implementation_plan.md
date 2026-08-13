# Database Backup to Google Drive Project

This plan outlines the creation of a Python script to automatically dump all MySQL databases, upload the backups to Google Drive, and manage a 30-day retention policy (deleting older backups locally, and securely managing them on Google Drive).

## User Review Required

> [!CAUTION]
> **Security Concern Addressed: Protecting against Token Compromise**
> Anda menyampaikan kekhawatiran yang sangat valid: *Bagaimana jika token (kredensial) ter-hack dan digunakan untuk menghapus semua backup?*
> 
> Untuk mencegah hal ini, saya merekomendasikan arsitektur **Upload-Only (Hanya Unggah)**:
> 1. **Script Python Lokal HANYA bisa mengunggah:** Token yang ada di server/komputer Anda hanya akan digunakan untuk mengunggah file ke Google Drive. Skrip lokal ini **TIDAK AKAN** memiliki fitur atau izin untuk menghapus file di Google Drive.
> 2. **Penghapusan Otomatis di Google Drive via Apps Script:** Untuk menghapus file yang lebih tua dari 30 hari di Google Drive, kita tidak akan melakukannya dari script Python. Sebagai gantinya, kita akan membuat script kecil di **Google Apps Script** (berjalan langsung dan aman di server Google, tanpa token terekspos ke luar). Apps Script ini akan otomatis berjalan setiap hari dan menghapus file lama.
> 
> Dengan cara ini, meskipun server/komputer Anda diretas dan tokennya dicuri, peretas **tidak akan tahu cara menghapus backup Anda** dari script tersebut, dan bahkan jika mereka mencoba menghapus, file akan masuk ke "Trash" (Tempat Sampah) Google Drive selama 30 hari sebelum benar-benar hilang.
>
> Apakah Anda setuju dengan pendekatan keamanan **Upload-Only** ini?

## Open Questions

> [!WARNING]
> 1. **Database Credentials:** Does your MySQL/phpMyAdmin user have access to dump *all* databases? If not, we will need to specify which ones to backup.
> 2. **OS Environment:** You are on Mac (`zsh`), but where will this script ultimately run? (e.g., Linux server, local Mac, Windows server). This affects the `mysqldump` command path.
> 3. **Cron Job:** Would you like me to provide the `crontab` configuration to run this script daily?

## Proposed Changes

We will create the following files in `/Users/it/Project/dbbackuper`:

### Python Dependencies

#### [NEW] [requirements.txt](file:///Users/it/Project/dbbackuper/requirements.txt)
Will contain the necessary Python packages:
- `google-api-python-client`
- `google-auth`
- `python-dotenv` (for loading credentials securely)

### Configuration

#### [NEW] [.env.example](file:///Users/it/Project/dbbackuper/.env.example)
A template for your environment variables:
- `DB_USER`
- `DB_PASSWORD`
- `DB_HOST`
- `GDRIVE_FOLDER_ID`
- `SERVICE_ACCOUNT_FILE`

### Application Code

#### [NEW] [backup.py](file:///Users/it/Project/dbbackuper/backup.py)
The main script that will:
1. Load environment variables.
2. Run `mysqldump --all-databases` or loop through databases.
3. Compress the dump into a `.sql.gz` atau `.zip` file.
4. Authenticate with Google Drive using the Service Account.
5. Upload the new backup to the specified Google Drive folder.
6. Check the local backup directory and delete local files older than 30 days (Remote files are NOT deleted by this script).

### Secure Remote Deletion (Google Apps Script)

#### [NEW] [apps_script_cleaner.js](file:///Users/it/Project/dbbackuper/apps_script_cleaner.js)
A Javascript snippet that you will copy-paste into Google Apps Script (script.google.com). This script will safely run on Google's servers to automatically delete backups older than 30 days from your Google Drive folder, keeping your token secure.

## Verification Plan

### Manual Verification
1. Install requirements: `pip install -r requirements.txt`.
2. Setup `.env` and `credentials.json` (Service Account).
3. Run the script manually `python backup.py` and verify a `.gz` file is created locally and uploaded to Google Drive.
4. Temporarily change the retention period to 0 days to verify the deletion logic works on both local and Google Drive environments.
