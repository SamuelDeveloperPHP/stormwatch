# StormWatch ⚡

Aplicação de **monitoramento de raios e previsão do tempo** (estilo WeatherBug), com **alertas automáticos via webhook** quando um raio cai dentro de um raio crítico — pronto para plugar num grupo de WhatsApp.

> **Status dos dados:** a fonte de raios vem **simulada (mock)** por padrão. A previsão do tempo também. Toda a arquitetura já está preparada para você trocar por APIs reais sem reescrever o app — basta implementar os adapters e configurar o `.env`.

---

## Arquitetura

```
┌─────────────────┐        /api (x-api-key)        ┌──────────────────────┐
│   Frontend       │ ─────────────────────────────▶│   Backend (Express)   │
│  React + Vite    │                                │  • valida API key      │
│  Leaflet (mapa)  │◀───────── JSON ────────────────│  • CORS restrito       │
└─────────────────┘                                │  • rate limit          │
                                                    │  • Helmet              │
                                                    └─────────┬────────────┘
                                                              │
                              ┌───────────────────────────────┼───────────────────────────┐
                              ▼                                ▼                           ▼
                   ┌────────────────────┐        ┌────────────────────┐      ┌────────────────────┐
                   │ Adapter de RAIOS   │        │ Avaliador de risco  │      │  Webhook de ALERTA  │
                   │ mock | xweather |  │        │ Haversine + raio    │      │  POST assinado HMAC │
                   │ openweather | ...  │        │ crítico + cooldown  │      │  → n8n/WhatsApp/etc │
                   └────────────────────┘        └────────────────────┘      └────────────────────┘
```

**Por que existe um backend?** Dois motivos de segurança que não dá pra contornar:

1. **As chaves das APIs de raios não podem ficar no front-end.** Qualquer pessoa inspecionaria o código do navegador e roubaria sua chave (que é paga). O backend guarda a chave e atua como proxy.
2. **WhatsApp não envia mensagem pelo navegador.** O disparo precisa partir de um servidor, via WhatsApp Cloud API, Twilio ou um orquestrador (n8n/Make). Aqui usamos um **webhook genérico** para você acoplar o que preferir depois.

---

## Estrutura

```
stormwatch/
├── ingestor/                 # serviço Python: ingere GOES-19 GLM (raios)
│   ├── glm_service.py        # poller do S3 da NOAA + buffer + API JSON
│   └── requirements.txt
├── backend/
│   ├── .env.example          # TODAS as variáveis comentadas
│   └── src/
│       ├── server.js         # Express + segurança (Helmet, CORS, rate limit)
│       ├── config/index.js   # lê e valida env vars
│       ├── routes/api.js     # /forecast, /lightning, /safety, /webhooks
│       ├── middleware/
│       │   ├── auth.js        # API key (timing-safe) + verificação HMAC
│       │   └── logger.js      # pino
│       └── services/
│           ├── lightning.js     # ADAPTER de raios (mock, weatherbug, goesglm)
│           ├── forecast.js      # previsão (Open-Meteo)
│           ├── monitor.js       # snapshot para a tela
│           ├── safetyMonitor.js # loop de segurança server-side + alertas
│           ├── alerts.js        # webhook genérico assinado
│           └── geo.js           # distância Haversine
└── frontend/
    ├── .env.example
    └── src/
        ├── App.tsx            # polling a cada 15s
        ├── api.ts             # cliente tipado
        ├── types.ts
        └── components/
            ├── StormMap.tsx   # mapa Leaflet + anéis + incidência
            └── Panels.tsx     # status de segurança, previsão, lista
```

---

## Como rodar (desenvolvimento)

Pré-requisitos: **Node.js 20+** e **Python 3.11+**.

### 1. Ingestor de raios (Python)

```bash
cd ingestor
pip install -r requirements.txt
python glm_service.py         # sobe em http://127.0.0.1:5055
```

### 2. Backend (em outro terminal)

```bash
cd backend
cp .env.example .env          # defina APP_API_KEY
npm install
npm run dev                   # sobe em http://localhost:4000
```

