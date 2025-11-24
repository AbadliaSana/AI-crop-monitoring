from .base import *
import environ

env = environ.Env()
environ.Env.read_env()

DEBUG = False

# Ready for Week 4 (Docker + Postgres)
# DATABASES = {
#     "default": {
#         "ENGINE": "django.db.backends.postgresql",
#         "NAME": env("POSTGRES_DB"),
#         "USER": env("POSTGRES_USER"),
#         "PASSWORD": env("POSTGRES_PASSWORD"),
#         "HOST": env("POSTGRES_HOST", default="db"),
#         "PORT": env("POSTGRES_PORT", default="5432"),
#     }
# }
