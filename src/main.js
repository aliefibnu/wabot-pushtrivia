// main.js - Entry point utama
import { NodeCache } from "@cacheable/node-cache";
import makeWASocket from "baileys";
import { createWhatsAppConnection } from "./connection.js";
import { setupEventHandlers } from "./event-handler.js";
import {
  displayStartupBanner,
  displayHelp,
  createReadlineInterface,
} from "./ui.js";
import { logger } from "./logger.js";
import { FLAGS } from "./config.js";

/**
 * Fungsi utama untuk menjalankan bot
 */
async function main() {
  displayStartupBanner();

  const msgRetryCounterCache = new NodeCache();
  let sock = null;
  let saveCreds = null;

  /**
   * Memulai ulang koneksi
   */
  async function restartConnection() {
    logger.info("Memulai ulang koneksi...");
    try {
      const connection = await createWhatsAppConnection({
        msgRetryCounterCache,
        makeWASocket,
        getMessage,
      });

      sock = connection.sock;
      saveCreds = connection.saveCreds;

      setupEventHandlers(sock, {
        saveCreds,
        restartConnection,
      });
    } catch (error) {
      logger.fatal(error, "Gagal membuat koneksi");
      process.exit(1);
    }
  }

  /**
   * Get dummy message (diperlukan Baileys)
   */
  async function getMessage(key) {
    return {
      conversation: "📩 Pesan tidak tersedia",
    };
  }

  // Setup input dari user (terminal)
  const rl = createReadlineInterface();

  rl.on("line", (input) => {
    const command = input.trim().toLowerCase();

    switch (command) {
      case "help":
        displayHelp();
        break;
      case "clear":
        console.clear();
        displayStartupBanner();
        break;
      case "exit":
      case "quit":
        console.log("\n👋 Sampai jumpa!\n");
        rl.close();
        process.exit(0);
        break;
      default:
        if (command) {
          console.log(
            `❓ Perintah tidak dikenal: "${command}". Ketik "help" untuk bantuan.`,
          );
        }
    }
  });

  console.log('💡 Ketik "help" untuk melihat perintah yang tersedia.\n');

  // Mulai koneksi
  try {
    await restartConnection();
  } catch (error) {
    logger.fatal(error, "Gagal memulai bot");
    process.exit(1);
  }

  // Graceful shutdown
  process.on("SIGINT", () => {
    console.log("\n\n🛑 Menerima sinyal SIGINT...");
    rl.close();
    process.exit(0);
  });

  process.on("SIGTERM", () => {
    console.log("\n\n🛑 Menerima sinyal SIGTERM...");
    rl.close();
    process.exit(0);
  });
}

// Jalankan aplikasi
main();
