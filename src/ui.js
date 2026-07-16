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
  console.log("╔══════════════════════════════════════════╗");
  console.log("║        WHATSAPP BOT - MESSAGE ONLY      ║");
  console.log("╚══════════════════════════════════════════╝");
  console.log("");
  console.log("📋 Fitur yang diaktifkan:");
  console.log(`   ✅ Kirim & terima pesan teks`);
  console.log(`   ✅ Auto-reply ${FLAGS.doReplies ? "(AKTIF)" : "(Nonaktif)"}`);
  console.log(
    `   ✅ Log semua pesan ${FLAGS.logAllMessages ? "(AKTIF)" : "(Hanya pesan masuk)"}`,
  );
  console.log(`   ❌ Panggilan suara/video (dinonaktifkan)`);
  console.log("");
  console.log("💡 Tips:");
  console.log("   --do-reply        : Aktifkan auto-reply");
  console.log("   --use-pairing-code: Gunakan pairing code");
  console.log(
    "   --log-all         : Tampilkan semua pesan (termasuk pesan keluar)",
  );
  console.log("");
}

/**
 * Menampilkan menu bantuan
 */
export function displayHelp() {
  console.log("\n📖 Perintah yang tersedia:");
  console.log("   help  - Tampilkan bantuan ini");
  console.log("   clear - Bersihkan layar");
  console.log("   exit  - Keluar dari bot");
  console.log("");
}
