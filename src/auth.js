// auth.js - Manajemen autentikasi
import { useMultiFileAuthState } from "baileys";

/**
 * Memuat state autentikasi dari file
 * @param {string} authDir - Direktori penyimpanan auth
 */
export async function loadAuthState(authDir) {
  const { state, saveCreds } = await useMultiFileAuthState(authDir);

  // Set ADV secret key jika ada di environment variable
  if (process.env.ADV_SECRET_KEY) {
    state.creds.advSecretKey = process.env.ADV_SECRET_KEY;
  }

  return { state, saveCreds };
}
