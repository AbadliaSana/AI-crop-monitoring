# Smart Farming – Environnement conteneurisé

Plateforme de smart agriculture basée sur une architecture moderne :
Django + Django REST Framework + Celery + Redis + PostgreSQL  
Interface frontend développée avec Vite et Tailwind CSS.

---

## Lancement rapide avec Docker Compose

### 1. Configuration des variables d’environnement
Duplique le fichier d’exemple et adapte-le si nécessaire :

```bash
cp .env.docker.example .env.docker
2. Construction et démarrage des services
bash
Copier le code
docker compose up --build
3. Services disponibles
web : application Django (port 8000)

worker : tâches asynchrones Celery (broker Redis)

redis : service Redis (port 6379)

postgres : base PostgreSQL (port 5432, volume pgdata)

frontend : application Vite (port 5173, connectée à web:8000/api)

Migration des données de SQLite vers PostgreSQL
Étape 1 : exporter les données depuis l’ancien environnement
bash
Copier le code
pipenv run python manage.py dumpdata \
  --natural-foreign \
  --natural-primary \
  --indent 2 > data_dump.json
Étape 2 : démarrer l’environnement Docker
(Lancer Docker Compose si ce n’est pas déjà fait)

Étape 3 : importer les données dans PostgreSQL
bash
Copier le code
docker compose exec web python manage.py loaddata data_dump.json
Commandes utiles
Appliquer les migrations :

bash
Copier le code
docker compose exec web python manage.py migrate
Créer un superutilisateur :

bash
Copier le code
docker compose exec web python manage.py createsuperuser
Consulter les logs du worker Celery :

bash
Copier le code
docker compose logs -f worker
Lancer le générateur de flux (optionnel) :

bash
Copier le code
docker compose exec web python backend/simulation/streamer.py
Tests et validation
Vérification de l’API :

bash
Copier le code
curl http://127.0.0.1:8000/api/status/
(authentification JWT requise)

Détection d’anomalies :
Utiliser le script de streaming pour générer des données et vérifier les résultats via l’endpoint /api/anomalies/.

Limitations connues
Configuration de développement (serveur Django non optimisé)

Pas de chiffrement TLS

Indicateurs de performance non automatisés

Organisation Docker
Dockerfile : image principale Django / Celery

frontend/Dockerfile : image Vite

docker-compose.yml : définition des services (web, worker, redis, postgres, frontend)

backend/settings/docker.py : paramètres PostgreSQL pour l’environnement Docker
