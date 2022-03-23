import path from 'path';
import { fileURLToPath } from 'url';

import winston from 'winston';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let DEFAULT_LOG_LEVEL = 'info';

const logger = winston.createLogger({
  level: DEFAULT_LOG_LEVEL,
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(winston.format.timestamp(), winston.format.colorize(), winston.format.simple()),
    }),
    new winston.transports.File({
      filename: path.normalize(`${__dirname}/../logs/spotbot.log`),
      maxsize: 1024 * 1024, // 1 MB files maximum
      maxFiles: 30,
      tailable: true,
      format: winston.format.combine(winston.format.timestamp(), winston.format.simple()),
    }),
  ]
});

function setLogLevel(level) {
  logger.level = level;
}

export {
  logger,
  setLogLevel
};

export default logger;
