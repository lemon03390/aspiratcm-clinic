module.exports = {
  apps: [{
    name: "backend-api",
    script: "python3",
    args: "run.py",
    cwd: "./app",
    env: {
      NODE_ENV: "development",
    },
    env_production: {
      NODE_ENV: "production",
    }
  }]
} 