# DOKKA Desk

Plataforma corporativa de gestión de tickets, asistencias y reportes.

**Stack:** Bun + TanStack Start + React 19 + PostgreSQL + Supabase (GoTrue + PostgREST) + Kong + Docker

## Despliegue Rápido

```bash
./init.sh          # genera .env
docker compose up -d --build
```

Variables requeridas en `.env`: ver `.env.example`.

Puertos: app en `:3000`, API via Kong en `:8000`.

Documentación completa: `PRODUCTION-GUIDE.md`.
