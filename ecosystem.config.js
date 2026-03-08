/**
 * PM2 ecosystem config — run app from repo root (/home/flixcam.rent).
 * Start: pm2 start ecosystem.config.js
 * Restart: pm2 restart flixcam-rent
 */
module.exports = {
  apps: [
    {
      name: 'flixcam-rent',
      cwd: '/home/flixcam.rent',
      script: 'npm',
      args: 'run start',
      env: { NODE_ENV: 'production', PORT: 3000 },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      merge_logs: true,
    },
  ],
};
