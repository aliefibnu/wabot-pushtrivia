// logger.js - Konfigurasi logging
import pino from "pino";
import { LOG_LEVEL } from "./config.js";

export const logger = pino({
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