### 3. Frontend (em outro terminal)

```bash
cd frontend
cp .env.example .env          # defina VITE_APP_API_KEY = APP_API_KEY do backend
npm install
npm run dev                   # sobe em http://localhost:5173
```

O Vite faz proxy de `/api` para o backend, então não há problema de CORS em dev.

---

## Trocar a simulação por dados reais

Tudo passa pelo **adapter** em `backend/src/services/lightning.js`. Os stubs das APIs comerciais já estão escritos — só descomente e preencha.

1. Contrate um provedor (ex.: **Xweather/Vaisala**, **OpenWeather**, **The Weather Company**). O serviço meteorológico dos EUA **não** oferece raios via API pública; alternativa gratuita open-source é o **Blitzortung** (revise os termos de uso).
2. No `.env` do backend:
   ```env
   LIGHTNING_PROVIDER=xweather
   XWEATHER_CLIENT_ID=...
   XWEATHER_CLIENT_SECRET=...
   ```
3. Implemente o `fetch` no adapter correspondente, normalizando a resposta para o formato canônico (`{ id, lat, lon, timestamp, type, peakAmpKa }`).

Para a previsão do tempo, sugiro **Open-Meteo** (gratuita, sem chave) — o stub está em `forecast.js`.

---

## Ligar o alerta ao WhatsApp

O backend faz `POST` no `ALERT_WEBHOOK_URL` com um corpo JSON que já inclui um campo `message` pronto. Você escolhe a outra ponta:

| Opção | Como |
| --- | --- |
| **n8n / Make / Zapier** | Crie um webhook de entrada e conecte ao nó do WhatsApp. Mais simples. |
| **WhatsApp Cloud API (Meta)** | Oficial. Boa para mensagens a números/templates; envio a **grupos** é limitado. |
| **Twilio** | API robusta, cobra por mensagem. |

> ⚠️ **Atenção sobre grupos:** a API oficial da Meta é voltada a conversas individuais e templates; envio automático a *grupos* de WhatsApp é restrito. Soluções que "automatizam grupos" geralmente usam bibliotecas **não-oficiais** que violam os Termos de Uso do WhatsApp e podem **banir o número**. Avalie o risco antes de ir para produção.

Configure no `.env`:
```env
ALERT_WEBHOOK_URL=https://seu-n8n/webhook/raio
ALERT_WEBHOOK_SECRET=um-segredo-forte    # assinamos o corpo com HMAC-SHA256
ALERT_RADIUS_KM=30                        # distância crítica
ALERT_COOLDOWN_MIN=10                     # evita spam de alertas
```
O receptor pode validar o header `x-signature` com o mesmo segredo.

---

## Segurança aplicada (checklist)

- ✅ **Segredos só no backend** — chaves de raios/WhatsApp nunca chegam ao navegador.
- ✅ **Helmet** — cabeçalhos HTTP seguros.
- ✅ **CORS restrito** por allowlist de origens (`CORS_ORIGINS`).
- ✅ **Rate limiting** (120 req/min por IP) contra abuso.
- ✅ **API key timing-safe** entre front e back.
- ✅ **HMAC-SHA256** nos webhooks (entrada e saída).
- ✅ **Cooldown** anti-spam de alertas.
- ✅ **Sem stack trace** vazando em produção.
- ✅ **Logs com redação** de headers sensíveis.
- ✅ **Container non-root** + imagens enxutas.
- ✅ **Encerramento gracioso** (SIGTERM/SIGINT).

### Para produção, ainda recomendo

- Rodar atrás de **HTTPS** (Nginx/Caddy ou plataforma como Render/Railway/Fly).
- Trocar a API key por **JWT/OAuth** se o app for multiusuário público.
- Persistir histórico de strikes/alertas num banco (hoje é em memória).
- Monitorar o endpoint `/api/health` com um uptime checker.
- Mover o polling para **WebSocket/SSE** se quiser tempo real de verdade.

---

© StormWatch — projeto base. Dados de raios e previsão simulados por padrão.
