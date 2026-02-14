# openweather

## Conteneurisation

### Developpement (local)

```bash
make env-link-dev
make dev-up
make dev-ps
make dev-logs
```

Application: `http://localhost:3003` (ou la valeur `DEV_WEB_PORT` dans `.env.dev`).

### Production (Linode + Traefik)

```bash
make env-link-prod
make env-local-perms
make prod-up
make prod-ps
make prod-logs
```

Mode attendu:
- `.env` est un lien symbolique vers `.env.dev` en developpement.
- `.env` est un lien symbolique vers `.env.prod` sur Linode.
- les secrets sont dans `.env.local` (non commite).

## Gestion des secrets (.env.local)

Le fichier `.env.local` reste local et ne doit pas etre commit.

### 1. Initialiser le template

```bash
cp .env.example .env.local
```

### 2. Recuperer les secrets depuis mdp.mon-site.ca

```bash
SECRETS_ACCESS_TOKEN="ton_token" npm --prefix app run secrets:pull -- --app openweather --env dev
```

Si ton API retourne un payload chiffre (ex: `ciphertext`/`iv`/`tag`), ajoute:

```bash
SECRETS_ENCRYPTION_KEY="ta_cle_locale" npm --prefix app run secrets:pull -- --app openweather --env dev
```

### Variables supportees par pull-secrets

- `SECRETS_URL` (URL complete de l'API, prioritaire)
- `SECRETS_BASE_URL` (defaut: `https://mdp.mon-site.ca`)
- `SECRETS_ENDPOINT` (defaut: `/api/secrets`)
- `SECRETS_ACCESS_TOKEN` (Bearer token)
- `SECRETS_ENCRYPTION_KEY` (si payload chiffre)
- `SECRETS_OUTPUT_FILE` (defaut: `.env.local`)
- `SECRETS_TEMPLATE_FILE` (defaut: `.env.example`)
- `SECRETS_APP` (defaut: `openweather`)
- `SECRETS_ENV` (defaut: `dev`)

Tu peux aussi utiliser le wrapper:

```bash
./scripts/pull-secrets.sh --app openweather --env dev
```

### Format API attendu

Le script accepte ces formats JSON:

1. Clair:

```json
{ "secrets": { "API_KEY": "xxx", "API_CITY": "montreal,ca" } }
```

2. Chiffre:

```json
{ "ciphertext": "...", "iv": "...", "tag": "...", "salt": "..." }
```

Dans tous les cas, le script:

- verifie les cles attendues de `.env.example`
- ecrit `.env.local` en mode restreint (`600`)
- n'affiche pas les valeurs secretes
