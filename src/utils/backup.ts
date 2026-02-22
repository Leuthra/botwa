import fs from "fs";
import path from "path";
import Database from "better-sqlite3";

const DB_DIR = path.join(process.cwd(), "data");
const BACKUP_DIR = path.join(process.cwd(), "backups");

if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

export const backupDatabase = () => {
  try {
    const dbPath = path.join(DB_DIR, "bot.db");
    if (!fs.existsSync(dbPath)) return;

    const date = new Date();
    const dateString = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    const backupPath = path.join(BACKUP_DIR, `bot-backup-${dateString}.db`);

    const db = new Database(dbPath, { readonly: true });
    db.backup(backupPath)
      .then(() => {
        console.log(`[BACKUP] Database backed up to ${backupPath}`);
        db.close();
      })
      .catch((err) => {
        console.error("[BACKUP] Backup failed:", err);
        db.close();
      });

    const files = fs.readdirSync(BACKUP_DIR);
    const now = Date.now();
    const maxAge = 7 * 24 * 60 * 60 * 1000;

    for (const file of files) {
      if (!file.startsWith("bot-backup-") || !file.endsWith(".db")) continue;

      const filePath = path.join(BACKUP_DIR, file);
      const stats = fs.statSync(filePath);

      if (now - stats.mtimeMs > maxAge) {
        fs.unlinkSync(filePath);
        console.log(`[BACKUP] Deleted old backup: ${file}`);
      }
    }
  } catch (error) {
    console.error("[BACKUP] Error running backup database routing:", error);
  }
};

export const cleanTmpFolder = () => {
  try {
    const TMP_DIR = path.join(process.cwd(), "tmp");
    if (!fs.existsSync(TMP_DIR)) return;

    const files = fs.readdirSync(TMP_DIR);
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000;

    for (const file of files) {
      const filePath = path.join(TMP_DIR, file);
      const stats = fs.statSync(filePath);

      if (stats.isFile() && now - stats.mtimeMs > maxAge) {
        fs.unlinkSync(filePath);
        console.log(`[CLEANER] Deleted old tmp file: ${file}`);
      }
    }
  } catch (error) {
    console.error("[CLEANER] Error cleaning tmp folder:", error);
  }
};
