# Backend Node/Express — imagem de produção
FROM node:20-slim

WORKDIR /app

# Instala só as dependências de produção (pino-pretty é dev e não é usado em prod)
COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

ENV NODE_ENV=production
EXPOSE 4000

CMD ["node", "src/server.js"]
