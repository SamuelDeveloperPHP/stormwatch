# 1) Build do frontend (Vite). A chave da API é embutida no bundle em build time.
FROM node:20-slim AS build
WORKDIR /app
ARG VITE_APP_API_KEY
ENV VITE_API_BASE="" VITE_APP_API_KEY=$VITE_APP_API_KEY
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# 2) Caddy servindo o estático + proxy /api + HTTPS automático.
FROM caddy:2-alpine
COPY docker/Caddyfile /etc/caddy/Caddyfile
COPY --from=build /app/dist /srv
