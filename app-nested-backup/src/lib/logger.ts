/**
 * @file logger.ts
 * @description Structured logging (Phase 0.4). JSON format, log aggregation ready.
 * @module lib
 */

import winston from 'winston'

const level = process.env.NODE_ENV === 'production' ? 'info' : 'debug'

export const logger = winston.createLogger({
  level,
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'flixcam-rent' },
  transports: [
    new winston.transports.Console({
      format:
        process.env.NODE_ENV === 'production'
          ? winston.format.json()
          : winston.format.combine(winston.format.colorize(), winston.format.simple()),
    }),
  ],
})
