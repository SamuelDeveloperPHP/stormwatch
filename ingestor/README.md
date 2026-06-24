# StormWatch — Ingestor GLM (NOAA GOES-19)

Serviço Python que ingere dados **públicos** de raios do satélite GOES-19
(produto `GLM-L2-LCFA`, bucket S3 da NOAA, sem autenticação), parseia os
arquivos netCDF4, filtra para a **América do Sul** e mantém um buffer em
memória das descargas recentes. O backend Node consome o JSON deste serviço.

> Fonte: domínio público (obra do governo dos EUA) — NOAA Big Data Program.
> Bucket: `https://noaa-goes19.s3.amazonaws.com/GLM-L2-LCFA/`

## Instalação

```bash
cd ingestor
python -m pip install -r requirements.txt
```

## Rodar

```bash
python glm_service.py        # sobe em http://127.0.0.1:5055
```

O poller roda a cada 30s, baixa os arquivos GLM mais recentes (~20s cada),
parseia e mantém os últimos 15 min de flashes da América do Sul.

## Endpoints

- `GET /flashes` → `{ updatedAt, count, flashes: [[lat, lon, t_ms], ...] }`
- `GET /health`  → estado do poller (último arquivo, tamanho do buffer, erro)

## Variáveis de ambiente (opcionais)

| Var | Padrão | Descrição |
|-----|--------|-----------|
| `GLM_PORT` | `5055` | Porta HTTP |
| `GLM_POLL_SEC` | `30` | Intervalo de polling (s) |
| `GLM_RETENTION_SEC` | `900` | Janela de retenção dos flashes (s) — 15 min |
| `GLM_FILES_PER_POLL` | `3` | Quantos arquivos recentes processar por ciclo |
| `GLM_BUCKET` | `noaa-goes19` | Bucket (GOES-East atual) |

## Ordem de inicialização da stack

1. **Ingestor Python** (este serviço) — `python glm_service.py`
2. **Backend Node** — `cd ../backend && npm run dev` (`LIGHTNING_PROVIDER=goesglm`)
3. **Frontend** — `cd ../frontend && npm run dev`

Se o backend logar "Serviço GLM offline", suba este serviço primeiro.

## Notas

- GLM é **raio total** (não distingue nuvem-solo / intra-nuvem) e não fornece
  amperagem — por isso o backend usa valores neutros nesses campos.
- Cobertura: toda a América do Sul (bbox lat -56..13, lon -82..-34).
- Produção: trocar o servidor de desenvolvimento do Flask por um WSGI
  (gunicorn/waitress) e persistir o buffer se quiser histórico.
