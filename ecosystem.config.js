// pm2 — mantém o ingestor (Python) e o backend (Node) sempre no ar,
// reinicia em caso de queda e sobe no boot (pm2 startup + pm2 save).
// Rodar a partir da raiz do projeto: `pm2 start ecosystem.config.js`
module.exports = {
  apps: [
    {
      name: "stormwatch-ingestor",
      cwd: "./ingestor",
      script: ".venv/bin/python", // no Linux; no Windows seria .venv/Scripts/python.exe
      args: "glm_service.py",
      autorestart: true,
      max_restarts: 20,
      env: { GLM_HOST: "127.0.0.1", GLM_PORT: "5055" },
    },
    {
      name: "stormwatch-backend",
      cwd: "./backend",
      script: "src/server.js", // interpretador padrão: node
      autorestart: true,
      max_restarts: 20,
      // As variáveis vêm do backend/.env (dotenv).
    },
  ],
};
