#!/bin/bash

# Exit on error
set -e

echo "🚀 Starting setup process..."

echo "🐳 Starting Docker containers (Postgres & LocalStack)..."
docker compose up -d postgres localstack

echo "⏳ Waiting for services to be ready..."
sleep 5

echo "📦 Installing Node dependencies..."
npm install

echo "🏗️  Compiling TypeScript to JavaScript..."
npm run build

echo "📦 Running database migrations..."
npm run db:migrate

echo "🌱 Running database seeds..."
npm run db:seed

echo "☁️  Creating AWS SQS queues..."
docker exec saral-hashtag-tracker-localstack-1 awslocal sqs create-queue --queue-name fetch-media-queue
docker exec saral-hashtag-tracker-localstack-1 awslocal sqs create-queue --queue-name download-media-queue

echo "🪣  Creating S3 bucket..."
docker exec saral-hashtag-tracker-localstack-1 awslocal s3 mb s3://ig-media

echo "🔐  Creating AWS Secrets Manager secret for Database URL..."
docker exec saral-hashtag-tracker-localstack-1 awslocal secretsmanager create-secret \
    --name my-app-secrets \
    --secret-string '{"DATABASE_URL":"postgres://postgres:postgres@postgres:5432/saral_hashtag_tracker"}'

echo "🏗️  Building and starting application services..."
docker compose up --build

echo "✅ Shutdown completed :)"
