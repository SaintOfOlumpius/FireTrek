# FireTrek Backend

Production-grade IoT tracking platform for regulated equipment using ESP32 GPS devices.

---

## Architecture Overview

```
┌──────────────────────────────────────────────────────────────────┐
│                        ESP32 Devices                             │
│            POST /api/v1/telemetry/location                       │
└───────────────────────────┬──────────────────────────────────────┘
                            │ X-Device-Key header
                            ▼
┌──────────────────────────────────────────────────────────────────┐
│                    Daphne ASGI Server                            │
│          (HTTP + WebSocket via Django Channels)                  │
└───────────┬────────────────────────────────┬─────────────────────┘
            │ HTTP                           │ WebSocket
            ▼                               ▼
┌───────────────────────┐      ┌────────────────────────────┐
│  Django REST Framework│      │  Channels Consumers        │
│  TelemetryIngestView  │      │  TrackingConsumer          │
│  AlertViewSet         │      │  NotificationConsumer      │
│  GeofenceViewSet ...  │      └──────────────┬─────────────┘
└───────────┬───────────┘                     │
            │                                 │
            ▼                                 ▼
┌───────────────────────────────────────────────────────┐
│               Business Logic Layer                     │
│  TelemetryIngestionService  GeofenceEngine            │
│  AlertEngine                NotificationDispatcher    │
└──────────┬──────────────────────────┬─────────────────┘
           │ DB writes                │ async
           ▼                         ▼
┌────────────────────┐   ┌──────────────────────────────┐
│   PostgreSQL       │   │   Redis                      │
│   + PostGIS        │   │   - Celery broker (DB 0)     │
│                    │   │   - Django cache  (DB 1)     │
│  telemetry_locations│   │   - Channel layer (DB 2)     │
│  (BRIN + GiST idx) │   └──────────────┬───────────────┘
└────────────────────┘                  │
                                        ▼
                          ┌─────────────────────────────┐
                          │       Celery Workers        │
                          │  - check_geofences          │
                          │  - evaluate_alerts          │
                          │  - dispatch_notifications   │
                          │  - check_offline_devices    │
                          │  - cleanup_old_telemetry    │
                          └─────────────────────────────┘
```

---

## Quick Start (Docker)

```bash
cp .env.example .env
# Edit .env with your values

docker compose up --build
```

The API is available at `http://localhost:8000/api/v1/`.

---

## Project Structure

```
firetrek/
├── config/                  Django project settings & URL root
│   ├── settings/
│   │   ├── base.py          Shared settings
│   │   ├── development.py
│   │   └── production.py
│   ├── urls.py
│   ├── api_urls.py          API v1 router
│   └── asgi.py              Channels ASGI entrypoint
│
├── apps/                    Django applications
│   ├── accounts/            Users, registration, auth
│   ├── organizations/       Tenants, memberships, invitations
│   ├── firearms/            Tracked assets
│   ├── devices/             ESP32 device provisioning & health
│   ├── telemetry/           GPS location ingestion pipeline
│   ├── geofencing/          Polygon zones & boundary event detection
│   ├── alerts/              Alert engine & deduplication
│   ├── incidents/           Incident management workflow
│   ├── notifications/       Multi-channel notification dispatch
│   ├── firmware/            OTA firmware deployment
│   └── audit/               Immutable audit trail
│
├── core/                    Shared utilities
│   ├── authentication.py    JWT + DeviceAPIKey auth backends
│   ├── permissions.py       RBAC permission classes
│   ├── pagination.py        Standard + cursor paginators
│   ├── exceptions.py        Consistent error envelope
│   ├── middleware.py        Audit log + tenant middleware
│   ├── throttling.py        Per-device rate limiting
│   └── models.py            UUIDModel / TimestampedModel base
│
├── realtime/                WebSocket infrastructure
│   ├── consumers.py         Channels consumers
│   ├── routing.py           WS URL patterns
│   ├── middleware.py        JWT WebSocket auth
│   └── broadcast.py        sync→async channel helpers
│
├── workers/                 Celery
│   ├── celery.py            App factory + Beat schedule
│   └── tasks/
│       ├── geofence_tasks.py
│       ├── alert_tasks.py
│       ├── device_tasks.py
│       ├── notification_tasks.py
│       ├── firmware_tasks.py
│       └── maintenance_tasks.py
│
├── Dockerfile
├── docker-compose.yml
└── .env.example
```

