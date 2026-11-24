# M490 APB Prova

Aquest document serveix com a referència.
Per a realitzar la prova obriu PR-M0490-ABP.md i seguiu-ne les instruccions.

## Entorn de treball

Només cal Docker al host (no cal Node). `npm install` es fa en construir la imatge i `npm run dev` (nodemon) l'arrenca `docker compose`.

## Crear certificats (només un cop)

Per crear els certificat _self-signed_ a _backend/certs/

    docker compose run --rm backend npm run certs

## Posada en marxa

    docker compose up --build

- El codi de `backend/` es munta al contenidor: els canvis es recarreguen sols (nodemon).
- Si canvia `package.json`: `docker compose up --build -V` (renova el volum de `node_modules`). Però no us cal canviar-lo!

Per connectar-nos al contenidor des de una altre terminal

    docker compose exec backend bash

### Rutes

| Mètode | Ruta | Auth |
| --- | --- | --- |
| POST | `/auth/register` `{email, username, password}` | — |
| POST | `/auth/login` `{email, password}` → `{token, user}` | — |
| GET | `/auth/me` | Bearer |
| GET | `/articles`, `/articles/:id` | — |
| POST / PUT / PATCH / DELETE | `/articles[/:id]` | Bearer |

## Tests

Els tests s'executen sempre dins del contenidor, amb l'entorn en marxa (`docker compose up`).
Però els podem llençar des de un terminal al host.

Unit tests:

    docker compose exec backend npm test

Bruno tests (la CLI ja està instal·lada a la imatge; `./bruno` es munta a `/usr/src/bruno`):

    docker compose exec backend npm run bruno

Les col·leccions de Bruno es poden llençar individualment

    docker compose exec backend npm run bruno -- auth
    docker compose exec backend npm run bruno -- articles
    docker compose exec backend npm run bruno -- security
