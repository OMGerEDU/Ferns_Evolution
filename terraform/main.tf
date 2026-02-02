# Terraform configuration for Railway deployment
# This provisions EVERYTHING automatically: services, databases, env vars

terraform {
  required_version = ">= 1.0"
  
  required_providers {
   railway = {
      source  = "terraform-community-providers/railway"
      version = "~> 0.6.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
  }
}

# Configure the Railway provider
# You'll need to set RAILWAY_API_TOKEN environment variable
provider "railway" {
  # API token will be read from RAILWAY_API_TOKEN env var
  # Get your token from: https://railway.app/account/tokens
}

# Variables for sensitive data
variable "api_key" {
  description = "Backend API key"
  type        = string
  sensitive   = true
}

variable "evolution_api_key" {
  description = "Evolution API key"
  type        = string
  sensitive   = true
}

variable "webhook_secret" {
  description = "Webhook signing secret"
  type        = string
  sensitive   = true
}

variable "webhook_url" {
  description = "Webhook target URL"
  type        = string
  default     = "https://evolution.omger.cloud/api/webhooks/evolution"
}

variable "github_repo" {
  description = "GitHub repository URL"
  type        = string
  default     = "https://github.com/YOUR_USERNAME/EvolutionBackend"
}