---

## API Reference

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/auth/token/` | Obtain JWT tokens |
| POST | `/api/v1/auth/token/refresh/` | Refresh access token |
| POST | `/api/v1/accounts/register/` | Register new user |
| GET/PUT | `/api/v1/accounts/me/` | Get/update own profile |

### Device Telemetry (ESP32)

```
POST /api/v1/telemetry/location/
Header: X-Device-Key: <raw_api_key>
```

```json
{
  "device_uid": "FT-001",
  "latitude": -25.659650,
  "longitude": 28.250716,
  "altitude": 1219,
  "speed": 0.93,
  "battery": 82,
  "timestamp": "2026-03-16T12:00:00Z"
}
```

Response includes an optional `ota` command if a firmware update is pending.

### WebSocket

```
ws://host/ws/tracking/{org_id}/?token=<jwt>
ws://host/ws/notifications/?token=<jwt>
```

Messages pushed to clients:
- `location.update` — live GPS position
- `alert.created` — new alert raised
- `notification.created` — personal notification

---

## Security Model

| Layer | Mechanism |
|-------|-----------|
| Human users | JWT (60min access token, 7day refresh, rotation + blacklist) |
| IoT devices | SHA-256 hashed API key in `X-Device-Key` header |
| Multi-tenancy | Every queryset filtered by user memberships |
| Role-based access | owner > admin > operator > viewer |
| Rate limiting | 2000/hr users, 120/min devices |
| Audit trail | Every mutating API call logged asynchronously |
| Transport | HTTPS + WSS enforced in production (HSTS) |

---

## Database Indexing Strategy

### telemetry_locations (high-volume)

| Index | Type | Purpose |
|-------|------|---------|
| `(device_id, timestamp DESC)` | B-tree | Per-device time range queries |
| `timestamp` | BRIN | Analytics scans on large time ranges |
| `point` | GiST | PostGIS spatial queries (ST_Within) |

### alerts

| Index | Purpose |
|-------|---------|
| `(organization_id, created_at)` | Organisation alert feeds |
| `(dedup_key, resolved_at)` | Deduplication lookups |

---

## Telemetry Pipeline

```
Device POST
    │
    ▼
DeviceAPIKeyAuthentication ──► 401 if invalid
    │
    ▼
TelemetryIngestSerializer.validate()
    │
    ▼
TelemetryIngestionService.ingest()
    ├── _save_location()           → PostgreSQL INSERT
    ├── _update_device_state()     → UPDATE last_seen, battery, status
    ├── _save_health_snapshot()    → INSERT DeviceHealth
    └── _trigger_async_processing()
        ├── check_geofences_for_location.delay()  → Celery (telemetry queue)
        ├── evaluate_telemetry_alerts.delay()     → Celery (telemetry queue)
        └── broadcast_location_update()           → Redis Channel Layer → WS
    │
    ▼
HTTP 201 {"status": "ok", "location_id": "..."}
(+ optional OTA command in response)
```

---

## Production Deployment

### Infrastructure requirements

- **PostgreSQL 16** with PostGIS 3.4 extension
- **Redis 7** (3 logical DBs: broker, cache, channels)
- **GDAL** system library installed on all app nodes

### Scaling guidelines

| Component | Scale via |
|-----------|-----------|
| Daphne/ASGI | Horizontal (multiple pods), fronted by nginx |
| Celery telemetry workers | Scale based on queue depth (CloudWatch / Flower) |
| Celery notification workers | Scale based on queue depth |
| PostgreSQL | Read replicas for analytics queries |
| Redis | Cluster mode for > 10k concurrent WS connections |

### Environment variables

See `.env.example` for the full list.

### Running migrations

```bash
python manage.py migrate
python manage.py createsuperuser
```

### Running in production

```bash
# ASGI server
daphne -b 0.0.0.0 -p 8000 config.asgi:application

# Celery workers (separate processes/pods)
celery -A workers.celery worker -Q default,telemetry --concurrency=8
celery -A workers.celery worker -Q notifications,low_priority --concurrency=4
celery -A workers.celery beat --scheduler django_celery_beat.schedulers:DatabaseScheduler
```
