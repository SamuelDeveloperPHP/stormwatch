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
│           ├── lightning.js       # ADAPTER de raios (mock, weatherbug, goesglm)
│           ├── forecast.js        # previsão (Open-Meteo)
│           ├── monitor.js         # snapshot para a tela (marca 30 min no mapa)
│           ├── safetyMonitor.js   # loop de segurança server-side + alertas
│           ├── strikeStore.js     # armazém persistente (mapa 30 min · retém 24 h)
│           ├── strikeCollector.js # coletor em background que alimenta o armazém
│           ├── alerts.js          # webhook genérico assinado
│           └── geo.js             # distância Haversine
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

> ⚠️ **Este serviço não é opcional.** O monitor de segurança do backend consulta
> o ingestor a cada ciclo — **independente do `LIGHTNING_PROVIDER`**, inclusive no
> modo `mock`. Sem ele no ar, o painel de segurança fica travado em
> **"⚠️ Monitoramento indisponível"** e o webhook de indisponibilidade é disparado.
> (O `LIGHTNING_PROVIDER=mock` só simula os raios do **mapa**; o painel de segurança
> sempre usa este feed GLM.) Para rodar apenas a UI com dados simulados e **sem** o
> ingestor, defina `SAFETY_MONITOR=false` no `.env` do backend — você perde os
> alertas de segurança, mas o mapa continua funcionando com o `mock`.

Crie um **ambiente virtual** (`venv`) para isolar as dependências do Python global:

```bash
cd ingestor
python -m venv .venv
```

Ative o venv — o comando muda conforme o sistema:

```bash
source .venv/bin/activate          # Linux / macOS
.\.venv\Scripts\Activate.ps1       # Windows (PowerShell)
```

Com o venv ativo (o prompt passa a exibir `(.venv)`), instale as dependências e rode o serviço:

```bash
pip install -r requirements.txt
python glm_service.py         # sobe em http://127.0.0.1:5055
```

> **Instalar é só na primeira vez.** O `pip install -r requirements.txt` grava as
> dependências **dentro do `.venv`**, então elas **persistem** — você **não** precisa
> reinstalar toda vez que reiniciar o serviço. Nas próximas vezes, basta **ativar o
> venv** e rodar:
>
> ```bash
> .\.venv\Scripts\Activate.ps1   # Windows · (Linux/macOS: source .venv/bin/activate)
> python glm_service.py
> ```
>
> Só rode o `pip install -r requirements.txt` de novo se **(a)** você recriar o
> `.venv`, ou **(b)** o `requirements.txt` mudar (ex.: incluímos o **waitress**,
> servidor WSGI de produção — rode o install **uma vez** para instalá-lo; a partir
> daí o `python glm_service.py` sobe via waitress, sem o aviso de "development server").

> Para sair do venv depois, use `deactivate`. Se preferir não ativar (útil em
> scripts), chame o Python do venv direto: `.venv/Scripts/python.exe glm_service.py`
> (Windows) ou `.venv/bin/python glm_service.py` (Linux/macOS).
>
> **Windows/PowerShell:** se a ativação falhar com _"execution of scripts is
> disabled on this system"_, libere scripts locais uma vez (por usuário) e tente
> de novo: `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`.

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

## Parâmetros de segurança (padrão dos EUA)

O StormWatch segue o protocolo de segurança contra raios usado nos EUA. Estes
valores já vêm como padrão no código e no `.env.example`:

| Parâmetro | Valor | O que faz | Variável (`.env`) |
| --- | --- | --- | --- |
| **Raio crítico** | **8 km** | Distância a partir da qual o raio é ameaça direta → "⛔ PARAR ATIVIDADES". É o anel destacado no mapa. | `ALERT_RADIUS_KM` |
| **Marcação no mapa** | **30 min** | Cada raio fica marcado no mapa (ícone de ⚡ relâmpago) por 30 minutos e então some. | `MAP_MARKER_TTL_MIN` |
| **Retenção de dados** | **24 h** | Os raios ficam armazenados na aplicação por 24 horas e depois são **apagados**. | `STRIKE_RETENTION_HOURS` |
| **Tudo-limpo** | **30 min** | Tempo sem raios na zona antes de liberar as atividades (regra "30-30"). | `ALL_CLEAR_MIN` |

> **Margem de detecção:** o gatilho efetivo do alerta é
> `ALERT_RADIUS_KM + ALERT_MARGIN_KM`. Como o GLM tem incerteza de posição de
> ~10 km, mantemos `ALERT_MARGIN_KM=10` para errar pelo lado seguro (alerta cedo
> em vez de perder um raio realmente próximo). Para alertar exatamente aos 8 km,
> zere `ALERT_MARGIN_KM`.

### Marcação de 30 min + retenção de 24 h — como funciona

- Um **coletor em background** (`strikeCollector.js`) busca os raios próximos do
  ponto monitorado a cada ciclo (respeitando o `LIGHTNING_PROVIDER`) e os grava no
  **armazém** (`strikeStore.js`).
- O armazém é **persistido em disco** (`backend/data/strikes.json`, fora do git),
  então sobrevive a reinícios.
- O mapa mostra os raios dos **últimos 30 min** como ícone de relâmpago (vermelho
  dentro do raio crítico, âmbar fora). Passados 30 min, o raio some do mapa — mas
  continua **armazenado**.
- Uma limpeza remove tudo que passou de **24 h**.

O mapa tem **duas camadas de raios distintas** (não confunda uma com a outra):

| Camada | O que mostra | Janela |
| --- | --- | --- |
| **Ícones de relâmpago** ⚡ | Raios **perto do local monitorado** (vermelho = dentro do raio crítico de 8 km; âmbar = fora). | Últimos **30 min** |
| **Pontos rosa** — _"Raios em toda a América do Sul (ao vivo)"_ | **Todos** os raios do continente **neste instante** — a visão ampla de onde há tempestade. | **Ao vivo** |

> Com tempo seco na sua região, é normal **não haver nenhum ícone de relâmpago**
> perto do local (nenhuma tempestade por perto), enquanto os **pontos rosa**
> mostram raios acontecendo em outras partes da América do Sul. Os dois são reais
> (GOES-19 GLM).

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
ALERT_RADIUS_KM=8                         # distância crítica — padrão EUA (km)
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
- Trocar o armazém em arquivo JSON (`backend/data/strikes.json`, retenção de 24 h) por um **banco de dados** de verdade se precisar de histórico maior, consultas ou múltiplas instâncias.
- Monitorar o endpoint `/api/health` com um uptime checker.
- Mover o polling para **WebSocket/SSE** se quiser tempo real de verdade.

---

© StormWatch — projeto base. Dados de raios e previsão simulados por padrão.
