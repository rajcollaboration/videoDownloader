# Testing Strategy

This repository now includes a layered E2E and performance testing setup for the Video Downloader SaaS application.

## Test layers

### 1. Backend API and integration tests

- Tooling: `pytest`, `fastapi.testclient`
- Location: `backend/tests/`
- Covers:
  - URL resolution flows
  - Download job creation
  - Playlist item status payloads
  - Analytics overview
  - Metrics exposure

Run:

```bash
cd backend
pytest -q
```

### 2. Frontend browser E2E

- Tooling: `Playwright`
- Location: `frontend/tests/e2e/`
- Covers:
  - Metadata fetch flow
  - Download start flow
  - Playlist progress rendering
  - Theme switching
  - Ad placeholders
  - SEO landing pages

Run:

```bash
cd frontend
npm install
npx playwright install
npm run test:e2e
```

### 3. API collection testing

- Tooling: `Postman` or `Newman`
- Location: `testing/postman/`

Run:

```bash
newman run testing/postman/video-downloader.collection.json \
  -e testing/postman/local.environment.json
```

### 4. Load and stress testing

- Tooling: `Locust`, `k6`
- Location: `testing/load/`

Locust:

```bash
locust -f testing/load/locustfile.py --host http://localhost/api
```

k6:

```bash
k6 run testing/load/k6-downloads.js
```

## Large-scale test plan

### 10,000-item playlist validation

1. Seed or mock a large playlist metadata response.
2. Submit the playlist URL through the API and UI.
3. Confirm one parent job and 10,000 child playlist items are created.
4. Track:
   - queue depth
   - worker throughput
   - retry count
   - failure rate
   - memory and CPU
5. Pass criteria:
   - no crash
   - no job loss
   - recovery after worker restart

### 1,000 concurrent users

1. Run Locust or k6 against `resolve` and `downloads` endpoints.
2. Use Prometheus and Grafana dashboards during the run.
3. Capture:
   - p95 latency
   - request failure rate
   - Redis backlog growth
   - Celery processing rate
4. Target:
   - p95 latency under 500ms for resolve/download request creation

## Observability stack

Use the testing compose overlay:

```bash
docker compose -f docker-compose.yml -f docker-compose.testing.yml up --build
```

Included:

- Prometheus: `http://localhost:9090`
- Grafana: `http://localhost:3001`
- Elasticsearch: `http://localhost:9200`
- Kibana: `http://localhost:5601`

## Failure injection checklist

- Stop Celery worker during active downloads
- Restart Redis during queue activity
- Throttle network during browser downloads
- Validate:
  - retries occur
  - jobs remain visible
  - no duplicate item creation
  - UI status recovers

## Execution notes

- The repo now contains the harness and configuration needed to execute the full strategy.
- The actual 10,000-video and 1,000-user runs should be executed in a dedicated environment with enough CPU, memory, network bandwidth, and storage.
- Record results in a runbook with:
  - timestamps
  - git revision
  - environment details
  - screenshots from Grafana and Kibana
  - pass/fail summary against the success criteria
