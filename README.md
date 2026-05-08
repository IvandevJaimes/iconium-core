# iconium-core

API backend for the [iconium](https://github.com/ivanJ-Dev/iconium) icon library. Provides search by name, fuzzy matching, icon retrieval in SVG format, and metadata for the entire icon catalog.

---

## Tecnologias / Technologies

- **Runtime:** Node.js
- **Language:** TypeScript (strict mode)
- **Framework:** Express 5
- **Search:** Custom bigram-based fuzzy search with Levenshtein scoring
- **Icons source:** [theSVG](https://thesvg.org) registry (5800+ icons)
- **Middleware:** CORS, Morgan (logging), express-rate-limit
- **Build:** tsc, ts-node

---

## Endpoints

### `GET /api/search?q=<query>&limit=<n>&page=<p>`

Search icons by name or alias. Returns JSON with paginated results.

| Param  | Default | Description                    |
|--------|---------|--------------------------------|
| `q`    | -       | Search query (required)        |
| `limit`| 10      | Results per page [1-50]        |
| `page` | 0       | Page number (0-indexed)        |

**Response:**

```json
{
  "page": 0,
  "limit": 10,
  "total": 1,
  "results": [
    {
      "name": "React",
      "slug": "react",
      "hex": "#61DAFB",
      "colors": ["#61DAFB"],
      "categories": ["framework", "javascript"],
      "svg": "<svg>...</svg>",
      "score": 1
    }
  ]
}
```

### `GET /api/icon?q=<query>`

Get the SVG for the single best-matching icon. Returns raw SVG with `Content-Type: image/svg+xml`. Requires a minimum confidence score of 0.9.

Responds with `404` if no icon matches with sufficient confidence.

### `GET /api/icon/:slug`

Get an icon's SVG directly by its slug (e.g., `/api/icon/react`). Returns raw SVG.

### `GET /health`

Health check endpoint.

```json
{ "status": "ok" }
```

---

## Quick Start

```bash
# Install dependencies
npm install

# Development (auto-restart with ts-node)
npm run dev

# Build and start for production
npm run build
npm start
```

The server listens on port `3000` by default. Override with the `PORT` environment variable.

---

## Configuration

| Env variable           | Default  | Description                         |
|------------------------|----------|-------------------------------------|
| `PORT`                 | `3000`   | Server port                         |
| `RATE_LIMIT_WINDOW_MS` | `60000`  | Rate limit window in milliseconds   |
| `RATE_LIMIT_MAX`       | `100`    | Max requests per window per IP      |

---

## Scripts

| Command              | Description                              |
|----------------------|------------------------------------------|
| `npm run dev`        | Run in development mode (ts-node)        |
| `npm run build`      | Compile TypeScript to `dist/`            |
| `npm start`          | Run compiled production build            |
| `npm run update:icons` | Rebuild icon data from theSVG registry |
| `npm test`           | _(to be configured)_                     |

---

## Updating Icons

To fetch the latest icons from theSVG registry and rebuild the search index:

```bash
npm run update:icons
```

---

## iconium-core

Backend de la API para la libreria de iconos [iconium](https://github.com/ivanJ-Dev/iconium). Proporciona busqueda por nombre, coincidencia aproximada (fuzzy), descarga de iconos en formato SVG y metadatos de todo el catalogo.

### Endpoints

- **`GET /api/search?q=<query>&limit=<n>&page=<p>`** -- Busca iconos por nombre o alias. Devuelve JSON paginado con resultados que incluyen SVG, color hex, categorias y puntaje de coincidencia.
- **`GET /api/icon?q=<query>`** -- Obtiene el SVG del icono con mejor coincidencia. Requiere confianza minima de 0.9. Devuelve SVG crudo.
- **`GET /api/icon/:slug`** -- Obtiene el SVG de un icono directamente por su slug. Devuelve SVG crudo.
- **`GET /health`** -- Verificacion de estado del servidor.

### Inicio rapido

```bash
npm install
npm run dev      # desarrollo
npm run build && npm start   # produccion
```

### Variables de entorno

| Variable              | Default   | Descripcion                            |
|-----------------------|-----------|----------------------------------------|
| `PORT`                | `3000`    | Puerto del servidor                    |
| `RATE_LIMIT_WINDOW_MS`| `60000`   | Ventana de rate limit en milisegundos  |
| `RATE_LIMIT_MAX`      | `100`     | Maximo de requests por ventana por IP  |

### Scripts

| Comando              | Descripcion                                |
|----------------------|--------------------------------------------|
| `npm run dev`        | Iniciar en modo desarrollo (ts-node)       |
| `npm run build`      | Compilar TypeScript a `dist/`              |
| `npm start`          | Ejecutar build de produccion compilado     |
| `npm run update:icons` | Regenerar datos de iconos desde theSVG  |
| `npm test`           | _(pendiente de configurar)_                |
