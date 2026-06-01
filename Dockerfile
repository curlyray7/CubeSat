FROM python:3.11-slim

WORKDIR /app

# On installe les dépendances
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# On copie tout le projet
COPY . .

# On lance Uvicorn DIRECTEMENT sur main:app (sans le "backend.")
CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]