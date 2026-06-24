# StormWatch — Descrição Técnica

**Sistema de monitoramento e alerta de raios para segurança em obra.**

---

## 1. Resumo executivo

O StormWatch monitora, em tempo quase real, a ocorrência de raios em toda a
América do Sul e dispara alertas automáticos quando há atividade elétrica
próxima ao canteiro, apoiando a decisão de **suspender e retomar** atividades
externas. Usa dados **públicos e gratuitos** do satélite GOES-19 da NOAA, sem
licenciamento por uso. A precisão foi **validada contra uma referência
comercial** (WeatherBug/Earth Networks), com diferença de ~0,3 km na distância
do raio mais próximo.

---

## 2. Objetivo

Fornecer ao fiscal/segurança do trabalho um indicador confiável de risco de
raio no entorno da obra, com:

- **Alerta automático** quando um raio entra na zona de risco → "⛔ PARAR".
- **Liberação controlada** ("✅ LIBERADO") somente após período seguro sem raios.
- **Aviso de indisponibilidade** quando o sistema fica sem dados (nunca indica
  "seguro" quando está cego).

---

## 3. Arquitetura

Três componentes desacoplados:

```
┌────────────────────┐   GLM-L2-LCFA (netCDF4)     ┌─────────────────────┐
│  NOAA GOES-19 (S3) │ ────────────────────────▶  │  Ingestor (Python)    |
│  satélite GLM      │   arquivo a cada 20 s       │  Flask + netCDF4      │
└────────────────────┘                             │  • parse + filtro AS  │
                                                   │  • buffer 15 min      │
                                                   │  • expõe JSON         │
                                                   └──────────┬───────────┘
                                                              │ /flashes
                                                              ▼
┌────────────────────┐      JSON (x-api-key)      ┌──────────────────────┐
│  Frontend (React)  │ ◀────────────────────────▶│  Backend (Node)      │
│  Vite + Leaflet    │                            │  Express             │
│  • mapa + status   │                            │  • API + segurança   │
│  • geolocalização  │                            │  • MONITOR DE        │
│  • previsão        │                            │    SEGURANÇA (loop)  │
└────────────────────┘                            │  • webhook assinado  │
                                                  └──────────┬───────────┘
                                                             │ POST (HMAC)
                                                             ▼
                                                  Canal de alerta (a definir):
                                                  WhatsApp / Telegram / SMS / n8n
```

| Componente | Tecnologia | Responsabilidade |
|---|---|---|
| **Ingestor** | Python 3.13, Flask, netCDF4 | Baixa e interpreta os dados do satélite; mantém o buffer recente da América do Sul |
| **Backend** | Node.js, Express | API segura, monitor de segurança contínuo, disparo de alertas |
| **Frontend** | React, TypeScript, Vite, Leaflet | Mapa, status de segurança, previsão; usa geolocalização do usuário |
| **Previsão** | Open-Meteo (API pública gratuita) | Temperatura/condições por hora |

---

## 4. Fonte de dados

- **NOAA GOES-19 GLM** (*Geostationary Lightning Mapper*): detector óptico de
  raios a bordo do satélite geoestacionário GOES-East.
- **Domínio público** (obra do governo dos EUA, via NOAA Big Data Program) —
  **sem chave, sem assinatura, sem custo por uso**, e legalmente livre,
  inclusive para uso comercial.
- **Cobertura uniforme** de toda a América do Sul, inclusive áreas remotas
  (Amazônia, oceano) onde redes de solo têm pouca cobertura.
- Detecta **raio total** (nuvem-solo + intra-nuvem).
- **Precisão de localização**: ~8–14 km (limitação do sensor por satélite).
- **Previsão do tempo**: Open-Meteo (gratuita, sem chave).

---

## 5. Lógica de segurança

Monitoramento **contínuo no servidor**, independente de haver app aberto:

- **Gatilho** = raio de segurança definido (padrão **10 km**) **+ margem de
  10 km** para a incerteza de posição do satélite = dispara com raio detectado
  a **≤ 20 km**. Erra para o lado seguro (alerta cedo, não perde raio próximo).
- **Máquina de estados** (alerta apenas nas transições, sem spam):

