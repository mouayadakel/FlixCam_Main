/**
 * PM2 ecosystem config — run app from repo root (/home/flixcam.rent).
 * Start: pm2 start ecosystem.config.js
 * Restart: pm2 restart flixcam-rent
 *
 * IMPORTANT: Use fork mode with direct binaries — NOT `npm run` in cluster mode
 * (npm exits after spawning the child, which causes infinite PM2 restart loops).
 *
 * Log rotation (VPS, once): sudo bash scripts/setup-pm2-logrotate.sh
 * Health watchdog: scripts/health-watchdog.sh (cron every 5 min)
 */
module.exports = {
  apps: [
    {
      name: 'flixcam-rent',
      cwd: '/home/flixcam.rent',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 3000',
      exec_mode: 'fork',
      instances: 1,
      env: { NODE_ENV: 'production', PORT: 3000 },
      autorestart: true,
      watch: false,
      min_uptime: '10s',
      max_restarts: 15,
      restart_delay: 5000,
      max_memory_restart: '1G',
      merge_logs: true,
      time: true,
    },
    {
      name: 'flixcam-workers',
      cwd: '/home/flixcam.rent',
      script: 'node_modules/.bin/tsx',
      args: 'scripts/start-workers.ts',
      interpreter: 'none',
      exec_mode: 'fork',
      instances: 1,
      env: { NODE_ENV: 'production' },
      autorestart: true,
      watch: false,
      min_uptime: '10s',
      max_restarts: 15,
      restart_delay: 5000,
      max_memory_restart: '768M',
      merge_logs: true,
      time: true,
    },
  ],
};
