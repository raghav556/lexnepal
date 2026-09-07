module.exports = {
  apps: [
    {
      name: "lexnepal-web",
      script: "app.cjs",
      cwd: process.env.APP_PATH || __dirname,
      env: {
        NODE_ENV: "production",
        PORT: process.env.PORT || "3001",
        HOSTNAME: process.env.HOSTNAME || "127.0.0.1",
      },
    },
    {
      name: "lexnepal-worker",
      script: "runtime/worker.mjs",
      node_args: "--conditions=react-server",
      cwd: process.env.APP_PATH || __dirname,
      env: {
        NODE_ENV: "production",
      },
    },
    {
      name: "lexnepal-scheduler",
      script: "runtime/scheduler.mjs",
      node_args: "--conditions=react-server",
      cwd: process.env.APP_PATH || __dirname,
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};
