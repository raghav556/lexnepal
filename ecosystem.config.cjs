module.exports = {
  apps: [
    {
      name: "lexnepal-web",
      script: ".next/standalone/app.cjs",
      cwd: process.env.APP_PATH || __dirname,
      env: {
        NODE_ENV: "production",
        PORT: process.env.PORT || "3001",
        HOSTNAME: process.env.HOSTNAME || "127.0.0.1",
      },
    },
    {
      name: "lexnepal-worker",
      script: "npm",
      args: "run jobs:worker",
      cwd: process.env.APP_SOURCE_PATH || __dirname,
      env: {
        NODE_ENV: "production",
      },
    },
    {
      name: "lexnepal-scheduler",
      script: "npm",
      args: "run jobs:scheduler",
      cwd: process.env.APP_SOURCE_PATH || __dirname,
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};
