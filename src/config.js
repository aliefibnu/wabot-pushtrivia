// config.js - Konfigurasi global
export const LOG_LEVEL = "warn";

export const FLAGS = {
  doReplies: process.argv.includes("--do-reply"),
  usePairingCode: process.argv.includes("--use-pairing-code"),
  logAllMessages: process.argv.includes("--log-all"),
};

export const AUTH_DIR = "baileys_auth_info";
