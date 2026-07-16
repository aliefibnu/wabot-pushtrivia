// main.js - Entry point utama
import { NodeCache } from "@cacheable/node-cache";
import makeWASocket from "baileys";
import { createWhatsAppConnection } from "./connection.js";
import { setupEventHandlers } from "./event-handler.js";
import {
  displayStartupBanner,
  displayHelp,
  displayBotInfo,
  createReadlineInterface,
} from "./ui.js";
import { logger } from "./logger.js";

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
      console.error("❌ Gagal membuat koneksi:", error.message);
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

  console.log('💡 Tips: Ketik "help" untuk melihat perintah yang tersedia.\n');

  rl.on("line", (input) => {
    const command = input.trim().toLowerCase();

    switch (command) {
      case "help":
        displayHelp();
        break;
      case "clear":
        console.clear();
        displayStartupBanner();
        console.log(
          '💡 Tips: Ketik "help" untuk melihat perintah yang tersedia.\n',
        );
        break;
      case "info":
        displayBotInfo(sock);
        break;
      case "exit":
      case "quit":
        console.log("\n👋 Bot dimatikan. Sampai jumpa!\n");
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

  // Mulai koneksi
  try {
    await restartConnection();
  } catch (error) {
    logger.fatal(error, "Gagal memulai bot");
    console.error("❌ Gagal memulai bot:", error.message);
    process.exit(1);
  }

  // Graceful shutdown
  process.on("SIGINT", () => {
    console.log("\n\n🛑 Menerima sinyal SIGINT...");
    console.log("👋 Bot dimatikan.\n");
    rl.close();
    process.exit(0);
  });

  process.on("SIGTERM", () => {
    console.log("\n\n🛑 Menerima sinyal SIGTERM...");
    console.log("👋 Bot dimatikan.\n");
    rl.close();
    process.exit(0);
  });
}

// Jalankan aplikasi
main();
