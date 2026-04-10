# Curvert — Currency Conversion Service

Real-time currency conversion system with Redis caching, observability via Loki/Grafana.

---

## Architecture

```
            ┌─────────────────────────────────────────────┐
            │               NGINX :8080                   │
            │  /api/  →  load balance curvert x2          │
            └────────────────────┬────────────────────────┘
                                 │
              ┌──────────────────┴──────────────────────┐
              │                                         │
     ┌────────▼────────┐                       ┌────────▼────────┐
     │    app :3000    │                       │    app :3000    │
     │    (REST API)   │                       │    (REST API)   │
     └────────┬────────┘                       └────────┬────────┘
              │                                         │
              └──────────────────┬──────────────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │    Dragonfly (Redis)    │
                    │    raw:{code}:980       │  ← raw rates per currency
                    │    rate:{from}:{to}     │  ← calculated pairs (TTL 60s)
                    └─────────────────────────┘
                                 ▲
                    ┌────────────┴────────────┐
                    │    listen (Worker)      │
                    │  @Cron every 60s        │
                    │  → Monobank API         │
                    │  → Redis pipeline       │
                    └─────────────────────────┘

     ┌─────────────────────────────────────────────────────────────┐
     │                      Observability                          │
     │                                                             │
     │  Winston → Loki :3100  →  Grafana :3000                     │
     │  Prometheus :9090      →  Grafana :3000                     │
     └─────────────────────────────────────────────────────────────┘
```

### Apps

| App | Responsibility |
|---|---|
| `curvert` | REST API for currency conversion |
| `listen` | Worker that syncs exchange rates from Monobank into Redis |

### Shared Libraries (`libs/common`)

| Module | Responsibility |
|---|---|
| `redis` | Redis client with automatic reconnection and logging |
| `exchange` | `ExchangeProvider` interface, DTOs, and exceptions |
| `logger` | Shared Winston + Loki configuration |

### Conversion Flow

Since the Monobank API returns rates fixed to UAH (978), it is used as the base reference for all conversions.

```
POST /api/convert { source: "840", target: "978", amount: 100 }
        │
        ▼
  ConversionController
  DTO validates → ISO 4217 code
        │
        ▼
  ConversionService.getExchangeRate(840, 978, 100)
        │
        ├── from === to? → returns amount directly
        │
        ├── to === UAH?  → GET raw:{from}:980 → rateBuy directly
        │
        ├── from === UAH? → GET raw:{to}:980  → 1 / rateSell
        │
        └── bridge via UAH → MGET raw:{from}:980 + raw:{to}:980
                             → rateBuy[from] / rateSell[to]
                             → saves rate:{from}:{to} TTL 60s
```

### Cache Strategy (two layers)

```
Layer 1 — raw:{code}:980
  No TTL, controlled by the date field from the endpoint.
  Updated by listen every 60s via pipeline.

Layer 2 — rate:{from}:{to}
  TTL 60s. Calculated on demand and cached.
  Avoids recalculating the same pair on consecutive requests.
```

---

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) 24+
- [Docker Compose](https://docs.docker.com/compose/) v2+

---

## Installation and Setup

### 1. Clone the repository

```bash
git clone https://github.com/aug-stack/curvert.git
cd curvert
```

### 2. Start all services

```bash
docker compose up -d --build
```

Wait for all containers to become healthy:

```bash
docker compose ps
```

Expected output:

```
NAME         STATUS          PORTS
nginx        running         0.0.0.0:8080->8080/tcp
curvert1     running         3000/tcp
curvert2     running         3000/tcp
listen       running         3000/tcp
dragonfly    running         6379/tcp
prometheus   running         9090/tcp
grafana      running         3000/tcp
loki         running         3100/tcp
```

---

## Accessing the Services

### Conversion API

```
http://localhost:8080/api/convert
```

#### Request Examples

**Using ISO 4217 codes:**

https://www.iban.com/currency-codes

```bash
curl -X POST http://localhost:8080/api/convert \
  -H "Content-Type: application/json" \
  -d '{ "from": "840", "to": "978", "amount": "100" }'
```

#### Error Codes

| HTTP | Reason |
|---|---|
| `400` | Invalid currency or negative amount |
| `404` | Currency pair not found in cache |
| `503` | Redis or Rate Pair unavailable |
| `500` | Unexpected internal error |

### Grafana (logs and metrics)

```
http://localhost:3000
http://localhost:3000/a/grafana-lokiexplore-app/explore
```

Datasources are configured automatically:
- **Loki** — structured logs from all services
- **Prometheus** — performance metrics

---

## Project Structure

---

## Useful Commands

```bash
# View worker logs
docker compose logs listen -f

# View API logs
docker compose logs curvert -f

# Restart a single service
docker compose restart listen

# Rebuild after changes
docker compose up -d --build curvert

# Stop everything
docker compose down

# Stop and remove volumes
docker compose down -v
```

---

## Roadmap

- [ ] **Health Check** — add `@nestjs/terminus` with a `GET /health` endpoint returning Redis status and the timestamp of the last Monobank sync. Integrate with `ListenService`'s `waitForRedis` to ensure the worker only starts after Redis is `ready`. Nginx and Docker Compose can use this endpoint for `healthcheck` and `depends_on condition: service_healthy`.

- [ ] **Prometheus Metrics** — instrument with `@willsoto/nestjs-prometheus`: sync counter by status (success/error), conversion duration histogram, and Redis operation counter by type (hit/miss).

- [ ] **Authentication** — add API key validation via `X-Api-Key` header using a NestJS Guard to protect the conversion endpoint.

- [ ] **Tests** — unit test coverage for `calculate()`, `getExchangeRate()`, and all cache scenarios (hit, miss, direct UAH, bridge via UAH).

- [ ] **Endpoint Rate Limiting** — add `@nestjs/throttler` to limit requests per IP and prevent API abuse.

- [ ] **Additional Providers** — implement `PrivatBankService` following the `ExchangeProvider` interface and toggle between providers via environment variable, without modifying `ListenService`.