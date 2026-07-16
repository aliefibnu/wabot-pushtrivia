// message-handler.js - Handler untuk pesan masuk
import { isJidNewsletter } from "baileys";
import { logger } from "./logger.js";
import { FLAGS } from "./config.js";

/**
 * Format timestamp ke string yang readable
 */
function formatTimestamp(timestamp) {
  if (!timestamp) return "Waktu tidak diketahui";
  const date = new Date(timestamp * 1000);
  return date.toLocaleString("id-ID", {
    timeZone: "Asia/Jakarta",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

/**
 * Mendapatkan teks dari pesan
 */
function extractMessageText(message) {
  if (!message) return null;

  return (
    message.conversation ||
    message.extendedTextMessage?.text ||
    message.imageMessage?.caption ||
    message.videoMessage?.caption ||
    message.documentMessage?.caption ||
    message.audioMessage?.caption ||
    "[Pesan non-teks]"
  );
}

/**
 * Mendapatkan tipe pesan
 */
function getMessageType(message) {
  if (!message) return "unknown";

  if (message.conversation) return "📝 Teks";
  if (message.extendedTextMessage) return "📝 Teks Panjang";
  if (message.imageMessage) return "🖼️ Gambar";
  if (message.videoMessage) return "🎥 Video";
  if (message.audioMessage) return "🎵 Audio";
  if (message.documentMessage) return "📄 Dokumen";
  if (message.stickerMessage) return "🏷️ Stiker";
  if (message.locationMessage) return "📍 Lokasi";
  if (message.contactMessage) return "👤 Kontak";
  if (message.reactionMessage) return "💬 Reaksi";
  if (message.ephemeralMessage) return "⏳ Pesan Sementara";
  return "📦 Lainnya";
}

/**
 * Mendapatkan ID pengirim yang bersih
 */
function getCleanJid(jid) {
  if (!jid) return "Unknown";
  // Hapus domain untuk tampilan yang lebih bersih
  return jid.split("@")[0];
}

/**
 * Menampilkan informasi pesan di console
 */
function displayMessageInfo(msg) {
  const isFromMe = msg.key.fromMe;
  const direction = isFromMe ? "📤 PESAN KELUAR" : "📥 PESAN MASUK";
  const sender = isFromMe
    ? "Saya"
    : getCleanJid(msg.key.remoteJid) || "Unknown";
  const receiver = isFromMe ? getCleanJid(msg.key.remoteJid) : "Saya";
  const messageType = getMessageType(msg.message);
  const text = extractMessageText(msg.message);
  const timestamp = formatTimestamp(msg.messageTimestamp);

  console.log("\n" + "═".repeat(60));
  console.log(`  ${direction}`);
  console.log("─".repeat(60));
  console.log(`  🕐 Waktu  : ${timestamp}`);
  console.log(`  👤 Dari   : ${sender}`);
  console.log(`  👤 Ke     : ${receiver}`);
  console.log(`  📋 Tipe   : ${messageType}`);
  console.log(`  🆔 ID     : ${msg.key.id}`);

  if (text) {
    // Potong teks jika terlalu panjang
    const displayText =
      text.length > 100 ? text.substring(0, 100) + "..." : text;
    console.log(`  💬 Pesan  : ${displayText}`);
  }

  // Info tambahan jika ada
  if (msg.pushName && !isFromMe) {
    console.log(`  📛 Nama   : ${msg.pushName}`);
  }

  // Cek apakah ini pesan yang membalas pesan lain
  if (msg.message?.extendedTextMessage?.contextInfo?.quotedMessage) {
    const quotedText = extractMessageText(
      msg.message.extendedTextMessage.contextInfo.quotedMessage,
    );
    if (quotedText) {
      const displayQuoted =
        quotedText.length > 50
          ? quotedText.substring(0, 50) + "..."
          : quotedText;
      console.log(`  ↩️  Balasan: "${displayQuoted}"`);
    }
  }

  // Info tambahan untuk pesan media
  if (msg.message?.imageMessage) {
    console.log(
      `  📏 Ukuran : ${(msg.message.imageMessage.fileLength / 1024).toFixed(2)} KB`,
    );
    if (msg.message.imageMessage.mimetype) {
      console.log(`  📐 Format : ${msg.message.imageMessage.mimetype}`);
    }
  }

  if (msg.message?.videoMessage) {
    console.log(
      `  📏 Ukuran : ${(msg.message.videoMessage.fileLength / 1024).toFixed(2)} KB`,
    );
    console.log(`  ⏱️ Durasi : ${msg.message.videoMessage.seconds || 0} detik`);
  }

  if (msg.message?.audioMessage) {
    console.log(`  ⏱️ Durasi : ${msg.message.audioMessage.seconds || 0} detik`);
  }

  if (msg.message?.documentMessage) {
    console.log(
      `  📄 Nama   : ${msg.message.documentMessage.fileName || "Tidak ada nama"}`,
    );
    console.log(
      `  📏 Ukuran : ${(msg.message.documentMessage.fileLength / 1024).toFixed(2)} KB`,
    );
  }

  console.log("═".repeat(60));
}

/**
 * Menangani pesan masuk
 */
export async function handleIncomingMessages(upsert) {
  logger.debug(upsert, "Pesan masuk (debug)");

  if (upsert.type === "notify") {
    for (const msg of upsert.messages) {
      // Skip pesan dari newsletter
      if (isJidNewsletter(msg.key.remoteJid)) {
        continue;
      }

      // console.log(msg);

      // Tampilkan semua pesan (masuk & keluar)
      if (FLAGS.logAllMessages) {
        displayMessageInfo(msg);
      } else {
        // Default: hanya tampilkan pesan dari orang lain
        if (!msg.key.fromMe) {
          displayMessageInfo(msg);
        }
      }
    }
  }
}

/**
 * Menangani update pesan (pesan diedit, dihapus, dll)
 */
export function handleMessageUpdate(updates) {
  logger.debug(updates, "Pesan diupdate");

  for (const { update } of updates) {
    if (update.message) {
      const editedText = extractMessageText(update.message);
      console.log(`\n📝 Pesan diedit menjadi: "${editedText}"`);
    }
    if (update.status) {
      const statusMap = {
        read: "📖 Dibaca",
        delivered: "✓ Terkirim",
        played: "▶️ Diputar",
      };
      console.log(
        `\n📊 Status pesan: ${statusMap[update.status] || update.status}`,
      );
    }
  }
}

/**
 * Menangani receipt/status pesan
 */
export function handleMessageReceipt(receipts) {
  logger.debug(receipts, "Status pesan diupdate");

  if (FLAGS.logAllMessages) {
    for (const receipt of receipts) {
      const statusMap = {
        read: "📖 Dibaca",
        delivered: "✓ Terkirim",
        played: "▶️ Diputar",
      };
      const status = statusMap[receipt.status] || receipt.status;
      console.log(`📊 Status pesan: ${status} (ID: ${receipt.id})`);
    }
  }
}
