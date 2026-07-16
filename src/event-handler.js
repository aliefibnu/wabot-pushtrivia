// event-handler.js - Event handler utama WhatsApp
import { DisconnectReason } from "baileys";
import { logger } from "./logger.js";
import { FLAGS } from "./config.js";
import {
  handleIncomingMessages,
  handleMessageUpdate,
  handleMessageReceipt,
} from "./message-handler.js";

/**
 * Setup semua event handler WhatsApp
 * @param {Object} sock - WhatsApp socket
 * @param {Object} options - Opsi tambahan
 */
export function setupEventHandlers(sock, options = {}) {
  const { saveCreds, restartConnection } = options;

  sock.ev.process(async (events) => {
    // Event koneksi
    if (events["connection.update"]) {
      await handleConnectionUpdate(
        events["connection.update"],
        sock,
        restartConnection,
      );
    }

    // Event kredensial
    if (events["creds.update"]) {
      await saveCreds();
      logger.debug("✅ Kredensial berhasil disimpan");
    }

    // Event pesan masuk
    if (events["messages.upsert"]) {
      await handleIncomingMessages(events["messages.upsert"]);
    }

    // Event update pesan
    if (events["messages.update"]) {
      handleMessageUpdate(events["messages.update"]);
    }

    // Event status pesan
    if (events["message-receipt.update"]) {
      handleMessageReceipt(events["message-receipt.update"]);
    }
  });
}

/**
 * Menangani update status koneksi
 */
async function handleConnectionUpdate(update, sock, restartConnection) {
  const { connection, lastDisconnect, qr } = update;

  if (connection === "close") {
    const statusCode = lastDisconnect?.error?.output?.statusCode;

    if (statusCode !== DisconnectReason.loggedOut) {
      console.log("\n⚠️  Koneksi terputus. Mencoba menghubungkan kembali...");
      logger.warn("Koneksi terputus, mencoba reconnect...");
      setTimeout(() => restartConnection(), 3000); // Delay 3 detik sebelum reconnect
    } else {
      console.log("\n❌ Anda telah LOGOUT!");
      console.log(
        "Silakan hapus folder 'baileys_auth_info' dan jalankan ulang bot.\n",
      );
      logger.fatal("User telah logout");
      process.exit(1);
    }
    return;
  }

  if (connection === "open") {
    console.log("\n" + "═".repeat(60));
    console.log("  ✅ Berhasil terhubung ke WhatsApp!");
    console.log("─".repeat(60));
    console.log(`  📱 Nomor   : ${sock.user?.id?.split(":")[0] || "Unknown"}`);
    console.log(`  🟢 Status  : Online`);
    console.log(
      `  📋 Mode    : ${FLAGS.logAllMessages ? "Log semua pesan" : "Log pesan masuk"}`,
    );
    console.log("═".repeat(60) + "\n");
    logger.info("WhatsApp terhubung");
  }

  if (qr) {
    if (FLAGS.usePairingCode && !sock.authState.creds.registered) {
      console.log("\n" + "═".repeat(60));
      console.log("  🔑 MODE PAIRING CODE");
      console.log("─".repeat(60));

      const readline = (await import("node:readline")).default;
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });
      const question = (text) =>
        new Promise((resolve) => rl.question(text, resolve));

      const phoneNumber = await question(
        "  📱 Masukkan nomor (contoh: 628xxx): ",
      );
      const code = await sock.requestPairingCode(phoneNumber);

      console.log("─".repeat(60));
      console.log(`  🔢 Kode pairing: ${code}`);
      console.log("─".repeat(60));
      console.log("  Buka WhatsApp > Perangkat Tertaut > Tautkan Perangkat");
      console.log("  Masukkan kode di atas");
      console.log("═".repeat(60) + "\n");
      rl.close();
    } else if (!FLAGS.usePairingCode) {
      console.log("\n" + "═".repeat(60));
      console.log("  📷 MODE QR CODE");
      console.log("─".repeat(60));
      console.log("  Silakan scan QR code yang muncul");
      console.log("  WhatsApp > Perangkat Tertaut > Tautkan Perangkat");
      console.log("═".repeat(60) + "\n");
    }
  }

  logger.debug(update, "Update koneksi (debug)");
}
