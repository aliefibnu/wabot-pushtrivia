// message-handler.js - Handler untuk pesan masuk dan keluar
import { generateMessageIDV2, isJidNewsletter } from "baileys";
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
    "[Pesan non-teks]"
  );
}

/**
 * Mendapatkan tipe pesan
 */
function getMessageType(message) {
  if (!message) return "unknown";

  if (message.conversation) return "teks";
  if (message.extendedTextMessage) return "teks_panjang";
  if (message.imageMessage) return "gambar";
  if (message.videoMessage) return "video";
  if (message.audioMessage) return "audio";
  if (message.documentMessage) return "dokumen";
  if (message.stickerMessage) return "stiker";
  if (message.locationMessage) return "lokasi";
  if (message.contactMessage) return "kontak";
  return "lainnya";
}

/**
 * Menampilkan informasi pesan
 */
function displayMessageInfo(msg, sock) {
  const isFromMe = msg.key.fromMe;
  const direction = isFromMe ? "📤 KELUAR" : "📥 MASUK";
  const sender = isFromMe ? "Saya" : msg.key.remoteJid || "Unknown";
  const messageType = getMessageType(msg.message);
  const text = extractMessageText(msg.message);
  const timestamp = formatTimestamp(msg.messageTimestamp);

  console.log("\n" + "═".repeat(50));
  console.log(`${direction} | ${timestamp}`);
  console.log("─".repeat(50));
  console.log(`Dari    : ${sender}`);
  console.log(`Ke      : ${isFromMe ? msg.key.remoteJid : "Saya"}`);
  console.log(`Tipe    : ${messageType}`);
  console.log(`ID      : ${msg.key.id}`);

  if (text) {
    console.log(`Pesan   : ${text}`);
  }

  // Info tambahan jika ada
  if (msg.pushName && !isFromMe) {
    console.log(`Nama    : ${msg.pushName}`);
  }

  if (msg.message?.extendedTextMessage?.contextInfo?.quotedMessage) {
    const quotedText = extractMessageText(
      msg.message.extendedTextMessage.contextInfo.quotedMessage,
    );
    if (quotedText) {
      console.log(`Balasan : "${quotedText}"`);
    }
  }

  console.log("═".repeat(50) + "\n");
}

/**
 * Menangani pesan masuk
 */
export async function handleIncomingMessages(upsert, sock) {
  logger.debug(upsert, "Pesan masuk (debug)");

  if (upsert.type === "notify") {
    for (const msg of upsert.messages) {
      // Tampilkan SEMUA pesan (baik dari saya maupun orang lain)
      if (FLAGS.logAllMessages) {
        displayMessageInfo(msg, sock);
      } else {
        // Default: hanya tampilkan pesan dari orang lain
        if (!msg.key.fromMe && !isJidNewsletter(msg.key.remoteJid)) {
          displayMessageInfo(msg, sock);
        }
      }

      // Auto-reply logic
      if (
        FLAGS.doReplies &&
        !msg.key.fromMe &&
        !isJidNewsletter(msg.key.remoteJid)
      ) {
        const text = extractMessageText(msg.message);
        if (text) {
          await sendAutoReply(msg, text, sock);
        }
      }
    }
  }
}

/**
 * Mengirim balasan otomatis
 */
export async function sendAutoReply(msg, incomingText, sock) {
  if (!sock?.user?.id) {
    logger.warn("User ID tidak tersedia, tidak bisa mengirim balasan");
    return;
  }

  const messageId = generateMessageIDV2(sock.user.id);
  const replyText =
    `🤖 Halo! Saya bot otomatis.\n\n` +
    `📝 Pesan Anda: "${incomingText}"\n\n` +
    `⏰ Saat ini saya hanya bisa membalas secara otomatis. Maaf ya! 😊`;

  try {
    await sock.sendMessage(
      msg.key.remoteJid,
      { text: replyText },
      { messageId },
    );

    console.log(`✅ Balasan terkirim ke ${msg.key.remoteJid}`);
    logger.info({ to: msg.key.remoteJid }, "Balasan otomatis terkirim");
  } catch (error) {
    console.error(`❌ Gagal mengirim balasan: ${error.message}`);
    logger.error({ error }, "Gagal mengirim balasan otomatis");
  }
}

/**
 * Menangani update pesan
 */
export function handleMessageUpdate(updates) {
  logger.debug(updates, "Pesan diupdate");

  if (FLAGS.logAllMessages) {
    console.log("📝 Update pesan diterima:");
    for (const { update } of updates) {
      if (update.message) {
        console.log(`  - Pesan diedit: ${extractMessageText(update.message)}`);
      }
      if (update.status) {
        console.log(`  - Status berubah menjadi: ${update.status}`);
      }
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
      console.log(`📊 Status pesan ${receipt.id}: ${status}`);
    }
  }
}
