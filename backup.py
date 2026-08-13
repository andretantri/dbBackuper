import os
import subprocess
import datetime
import glob
from dotenv import load_dotenv
from google.oauth2.service_account import Credentials
from googleapiclient.discovery import build
from googleapiclient.http import MediaFileUpload

# Load environment variables
load_dotenv()

# Database Config
DB_HOST = os.getenv('DB_HOST')
DB_USER = os.getenv('DB_USER')
DB_PASSWORD = os.getenv('DB_PASSWORD')
DB_NAME = os.getenv('DB_NAME') # Optional

# Backup Config
BACKUP_DIR = os.getenv('BACKUP_DIR')
RETENTION_DAYS = int(os.getenv('RETENTION_DAYS', 30))

# Google Drive Config
GDRIVE_FOLDER_ID = os.getenv('GDRIVE_FOLDER_ID')
SERVICE_ACCOUNT_FILE = os.getenv('SERVICE_ACCOUNT_FILE')

# File Backup Config
BACKUP_PATHS = os.getenv('BACKUP_PATHS')

def get_gdrive_service():
    """Authenticates and returns the Google Drive API service."""
    SCOPES = ['https://www.googleapis.com/auth/drive.file']
    creds = Credentials.from_service_account_file(SERVICE_ACCOUNT_FILE, scopes=SCOPES)
    return build('drive', 'v3', credentials=creds)

def dump_database():
    """Dumps the database(s) using mysqldump and compresses it."""
    date_str = datetime.datetime.now().strftime('%Y-%m-%d_%H-%M-%S')
    
    if not os.path.exists(BACKUP_DIR):
        os.makedirs(BACKUP_DIR)
        
    if DB_NAME:
        filename = f"backup_{DB_NAME}_{date_str}.sql.gz"
        filepath = os.path.join(BACKUP_DIR, filename)
        # For Ubuntu, mysqldump is usually in /usr/bin/mysqldump or available globally
        dump_cmd = f"set -o pipefail; mysqldump -h {DB_HOST} -u {DB_USER} -p'{DB_PASSWORD}' --single-transaction --quick {DB_NAME} | gzip > {filepath}"
    else:
        filename = f"backup_alldb_{date_str}.sql.gz"
        filepath = os.path.join(BACKUP_DIR, filename)
        dump_cmd = f"set -o pipefail; mysqldump -h {DB_HOST} -u {DB_USER} -p'{DB_PASSWORD}' --single-transaction --quick --all-databases | gzip > {filepath}"
        
    print(f"Starting database dump to {filepath}...")
    try:
        # Use shell=True to allow pipe (|) operator
        subprocess.run(dump_cmd, shell=True, check=True, executable='/bin/bash')
        print("Database dump completed successfully.")
        return filepath, filename
    except subprocess.CalledProcessError as e:
        print(f"Error during database dump: {e}")
        return None, None

def compress_directories():
    """Compresses the specified directories into a single tar.gz archive."""
    if not BACKUP_PATHS:
        print("No BACKUP_PATHS defined. Skipping file backup.")
        return None, None
        
    date_str = datetime.datetime.now().strftime('%Y-%m-%d_%H-%M-%S')
    filename = f"backup_files_{date_str}.tar.gz"
    
    if not os.path.exists(BACKUP_DIR):
        os.makedirs(BACKUP_DIR)
        
    filepath = os.path.join(BACKUP_DIR, filename)
    
    # Split paths and remove empty strings/whitespace
    paths = [p.strip() for p in BACKUP_PATHS.split(',') if p.strip()]
    if not paths:
        return None, None
        
    print(f"Starting directory compression to {filepath}...")
    try:
        # Create tar command. We use -czf (create, gzip, file)
        # and append all paths to be compressed.
        tar_cmd = ["tar", "-czf", filepath] + paths
        subprocess.run(tar_cmd, check=True)
        print("Directory compression completed successfully.")
        return filepath, filename
    except subprocess.CalledProcessError as e:
        print(f"Error during directory compression: {e}")
        return None, None

def upload_to_gdrive(service, filepath, filename):
    """Uploads a file to Google Drive."""
    print(f"Uploading {filename} to Google Drive...")
    file_metadata = {
        'name': filename,
        'parents': [GDRIVE_FOLDER_ID]
    }
    media = MediaFileUpload(filepath, mimetype='application/gzip', resumable=True)
    
    try:
        file = service.files().create(
            body=file_metadata, 
            media_body=media,
            fields='id',
            supportsAllDrives=True
        ).execute()
        print(f"Upload successful. File ID: {file.get('id')}")
        return True
    except Exception as e:
        print(f"Error uploading to Google Drive: {e}")
        return False

if __name__ == '__main__':
    try:
        gdrive_service = get_gdrive_service()
    except Exception as e:
        print(f"Failed to initialize Google Drive service: {e}")
        gdrive_service = None

    # 1. Dump database and compress
    backup_db_filepath, backup_db_filename = dump_database()
    
    if backup_db_filepath and gdrive_service:
        # 2. Upload Database to Google Drive
        upload_to_gdrive(gdrive_service, backup_db_filepath, backup_db_filename)
        
        # Clean up local db backup immediately
        if os.path.exists(backup_db_filepath):
            print(f"Removing local file to save space: {backup_db_filepath}")
            os.remove(backup_db_filepath)
    else:
        print("Database backup process aborted or Drive service not available.")
        
    # 3. Compress files/directories
    backup_files_filepath, backup_files_filename = compress_directories()
    
    if backup_files_filepath and gdrive_service:
        # 4. Upload Files to Google Drive
        upload_to_gdrive(gdrive_service, backup_files_filepath, backup_files_filename)
        
        # Clean up local files backup immediately
        if os.path.exists(backup_files_filepath):
            print(f"Removing local file to save space: {backup_files_filepath}")
            os.remove(backup_files_filepath)
    else:
        print("Files backup process skipped, failed, or Drive service not available.")
