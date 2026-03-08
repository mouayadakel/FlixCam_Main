/**
 * PM2 ecosystem config for FlixCam (standard single-app production layout).
 * Copy to /home/flixcam/pm2/ecosystem.config.js on the VPS.
 * Start: pm2 start /home/flixcam/pm2/ecosystem.config.js --update-env
 */
const HOME = process.env.HOME_FLIXCAM || '/home/flixcam';
const PRODUCTION_CWD = process.env.PRODUCTION_APP_PATH || `${HOME}/public_html/app`;

module.exports = {
  apps: [
    {
      name: 'flixcam-production',
      cwd: PRODUCTION_CWD,
      script: 'npm',
      args: 'run start',
      env: { NODE_ENV: 'production', PORT: 3000 },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      error_file: `${HOME}/logs/production/error.log`,
      out_file: `${HOME}/logs/production/out.log`,
      merge_logs: true,
    },
  ],
};
