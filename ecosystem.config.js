module.exports = {
  apps: [
    {
      name: "frontend-nextjs",
      script: "npm",
      args: "run dev",
      cwd: "./frontend",
      env: {
        PORT: process.env.FRONTEND_PORT || 3000,
        NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL
      }
    },
    {
      name: "backend-api",
      script: "python3 backend/app/main.py",
      env: {
        BACKEND_PORT: process.env.BACKEND_PORT || 8000,
        DB_HOST: process.env.DB_HOST,
        DB_PORT: process.env.DB_PORT,
        DB_DATABASE: process.env.DB_DATABASE,
        DB_USERNAME: process.env.DB_USERNAME,
        DB_PASSWORD: process.env.DB_PASSWORD
      }
    }
  ]
}

