import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const DB_DIR = path.join(process.cwd(), "data");
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}
const db = new Database(path.join(DB_DIR, "bot.db"));
db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS contacts (
    id TEXT PRIMARY KEY,
    lid TEXT,
    phoneNumber TEXT,
    name TEXT,
    notify TEXT,
    imgUrl TEXT,
    isContact INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS kvs (
    key TEXT PRIMARY KEY,
    value TEXT
  );

  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    registered INTEGER DEFAULT 0,
    name TEXT,
    limit_count INTEGER DEFAULT 25,
    is_premium INTEGER DEFAULT 0,
    premium_expired INTEGER DEFAULT 0
  );
`);

export const ContactsDB = {
  upsert(contact: any) {
    const stmt = db.prepare(`
      INSERT INTO contacts (id, lid, phoneNumber, name, notify, imgUrl, isContact)
      VALUES (@id, @lid, @phoneNumber, @name, @notify, @imgUrl, @isContact)
      ON CONFLICT(id) DO UPDATE SET
        lid = coalesce(excluded.lid, contacts.lid),
        phoneNumber = coalesce(excluded.phoneNumber, contacts.phoneNumber),
        name = coalesce(excluded.name, contacts.name),
        notify = coalesce(excluded.notify, contacts.notify),
        imgUrl = coalesce(excluded.imgUrl, contacts.imgUrl),
        isContact = coalesce(excluded.isContact, contacts.isContact)
    `);

    const data = {
      id: contact.id,
      lid: contact.lid || null,
      phoneNumber: contact.phoneNumber || null,
      name: contact.name || null,
      notify: contact.notify || null,
      imgUrl: contact.imgUrl || null,
      isContact: contact.isContact ? 1 : 0,
    };

    if (!data.id) return;

    stmt.run(data);
    if (data.lid && data.phoneNumber) {
      const stmtLink = db.prepare(`
        INSERT INTO contacts (id, lid, phoneNumber) VALUES (@id, @lid, @num)
        ON CONFLICT(id) DO UPDATE SET lid = @lid, phoneNumber = @num
      `);
      stmtLink.run({ id: data.lid, lid: data.lid, num: data.phoneNumber });
      stmtLink.run({
        id: data.phoneNumber,
        lid: data.lid,
        num: data.phoneNumber,
      });
    }
  },

  get(id: string) {
    const stmt = db.prepare("SELECT * FROM contacts WHERE id = ?");
    return stmt.get(id);
  },
};

export const UsersDB = {
  upsert(user: any) {
    const stmt = db.prepare(`
      INSERT INTO users (id, registered, name, limit_count, is_premium, premium_expired)
      VALUES (@id, @registered, @name, @limit_count, @is_premium, @premium_expired)
      ON CONFLICT(id) DO UPDATE SET
        registered = coalesce(excluded.registered, users.registered),
        name = coalesce(excluded.name, users.name),
        limit_count = coalesce(excluded.limit_count, users.limit_count),
        is_premium = coalesce(excluded.is_premium, users.is_premium),
        premium_expired = coalesce(excluded.premium_expired, users.premium_expired)
    `);

    const data = {
      id: user.id,
      registered: user.registered ? 1 : 0,
      name: user.name || null,
      limit_count: user.limit_count !== undefined ? user.limit_count : 25,
      is_premium: user.is_premium ? 1 : 0,
      premium_expired: user.premium_expired || 0,
    };

    if (!data.id) return;
    stmt.run(data);
  },

  get(id: string) {
    const stmt = db.prepare("SELECT * FROM users WHERE id = ?");
    return stmt.get(id) as any;
  },

  updateLimit(id: string, newLimit: number) {
    const stmt = db.prepare("UPDATE users SET limit_count = ? WHERE id = ?");
    stmt.run(newLimit, id);
  },

  resetDailyLimits(defaultLimit: number = 25) {
    const stmt = db.prepare(
      "UPDATE users SET limit_count = ? WHERE is_premium = 0",
    );
    stmt.run(defaultLimit);
  },
};

export const KVS = {
  set(key: string, value: any) {
    const stmt = db.prepare(`
      INSERT INTO kvs (key, value) VALUES (?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `);
    stmt.run(key, JSON.stringify(value));
  },

  get(key: string) {
    const stmt = db.prepare("SELECT value FROM kvs WHERE key = ?");
    const result = stmt.get(key) as { value: string } | undefined;
    if (!result?.value) return null;
    try {
      return JSON.parse(result.value);
    } catch {
      return result.value;
    }
  },

  delete(key: string) {
    db.prepare("DELETE FROM kvs WHERE key = ?").run(key);
  },
};

export default db;
