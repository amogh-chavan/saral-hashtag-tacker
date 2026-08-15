# Saral Hashtag Tracker

A highly scalable, background-worker driven backend application to track, fetch, and download Instagram media for specific hashtags using the Meta Graph API.

## Architecture & Data Flow

This project is built using a **Background Worker Architecture** and the **Outbox Pattern** to ensure high throughput, reliability, and strict idempotency.

### The Services
Instead of a single monolithic process, the application is broken down into 5 independent containers:
1. **API Server (`server`)**: The Express REST API for querying tracked hashtags and retrieving paginated media.
2. **Cron Scheduler (`cron`)**: Acts as an alarm clock, periodically triggering sync jobs for active hashtags.
3. **Fetch Worker (`fetch_media_worker`)**: Polls the SQS `fetch-media-queue`. Calls the Meta API to sync post metadata (likes, comments, captions) and safely `UPSERT`s it into PostgreSQL. If it finds a new post, it drops a job in the database outbox.
4. **Outbox Worker (`outbox_worker`)**: Polls the PostgreSQL `outbox_events` table for `PENDING` download jobs and pushes them to the SQS download queue.
5. **Download Worker (`download_media_worker`)**: Polls the SQS `download-media-queue`. Downloads the raw `.mp4` or `.jpg` assets from Meta and uploads them directly to S3 (LocalStack), avoiding blocking the main sync flow.

### Project Structure
- `src/modules/`: Contains the Express API controllers, models, and validators.
- `src/worker/`: Contains the background worker processes and their handlers.
- `src/services/`: Shared service singletons (Queue, S3, Meta API wrapper).
- `src/db/`: Knex migrations, seeds, and database configuration.
- `src/config/`: Dynamic, environment-driven configuration schema.

## Prerequisites
- **Docker**
- **Docker Compose**
- A valid **Meta Graph API Token** and **User ID** (Place these in your `.env`)

## Setup & Run Instructions

1. **Environment Setup:**
   ```bash
   cp .env.example .env
   # Edit .env and insert your META_ACCESS_TOKEN and META_USER_ID
   ```

2. **Start the Stack:**
   We have provided a unified startup script that handles database creation, migrations, seeding, LocalStack bucket/queue creation, and building the Docker images.
   ```bash
   chmod +x start.sh
   ./start.sh
   ```

3. **Accessing the App:**
   - The API is available at: `http://localhost:3000`
   - Postgres is exposed on: `localhost:15432`
   - LocalStack (S3/SQS/Secrets Manager) is exposed on: `localhost:4566`

   *Note: `start.sh` automatically seeds the `DATABASE_URL` into an AWS Secret inside LocalStack, which the application securely fetches at runtime!*

## Tuning & Configuration

The application is highly decoupled. You can control the throughput of the background workers without touching code or rebuilding containers. Just edit the `# Worker Configurations` section in your `.env` file to scale the SQS polling batch sizes and API fetch limits up or down!

## API Usage

### Get Media for a Hashtag

Fetch paginated, downloaded media for a tracked hashtag. Only returns posts that have a fully downloaded S3 asset.

```bash
curl --location --request GET 'http://localhost:3000/api/hashtags?name=matcha&page=1&limit=100'
```

**Query Parameters:**

| Parameter | Type | Required | Description |
|---|---|---|---|
| `name` | string | ✅ Yes | The hashtag name to query (without `#`) |
| `page` | number | No | Page number (default: `1`) |
| `limit` | number | No | Items per page, max `100` (default: `20`) |
