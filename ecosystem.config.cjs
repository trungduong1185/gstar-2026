module.exports = {
  apps: [
    {
      name: "gstar",
      cwd: "/summitnewturingai/summit.newturing.ai/public_html/gstar/current",
      script: "scripts/start-standalone.mjs",
      env: {
        NODE_ENV: "production",
        HOSTNAME: "127.0.0.1",
        PORT: "3010",
      },
    },
  ],
};
