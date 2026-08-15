# Hashtag Tracking Assignment

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Database Setup:**
   Ensure you have PostgreSQL running. Create the database:
   ```bash
   createdb saral_hashtag_tracker
   ```
   Run migrations:
   ```bash
   npx knex migrate:latest
   ```

3. **LocalStack Setup (Optional but recommended):**
   If you want to test the queue and storage locally, you can start LocalStack using Docker:
   ```bash
   docker run --rm -it -p 4566:4566 -p 4510-4559:4510-4559 localstack/localstack
   ```
   Create the queue and bucket in LocalStack:
   ```bash
   awslocal sqs create-queue --queue-name media-sync-queue
   awslocal s3 mb s3://hashtag-media-assets
   ```

4. **Start the application:**
   ```bash
   npm run dev
   ```

## Vars

See the `.env` file for required environment variables. It includes setup for:
- Database connection (`DATABASE_URL`)
- Meta API tokens (`META_ACCESS_TOKEN`, `META_USER_ID`)
- AWS LocalStack configuration (`AWS_ENDPOINT`, `SQS_QUEUE_URL`, `S3_BUCKET_NAME`)

## Tradeoffs

1. **Meta API Limitations**: Hashtag search via Meta Graph API doesn't return `author_username` or `view_count` consistently due to privacy limitations, unless the media belongs to the querying business account. These fields are in the DB schema for future-proofing but may be null.
2. **Carousel Albums**: Meta returns a single URL for carousels (the first image). Fetching all children requires an extra API call per carousel. For this implementation, we grab the primary image to save API quota.
3. **"Top" Status Tracking**: Meta's "Top" media is transient. We update the `is_top` flag on every top media sync by resetting the flag for the hashtag and marking the newly fetched ones. Alternatively, we could just sort by `like_count`.
4. **Metrics Refresh Decay**: Older posts that fall off the `recent_media` feed will stop getting metric updates (likes/comments). A dedicated cron job querying specific media IDs based on a decay model (refresh frequently if new, less if old) is recommended for production.

## AI Usage

- **Cursor/Claude/Antigravity**: Used to brainstorm architecture, define database schema, discuss trade-offs (e.g. `recent_media` vs `top_media`, handling duplicate `ig_media_id` via upserts), and scaffold the Node.js project.
- **Code Generation**: AI was used to generate boilerplate Knex configuration, PostgreSQL migrations (including `UUID` and unique constraints), and `tsconfig.json`.
- **My Review**: I verified the schema design, ensured the architecture meets the "replaceable with AWS" requirement (by opting for AWS SDK pointing to LocalStack), and guided the design choices.
