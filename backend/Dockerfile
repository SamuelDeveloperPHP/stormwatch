# Imagem enxuta para o backend Node.
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY src ./src
ENV NODE_ENV=production
EXPOSE 4000
# Roda como usuário não-root (boa prática de segurança)
USER node
CMD ["node", "src/server.js"]
