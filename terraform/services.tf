# Railway Project
resource "railway_project" "evolution_backend" {
  name        = "EvolutionBackend"
  description = "WhatsApp automation backend with Evolution API"
}

# PostgreSQL Database
resource "railway_service" "postgres" {
  project_id = railway_project.evolution_backend.id
  name       = "postgres"
  
  source {
    image = "postgres:15-alpine"
  }

  variables = {
    POSTGRES_DB       = "evolution"
    POSTGRES_USER     = "evolution"
    POSTGRES_PASSWORD = random_password.postgres_password.result
  }
}

# Redis Cache
resource "railway_service" "redis" {
  project_id = railway_project.evolution_backend.id
  name       = "redis"
  
  source {
    image = "redis:7-alpine"
  }
}

# Backend Service
resource "railway_service" "backend" {
  project_id = railway_project.evolution_backend.id
  name       = "backend"
  
  source {
    repo   = var.github_repo
    branch = "main"
  }

  variables = {
    NODE_ENV             = "production"
    PORT                 = "8080"
    API_KEY              = var.api_key
    EVOLUTION_API_KEY    = var.evolution_api_key
    EVOLUTION_API_URL    = "http://${railway_service.evolution_api.name}.railway.internal:8080"
    WEBHOOK_TARGET_URL   = var.webhook_url
    WEBHOOK_GLOBAL_URL   = var.webhook_url
    WEBHOOK_SECRET       = var.webhook_secret
    DATABASE_URL         = "postgresql://${railway_service.postgres.variables["POSTGRES_USER"]}:${random_password.postgres_password.result}@${railway_service.postgres.name}.railway.internal:5432/${railway_service.postgres.variables["POSTGRES_DB"]}"
    REDIS_URL            = "redis://${railway_service.redis.name}.railway.internal:6379"
  }

  depends_on = [
    railway_service.postgres,
    railway_service.redis,
    railway_service.evolution_api
  ]
}

# Evolution API Service
resource "railway_service" "evolution_api" {
  project_id = railway_project.evolution_backend.id
  name       = "evolution-api"
  
  source {
    image = "atendai/evolution-api:v2.2.2"
  }

  variables = {
    SERVER_PORT                          = "8080"
    AUTHENTICATION_TYPE                  = "apikey"
    AUTHENTICATION_API_KEY               = var.evolution_api_key
    AUTHENTICATION_EXPOSE_IN_FETCH_INSTANCES = "true"
    DATABASE_ENABLED                     = "true"
    DATABASE_PROVIDER                    = "postgresql"
    DATABASE_CONNECTION_URI              = "postgresql://${railway_service.postgres.variables["POSTGRES_USER"]}:${random_password.postgres_password.result}@${railway_service.postgres.name}.railway.internal:5432/${railway_service.postgres.variables["POSTGRES_DB"]}"
    DATABASE_SAVE_DATA_INSTANCE          = "true"
    DATABASE_SAVE_DATA_NEW_MESSAGE       = "true"
    CACHE_REDIS_ENABLED                  = "true"
    CACHE_REDIS_URI                      = "redis://${railway_service.redis.name}.railway.internal:6379"
    CACHE_REDIS_PREFIX_KEY               = "evolution:"
    WEBHOOK_GLOBAL_URL                   = var.webhook_url
    WEBHOOK_GLOBAL_ENABLED               = "true"
    WEBHOOK_GLOBAL_WEBHOOK_BY_EVENTS     = "true"
    WEBHOOK_EVENTS_QRCODE_UPDATED        = "true"
    WEBHOOK_EVENTS_CONNECTION_UPDATE     = "true"
    WEBHOOK_EVENTS_MESSAGES_UPSERT       = "true"
    WEBHOOK_EVENTS_MESSAGES_UPDATE       = "true"
    WEBHOOK_EVENTS_MESSAGES_SET          = "true"
    WEBHOOK_EVENTS_SEND_MESSAGE          = "true"
    CONFIG_SESSION_PHONE_VERSION         = "2.3000.1028716292"
  }

  depends_on = [
    railway_service.postgres,
    railway_service.redis
  ]
}

# Generate random password for PostgreSQL
resource "random_password" "postgres_password" {
  length  = 32
  special = true
}
