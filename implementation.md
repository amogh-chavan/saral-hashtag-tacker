# Implementation & Technical Decisions

This document outlines the specific technical challenges addressed, bugs resolved, and optimizations implemented during the development of the Hashtag Tracker.

## 1. Concurrency & Race Conditions
When multiple workers (e.g. `SYNC_TOP` and `SYNC_RECENT` cron jobs) fetch the exact same Instagram post simultaneously, it naturally leads to race conditions.
- **The Problem:** The join table `media_hashtags` was originally populated using a `Check-then-Act` logic (check if it exists, if not, insert). If two workers checked at the same millisecond, they both attempted an `INSERT`, crashing the transaction with a Primary Key Unique Constraint violation.
- **The Solution:** We replaced this with a single, atomic PostgreSQL `ON CONFLICT` merge statement. It leverages Postgres' internal row locking and the `array_position()` function to safely and uniquely append metadata (`TOP` or `RECENT`) entirely within the database engine.

## 2. Queue Reliability (Outbox Pattern)
The application uses the Transactional Outbox Pattern to guarantee that if a post is saved to the database, a download job is reliably sent to SQS.
- **The Problem (Poison Pill):** The `outbox_worker` fetches 50 `PENDING` jobs. If a job crashed, it remained `PENDING`. Eventually, the queue would fill up with 50 perpetually failing jobs, blocking all new jobs forever.
- **The Solution:** The worker now wraps processing in a strict `try/catch`. If an event fails to enqueue to SQS, its database status is explicitly updated to `FAILED`. A cleanup subroutine automatically prunes `PROCESSED` events older than 24 hours to prevent table bloat.

## 3. Strict Idempotency
Because network requests to SQS can fail or timeout, background workers must safely handle duplicate messages (At-Least-Once Delivery).
- **The Solution:** 
  - `fetch_media_worker`: Entirely wrapped in a DB transaction. Uses native PostgreSQL `UPSERT` capabilities (`ON CONFLICT DO UPDATE`) on `ig_media_id`.
  - `download_media_worker`: Now begins with a rapid database check (`SELECT asset_key`). If the file was already downloaded from a previous attempt, it instantly drops the duplicate job, saving heavy Meta API bandwidth and redundant S3 PUT operations.

## 4. Performance Optimization (N+1 Query Elimination)
- **The Problem:** During media sync, the worker was running an `INSERT` for a media item, and then immediately running a `SELECT` query on the exact same item to check if it needed downloading.
- **The Solution:** We optimized the Knex `merge()` to use `.returning(['id', 'asset_key'])`. This pulls the necessary data straight out of the `UPSERT` execution, instantly eliminating 50 redundant database queries per page fetched.

## 5. Security & Centralized Configuration
- **The Problem:** `process.env` was scattered throughout the codebase, making typing difficult and leading to circular dependencies.
- **The Solution:** All environment variables are now strictly typed and parsed inside `src/config/env.ts`. The codebase exclusively references this strongly-typed singleton.
- **AWS Secrets Manager:** We integrated the application to pull critical credentials (like `DATABASE_URL`) directly from AWS Secrets Manager (mocked via LocalStack) at startup, rather than relying solely on local `.env` files. The startup script cleanly provisions this mock secret on boot.
