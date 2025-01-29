FROM python:3.11-slim

RUN apt-get update && apt-get install -y \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY . /app/

RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt && \
    mkdir -p /app/nature/database /app/nature/media && \
    chmod -R 755 /app/nature/media && \
    chown -R www-data:www-data /app/nature/media/ && \
    python3 nature/manage.py migrate && \
    python3 -c "import ssl; ssl._create_default_https_context = ssl._create_unverified_context; from ete3 import NCBITaxa; NCBITaxa().update_taxonomy_database()"

EXPOSE 8000

CMD ["python", "nature/manage.py", "runserver", "0.0.0.0:8000"]