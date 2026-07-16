import { Boom } from "@hapi/boom";
import { NodeCache } from "@cacheable/node-cache";
import readline from "node:readline";
import pino from "pino";

import {
  DEFAULT_CONNECTION_CONFIG,
  DisconnectReason,
  fetchLatestBaileysVersion,
  generateMessageIDV2,
  isJidNewsletter,
  makeCacheableSignalKeyStore,
  default as makeWASocket,
  useMultiFileAuthState,
} from "baileys";

// Konfigurasi logging
const LOG_LEVEL = "warn";

const logger = pino({
  level: LOG_LEVEL,
  transport: {
    targets: [
      {
        target: "pino-pretty",
        options: {
          colorize: true,
        },
        level: LOG_LEVEL,
      },
      {
        target: "pino/file",
        options: {
          destination: "./wa-logs.txt",
        },
        level: LOG_LEVEL,
      },
    ],
  },
});

logger.level = LOG_LEVEL;

// Flag dari command line
const doReplies = process.argv.includes("--do-reply");
const usePairingCode = process.argv.includes("--use-pairing-code");

// Cache untuk retry counter
const msgRetryCounterCache = new NodeCache();

// Readline interface untuk input user
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const question = (text) => new Promise((resolve) => rl.question(text, resolve));

/**
 * Memulai koneksi WhatsApp socket
 */
async function startWhatsAppSocket() {
  // Load auth state
  const { state, saveCreds } = await useMultiFileAuthState("baileys_auth_info");

  // Set ADV secret key jika ada
  if (process.env.ADV_SECRET_KEY) {
    state.creds.advSecretKey = process.env.ADV_SECRET_KEY;
  }

  // Cek versi Baileys terbaru
  const { version, isLatest } = await fetchLatestBaileysVersion();
  logger.info(
    { version: version.join("."), isLatest },
    "Menggunakan WhatsApp versi terbaru",
  );

  // Membuat WhatsApp socket
  const sock = makeWASocket({
    version,
    logger,
    waWebSocketUrl:
      process.env.SOCKET_URL ?? DEFAULT_CONNECTION_CONFIG.waWebSocketUrl,
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, logger),
    },
    msgRetryCounterCache,
    generateHighQualityLinkPreview: true,
    getMessage,
  });

  // Event handler utama
  sock.ev.process(async (events) => {
    // Handle koneksi
    if (events["connection.update"]) {
      await handleConnectionUpdate(events["connection.update"]);
    }

    // Handle kredensial
    if (events["creds.update"]) {
      await saveCreds();
      logger.debug("Kredensial berhasil disimpan");
    }

    // Handle pesan masuk
    if (events["messages.upsert"]) {
      await handleIncomingMessages(events["messages.upsert"]);
    }

    // Handle update pesan
    if (events["messages.update"]) {
      logger.debug(events["messages.update"], "Pesan diupdate");
    }

    // Handle receipt
    if (events["message-receipt.update"]) {
      logger.debug(events["message-receipt.update"], "Status pesan diupdate");
    }
  });

  return sock;

  /**
   * Menangani update status koneksi
   */
  async function handleConnectionUpdate(update) {
    const { connection, lastDisconnect, qr } = update;

    // Handle disconnect
    if (connection === "close") {
      const statusCode = lastDisconnect?.error?.output?.statusCode;

      if (statusCode !== DisconnectReason.loggedOut) {
        logger.warn("Koneksi terputus. Mencoba menghubungkan kembali...");
        startWhatsAppSocket();
      } else {
        logger.fatal("Anda telah logout. Silakan scan QR code ulang.");
        process.exit(1);
      }
    }

    // Handle QR code atau pairing code
    if (qr) {
      if (usePairingCode && !sock.authState.creds.registered) {
        console.log("\n=== MODE PAIRING CODE ===");
        const phoneNumber = await question(
          "Masukkan nomor telepon (contoh: 6281234567890):\n",
        );
        const code = await sock.requestPairingCode(phoneNumber);
        console.log(`\nPairing code Anda: ${code}`);
        console.log(
          "Masukkan kode ini di WhatsApp Anda (Perangkat Tertaut > Tautkan Perangkat)\n",
        );
      } else if (!usePairingCode) {
        console.log("\n=== SCAN QR CODE ===");
        console.log("Silakan scan QR code yang muncul di terminal");
        console.log("(WhatsApp > Perangkat Tertaut > Tautkan Perangkat)\n");
      }
    }

    logger.debug(update, "Update koneksi");
  }

  /**
   * Menangani pesan masuk
   */
  async function handleIncomingMessages(upsert) {
    logger.debug(upsert, "Pesan masuk");

    if (upsert.type === "notify") {
      for (const msg of upsert.messages) {
        // Ambil teks pesan
        const text =
          msg.message?.conversation || msg.message?.extendedTextMessage?.text;

        if (!text) continue;

        // Cek apakah pesan dari diri sendiri dan newsletter
        if (msg.key.fromMe || isJidNewsletter(msg.key.remoteJid)) {
          continue;
        }

        // Log pesan masuk
        const sender = msg.key.remoteJid;
        logger.info({ from: sender, message: text }, "Pesan baru diterima");

        // Auto-reply jika diaktifkan
        if (doReplies) {
          await sendAutoReply(msg, text);
        }
      }
    }
  }

  /**
   * Mengirim balasan otomatis
   */
  async function sendAutoReply(msg, incomingText) {
    const messageId = generateMessageIDV2(sock.user?.id);
    const replyText = `Halo! Saya bot otomatis.\nPesan Anda: "${incomingText}"\n\nMaaf, saat ini saya belum bisa membalas dengan pintar. 😊`;

    try {
      await sock.sendMessage(
        msg.key.remoteJid,
        { text: replyText },
        { messageId },
      );

      logger.info({ to: msg.key.remoteJid }, "Balasan terkirim");
    } catch (error) {
      logger.error({ error }, "Gagal mengirim balasan");
    }
  }

  /**
   * Get dummy message (diperlukan oleh Baileys)
   */
  async function getMessage(key) {
    return {
      conversation: "Pesan tidak tersedia",
    };
  }
}

// Menjalankan bot
console.log("╔══════════════════════════════════════╗");
console.log("║     WHATSAPP BOT - PESAN SAJA      ║");
console.log("╚══════════════════════════════════════╝");
console.log("");
console.log("Fitur yang diaktifkan:");
console.log("  ✅ Kirim & terima pesan teks");
console.log("  ✅ Auto-reply" + (doReplies ? " (AKTIF)" : " (nonaktif)"));
console.log("  ❌ Panggilan suara/video (dinonaktifkan)");
console.log("  ❌ Newsletter dan fitur lainnya");
console.log("");

try {
  await startWhatsAppSocket();
} catch (error) {
  logger.fatal(error, "Gagal memulai bot WhatsApp");
  process.exit(1);
}
