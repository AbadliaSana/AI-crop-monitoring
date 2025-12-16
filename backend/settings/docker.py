from .base import *  # noqa
import environ

env = environ.Env()
environ.Env.read_env()  # picks up .env or env vars passed by docker-compose

DEBUG = False

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": env("POSTGRES_DB", default="smart_farming"),
        "USER": env("POSTGRES_USER", default="smart_farming"),
        "PASSWORD": env("POSTGRES_PASSWORD", default="smart_farming"),
        "HOST": env("POSTGRES_HOST", default="postgres"),
        "PORT": env("POSTGRES_PORT", default="5432"),
    }
}

CORS_ALLOW_ALL_ORIGINS = True

STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
