# Deploy — StormWatch (Google Cloud / Compute Engine)

Sobe os três serviços — **ingestor (Python)**, **backend (Node)** e **frontend (React)** — numa VM Linux, com **pm2** (mantém os processos no ar) e **Caddy** (HTTPS automático + proxy da API).

> Arquitetura no servidor: o Caddy atende a porta 443 e faz `/api/*` → backend (`:4000`); todo o resto serve o frontend estático. O backend fala com o ingestor em `127.0.0.1:5055` (tudo na mesma VM).
>
> **Duas formas de subir (a Seção 1 vale para ambas):** com **Docker** (Seção 2 — recomendado, sobe com um comando) ou **manualmente** com pm2 + Caddy (alternativa ao final).

---

## 1. Criar a VM no Google Cloud

1. Em [console.cloud.google.com](https://console.cloud.google.com), crie um **projeto** e ative o **faturamento** (use o crédito de US$ 300).
2. **Compute Engine → Instâncias de VM → Criar instância**:
   - **Região:** `southamerica-east1` (São Paulo)
   - **Tipo de máquina:** `e2-medium` (4 GB — recomendado) ou `e2-small` (2 GB)
   - **Disco de inicialização:** Ubuntu **24.04 LTS**
   - **Firewall:** marque **Permitir tráfego HTTP** e **Permitir tráfego HTTPS**
3. Anote o **IP externo** da VM.
4. Conecte via **SSH** (botão "SSH" na Console, ou `gcloud compute ssh`).

---

## 2. Deploy com Docker (recomendado)

Sobe os três serviços com um comando — só precisa de Docker na VM.

```bash
# Instalar Docker (uma vez)
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER && newgrp docker   # usar docker sem sudo

# Clonar
sudo mkdir -p /opt/stormwatch && sudo chown $USER:$USER /opt/stormwatch
git clone https://github.com/SamuelDeveloperPHP/stormwatch.git /opt/stormwatch
cd /opt/stormwatch

# Configurar
cp .env.example .env
nano .env    # defina SITE_HOST (domínio/duckdns) e APP_API_KEY (openssl rand -hex 32)

# Subir (build + start em background)
docker compose up -d --build

# Estado / logs
docker compose ps
docker compose logs -f
```

Pronto: os 3 serviços sobem, o **Caddy emite o HTTPS automaticamente** para o `SITE_HOST`, e o app fica em **https://SITE_HOST**.

- O `APP_API_KEY` do `.env` é usado no backend **e** embutido no build do frontend — não precisa duplicar.
- Dados (armazém de 24 h) e certificados TLS ficam em **volumes Docker** e sobrevivem a `docker compose down`.

**Atualizar depois:**

```bash
cd /opt/stormwatch && git pull && docker compose up -d --build
```

**Comandos úteis (Docker):**

```bash
docker compose logs -f ingestor    # poller da NOAA
docker compose logs -f backend     # API + monitor de segurança
docker compose restart backend
docker compose down                # parar tudo (volumes preservados)
```

---

## Alternativa — Deploy sem Docker (pm2 + Caddy)

Os passos abaixo são o caminho manual, caso você não queira usar Docker.

### Preparar o servidor (só na primeira vez)

```bash
sudo apt update && sudo apt -y upgrade
# Node 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs python3-venv python3-pip git build-essential
# pm2 (gerenciador de processos)
sudo npm install -g pm2
# Caddy (servidor web + HTTPS automático)
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update && sudo apt install -y caddy
```

---

### Clonar e configurar

```bash
sudo mkdir -p /opt/stormwatch && sudo chown $USER:$USER /opt/stormwatch
git clone https://github.com/SamuelDeveloperPHP/stormwatch.git /opt/stormwatch
cd /opt/stormwatch

# Ingestor (Python)
cd ingestor
python3 -m venv .venv
./.venv/bin/pip install -r requirements.txt
cd ..

# Backend (Node)
cd backend
npm ci
```

### `.env` de produção do backend

```bash
# em /opt/stormwatch/backend
cat > .env <<EOF
NODE_ENV=production
PORT=4000
CORS_ORIGINS=https://SEU_HOST
APP_API_KEY=$(openssl rand -hex 32)
LIGHTNING_PROVIDER=goesglm
FORECAST_PROVIDER=openmeteo
GLM_SERVICE_URL=http://127.0.0.1:5055
MONITOR_LAT=-25.5306
MONITOR_LON=-49.2939
MONITOR_LABEL=Pinheirinho, Curitiba - PR
ALERT_RADIUS_KM=8
EOF
# ANOTE a chave gerada — o frontend precisa dela:
grep APP_API_KEY .env
cd ..
```

### Frontend (build)

```bash
cd frontend
npm ci
# mesma origem (o Caddy faz o proxy de /api) + a MESMA chave do backend
cat > .env <<EOF
VITE_API_BASE=
VITE_APP_API_KEY=COLE_AQUI_A_APP_API_KEY_DO_BACKEND
EOF
npm run build   # gera frontend/dist
cd ..
```

---

### Subir os serviços (pm2)

```bash
cd /opt/stormwatch
pm2 start ecosystem.config.js
pm2 save
pm2 startup     # rode o comando (systemd) que ele imprimir, p/ subir no boot
pm2 status      # ingestor e backend devem aparecer "online"
```

---

### HTTPS (Caddy)

Escolha o `SEU_HOST`:
- **Com domínio:** aponte um registro **A** do domínio para o IP da VM e use `stormwatch.seudominio.com`.
- **Sem domínio (grátis):** use `IP.sslip.io` — ex.: se o IP é `203.0.113.5`, use `203.0.113.5.sslip.io`. O Caddy emite o certificado normalmente.

Edite o `Caddyfile` (troque `SEU_HOST` nas duas ocorrências — o `server_name` e o `CORS_ORIGINS` do `.env`), depois:

```bash
sudo cp /opt/stormwatch/Caddyfile /etc/caddy/Caddyfile
sudo systemctl reload caddy
```

Acesse **https://SEU_HOST** 🎉

---

### Atualizar depois (sem Docker)

```bash
cd /opt/stormwatch
git pull
cd frontend && npm ci && npm run build && cd ..
cd backend && npm ci && cd ..
pm2 restart all
```

### Comandos úteis (sem Docker)

- `pm2 status` / `pm2 logs` — estado e logs dos serviços
- `pm2 logs stormwatch-ingestor` — logs só do poller da NOAA
- `sudo systemctl status caddy` / `sudo journalctl -u caddy -f` — Caddy/HTTPS
- `curl -s http://127.0.0.1:5055/health` — checa o ingestor
- `curl -s -H "x-api-key: SUACHAVE" http://127.0.0.1:4000/api/health` — checa o backend

> Se o `pip install` do netCDF4 falhar (raro em x86), o `build-essential` já instalado cobre a compilação.
