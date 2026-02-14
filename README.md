# openweather

## Conteneurisation

### Developpement (local)

```bash
make dev-up
make dev-ps
make dev-logs
```

Application: `http://localhost:3003` (ou la valeur `DEV_WEB_PORT` dans `.env.dev`).

### Production (Linode + Traefik)

```bash
make env-local-perms
make prod-up
make prod-ps
make prod-logs
```

Le fichier `.env.local` est requis en dev et prod et ne doit jamais etre commit.

## Gestion des secrets (.env)

Le fichier `.env` reste local et ne doit pas etre commit.

### 1. Initialiser le template

```bash
cp .env.example .env
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
- `SECRETS_OUTPUT_FILE` (defaut: `.env`)
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
- ecrit `.env` en mode restreint (`600`)
- n'affiche pas les valeurs secretes