| Estado | Condição | Ação |
|---|---|---|
| 🟢 Seguro | Sem raio na zona | — |
| ⛔ PARAR | Raio dentro do gatilho | Alerta "suspender atividades" |
| ✅ LIBERADO | **30 min** sem raio na zona | Alerta "pode retomar" |
| ⚠️ INDISPONÍVEL | Dados ausentes/atrasados | Alerta "tratar como inseguro" |

- **Fail-safe**: se o dado fica velho (> 3 min) ou o serviço cai, o sistema
  declara **"monitoramento indisponível"** — **nunca** exibe "seguro" sem dado.
- **Alertas** saem por **webhook assinado (HMAC-SHA256)**, agnóstico de canal:
  conecta-se a WhatsApp, Telegram, SMS ou orquestrador (n8n) na outra ponta.
- Todos os limiares são **configuráveis** (raio, margem, tempo de liberação).

---

## 6. Frequência de atualização e latência

| Etapa | Cadência |
|---|---|
| Publicação do satélite (NOAA) | a cada **20 s** |
| Coleta do ingestor | a cada **30 s** |
| Avaliação de segurança/alerta | a cada **30 s** |
| Atualização da tela | a cada **15 s** |
| Janela de incidência exibida | últimos **15 min** |

**Latência total** (raio real → alerta): tipicamente **~1 a 2 minutos**. A
margem de gatilho (20 km) absorve o deslocamento da tempestade durante esse
intervalo. As cadências são ajustáveis (pode-se igualar a coleta a 20 s).

---

## 7. Validação de precisão

A distância do raio mais próximo foi comparada com o **WeatherBug** (que usa a
rede de solo Earth Networks/ENTLN, referência comercial), no mesmo ponto
(Pinheirinho, Curitiba), em momentos distintos:

| Medição | WeatherBug | StormWatch | Diferença |
|---|---|---|---|
| 1 | 584 km | 588 km | ~4 km |
| 2 | 906 km | 912 km | ~6 km |
| 3 | 906,1 km | 905,8 km | **~0,3 km** |

A concordância entre dois sistemas **independentes e de tecnologias diferentes**
(satélite × solo) valida toda a cadeia de processamento.

---

## 8. Segurança da informação

- Autenticação por chave de API entre front e back.
- CORS restrito por allowlist; *rate limiting*; cabeçalhos seguros (Helmet).
- Webhooks assinados por HMAC-SHA256.
- Segredos apenas no servidor; nada sensível chega ao navegador.

---

## 9. Custos

- **Dados de raio**: gratuitos (NOAA, domínio público).
- **Previsão**: gratuita (Open-Meteo).
- **Sem licenciamento por raio/assinatura** (ao contrário de soluções
  comerciais como Earth Networks/Xweather).
- Infraestrutura: dois processos leves (Node + Python). Custo de servidor
  baixo.

---

## 10. Status atual e próximos passos

**Implementado e testado:**
- Ingestão GLM em tempo quase real (América do Sul).
- Mapa com incidência, previsão real, geolocalização do usuário.
- Monitor de segurança server-side com gatilho + margem, "tudo limpo" e
  fail-safe (validados nos três estados).
- Precisão validada contra referência comercial.

**Pendente para produção:**
1. **Conectar o canal de alerta** (WhatsApp/Telegram/SMS) no webhook — hoje os
   alertas são gerados e registrados, mas falta plugar o destino.
2. **Cadastro de múltiplas obras** (hoje monitora uma localização por instância).
3. **HTTPS** (a geolocalização do navegador exige conexão segura em produção).
4. **Servidor de produção** para o ingestor (WSGI) e, idealmente, **redundância**
   de fonte de dados.

---

## 11. Limitações (transparência para a gestão)

- **Não é um sistema de segurança certificado.** Deve **complementar**, não
  substituir, o protocolo de segurança da obra e o bom senso ("ouviu trovão,
  recolhe").
- A localização por satélite tem **~10 km de incerteza** — adequada para o raio
  de decisão de 20 km, mas não é precisão metro-a-metro.
- **Fonte única** (GOES-19): para uso crítico, recomenda-se redundância.
- Latência de **~1–2 min**: considerada na margem de gatilho, mas relevante para
  tempestades muito rápidas.

---

*Documento gerado para apresentação interna. Dados de raio: NOAA GOES-19 GLM
(domínio público). Previsão: Open-Meteo.*
