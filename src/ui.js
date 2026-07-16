// ui.js - User Interface helpers
import readline from "node:readline";
import { FLAGS } from "./config.js";

/**
 * Membuat readline interface
 */
export function createReadlineInterface() {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
}

/**
 * Menampilkan banner startup
 */
export function displayStartupBanner() {
  console.clear();
  console.log("╔══════════════════════════════════════════════╗");
  console.log("║        WHATSAPP BOT - PESAN SAJA            ║");
  console.log("╚══════════════════════════════════════════════╝");
  console.log("");
  console.log("📋 Mode yang diaktifkan:");
  console.log(`   ✅ Menerima & menampilkan pesan`);
  console.log(
    `   ✅ Log semua pesan ${FLAGS.logAllMessages ? "(AKTIF)" : "(Hanya pesan masuk)"}`,
  );
  console.log(
    `   ✅ Pairing code ${FLAGS.usePairingCode ? "(AKTIF)" : "(QR code)"}`,
  );
  console.log(`   ❌ Panggilan suara/video (dinonaktifkan)`);
  console.log(`   ❌ Auto-reply (dinonaktifkan)`);
  console.log("");
  console.log("💡 Tips:");
  console.log("   --use-pairing-code : Gunakan pairing code");
  console.log("   --log-all          : Tampilkan semua pesan");
  console.log("");
}

/**
 * Menampilkan menu bantuan
 */
export function displayHelp() {
  console.log("\n📖 Perintah yang tersedia:");
  console.log("   help     - Tampilkan bantuan ini");
  console.log("   clear    - Bersihkan layar");
  console.log("   info     - Tampilkan status bot");
  console.log("   exit/quit - Keluar dari bot");
  console.log("");
}

/**
 * Menampilkan info status bot
 */
export function displayBotInfo(sock) {
  console.log("\n" + "═".repeat(50));
  console.log("  📊 STATUS BOT");
  console.log("─".repeat(50));
  console.log(`  🟢 Status  : ${sock?.user ? "Terhubung" : "Tidak terhubung"}`);
  console.log(`  📱 Nomor   : ${sock?.user?.id?.split(":")[0] || "N/A"}`);
  console.log(
    `  📋 Mode    : ${FLAGS.logAllMessages ? "Log semua" : "Pesan masuk"}`,
  );
  console.log(
    `  🔑 Auth    : ${FLAGS.usePairingCode ? "Pairing code" : "QR code"}`,
  );
  console.log("═".repeat(50) + "\n");
}
