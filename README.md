## Smart Farming (Dockerized)

Pile Django + DRF + Celery + Redis + PostgreSQL + Frontend Vite/Tailwind.

### Démarrage rapide (Docker Compose)
1) Copier le modèle d'env et adapter si besoin :  
   `cp .env.docker.example .env.docker`
2) Builder et lancer :  
   `docker compose up --build`
   - web : Django (port 8000)
   - worker : Celery (Redis broker)
   - redis : Redis (port 6379)
   - postgres : PostgreSQL (port 5432, volume `pgdata`)
   - frontend : Vite (port 5173, pointe vers `web:8000/api`)

### Migration des données SQLite vers PostgreSQL
1) Depuis l'ancien setup (hors Docker) :  
   `pipenv run python manage.py dumpdata --natural-foreign --natural-primary --indent 2 > data_dump.json`
2) Lancer Docker Compose (cf. ci-dessus).
3) Importer dans le conteneur web :  
   `docker compose exec web python manage.py loaddata data_dump.json`

### Commandes utiles
- Migrations DB : `docker compose exec web python manage.py migrate`
- Superuser : `docker compose exec web python manage.py createsuperuser`
- Logs worker : `docker compose logs -f worker`
- Streamer (optionnel) : `docker compose exec web python backend/simulation/streamer.py`

### Tests / évaluation
- API vivante : `curl http://127.0.0.1:8000/api/status/` (nécessite JWT)
- Flux anomalies : utiliser le streamer pour générer des lectures et vérifier les anomalies via `/api/anomalies/`.
- Limites actuelles : build non optimisé (runserver dev), pas de TLS, métriques d’éval non automatisées.

### Structure Docker
- `Dockerfile` : image Django/Celery.
- `frontend/Dockerfile` : image Vite.
- `docker-compose.yml` : web, worker, redis, postgres, frontend.
- `backend/settings/docker.py` : configuration Postgres pour les conteneurs.
