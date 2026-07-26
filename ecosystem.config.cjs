module.exports = {
  apps: [
    {
      name: "gstar-website",
      cwd: "/root/gstar-2026",
      script: "scripts/start-standalone.mjs",
      env: {
        NODE_ENV: "production",
        HOSTNAME: "127.0.0.1",
        PORT: "3001",
      },
    },
  ],
};
