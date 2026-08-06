# Ingestor GLM (Python/Flask) — imagem de produção
FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt ./
# gunicorn como servidor WSGI (1 worker por causa do buffer em memória)
RUN pip install --no-cache-dir -r requirements.txt gunicorn

COPY . .

EXPOSE 5055

# O poller da NOAA sobe no import (ensure_poller). 1 worker + threads.
CMD ["gunicorn", "glm_service:app", "-b", "0.0.0.0:5055", "--workers", "1", "--threads", "4", "--timeout", "120"]
