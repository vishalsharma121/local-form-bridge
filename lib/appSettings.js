import { neon } from '@neondatabase/serverless';

function getSql() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.warn('⚠️ [AppSettings] DATABASE_URL environment variable is missing.');
    throw new Error('DATABASE_URL environment variable is missing.');
  }
  return neon(connectionString);
}

// Ensures app_settings table exists and default key is seeded
export async function ensureSettingsTable() {
  try {
    const sql = getSql();
    await sql`
      CREATE TABLE IF NOT EXISTS app_settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;

    return true;
  } catch (err) {
    console.error('🔥 [AppSettings] Failed to ensure app_settings table:', err);
    return false;
  }
}

// Retrieves a setting by key, returns defaultValue if missing or DB error
export async function getAppSetting(keyName, defaultValue = 'false') {
  try {
    const sql = getSql();
    await ensureSettingsTable();

    const rows = await sql`
      SELECT value FROM app_settings WHERE key = ${keyName} LIMIT 1
    `;

    if (rows && rows.length > 0) {
      return rows[0].value;
    }
    return defaultValue;
  } catch (err) {
    console.error(`🔥 [AppSettings] Failed to get setting "${keyName}":`, err);
    return defaultValue;
  }
}

// Sets or updates a setting by key
export async function setAppSetting(keyName, value) {
  try {
    const sql = getSql();
    await ensureSettingsTable();

    const strValue = String(value);
    await sql`
      INSERT INTO app_settings (key, value, updated_at)
      VALUES (${keyName}, ${strValue}, NOW())
      ON CONFLICT (key) DO UPDATE
      SET value = EXCLUDED.value,
          updated_at = NOW()
    `;
    console.log(`📌 [AppSettings] Updated setting "${keyName}" = "${strValue}"`);
    return true;
  } catch (err) {
    console.error(`🔥 [AppSettings] Failed to set setting "${keyName}":`, err);
    return false;
  }
}

// Retrieves all settings as a key-value object
export async function getAllSettings() {
  try {
    const sql = getSql();
    await ensureSettingsTable();

    const rows = await sql`
      SELECT key, value FROM app_settings
    `;

    const settingsObj = {};
    (rows || []).forEach((row) => {
      settingsObj[row.key] = row.value;
    });

    return settingsObj;
  } catch (err) {
    console.error('🔥 [AppSettings] Failed to fetch all settings:', err);
    return {};
  }
}
