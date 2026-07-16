// connection.js - Manajemen koneksi WhatsApp
import {
  DEFAULT_CONNECTION_CONFIG,
  fetchLatestBaileysVersion,
  DisconnectReason,
  makeCacheableSignalKeyStore,
} from "baileys";
import { loadAuthState } from "./auth.js";
import { logger } from "./logger.js";
import { AUTH_DIR } from "./config.js";

/**
 * Memeriksa versi terbaru Baileys
 */
export async function checkLatestVersion() {
  const { version, isLatest } = await fetchLatestBaileysVersion();
  logger.info(
    `WhatsApp Web versi: ${version.join(".")} ${isLatest ? "(terbaru)" : "(update tersedia)"}`,
  );
  return { version, isLatest };
}

/**
 * Membuat koneksi WhatsApp socket
 * @param {Object} options - Opsi konfigurasi
 */
export async function createWhatsAppConnection(options = {}) {
  const { state, saveCreds } = await loadAuthState(AUTH_DIR);
  const { version } = await checkLatestVersion();

  const connectionConfig = {
    version,
    logger,
    waWebSocketUrl:
      process.env.SOCKET_URL ?? DEFAULT_CONNECTION_CONFIG.waWebSocketUrl,
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, logger),
    },
    msgRetryCounterCache: options.msgRetryCounterCache,
    generateHighQualityLinkPreview: true,
    getMessage: options.getMessage,
    ...options.extraConfig,
  };

  const sock = await options.makeWASocket(connectionConfig);

  return { sock, state, saveCreds };
}
