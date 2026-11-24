# M0490-ABP-Prova

**Nom i cognoms**: Carles Conesa Mañosa

---

## Instruccions

_Omple el teu nom i cognoms on s'indica_.

Has de respondre totes les preguntes que es fan en aquest document, i modificar el codi font de l'aplicació _backend_ tal i com es demana.

És una prova de conceptes. En l'enunciat i el mateix backend trobaràs totes les funcions que necessites, i tots els paràmetres.
Has de fer-les servir com toca i, allà on es demana, posar els valors adients.

Les explicacions que es demanen en aquest document, per justificar els canvis que fas i mostrar que els entens, són el 50% de la nota.

Pots fer els apartats en un ordre diferent, però recorda fer `git commit` en cada un.

## Preparació

Obre la carpeta de la prova al teu editor.
Assegura't que pots tenir obert alhora aquest document i algun arxiu de codi.

Tingues obert en l'explorer l'arbre de directoris i fitxers de la carpeta de la prova.
Assegura't que n'entens l'estructura.

Obre un terminal.

Comprova que git està correctament configurat.

    git status
    git config list

Al mateix terminal, engega-hi el docker:

    docker compose up --build

Observa com arrenca. Un cop el servidor estigui corrent pots provar a obrir una finestra del navegador i connectar-te al servei.

## Fase 0: Entorn

A l'editor, obre el fitxer `src/app.js`.

**Pregunta 0.1:** Busca la ruta `'/'`. Com es relaciona amb el que has vist al navegador?

> _Resposta:_

**Modificació 0.1:** Modifica la resposta de la ruta perque afegeixi un camp `author` amb el teu nom.

Verifica a la sortida del terminal que el backend es reinicia per llegir els canvis.
Verifica en el navegador que efectivament ara retorna el camp `author`.

Obre un segon terminal, i fes correr els tests:

    docker compose exec backend npm test

**Pregunta 0.2a:** Quants tests hi ha? Quants han fallat? (Busca les línies de resum, no cal que contis!)

> _Resposta:_

Fes correr també els tests de peticions REST.

    docker compose exec backend npm run bruno

**Pregunta 0.2b:** Quantes requests prova? Quantes han fallat?

> _Resposta:_

Fes commit dels canvis fins ara:

    git add .
    git commit -m "fase 0"

---

## Fase 1: HTTPS

La majoria de les proves de requests estan fallant amb l'error:

    (connect ECONNREFUSED 127.0.0.1:5443)

Obre el fitxer `src/server.js`.

**Pregunta 1.1:** En quin port està escoltant la app? Per què no es connecten aquestes peticions?

> _Resposta:_

Per poder treballar amb https anem a generar uns certificats auto-signats. En la mateixa terminal en que has fet correr els tests, fes la següent comanda:

    docker compose exec backend npm run certs

Comprova que a la carpeta `backend/certs` estan els certificats.

**Modificació 1.1:** Tenint en compte que els servidor https es crea igual que el http però passant-li les `tlsOptions` com a paràmetre abans de la app, fes que l'aplicació funcioni sobre https.
Tingues en compte que has de canviar el port.

**Pregunta 1.2:** Per què és millor que la nostra app treballi sobre https?

> _Resposta:_

**Pregunta 1.3:** Com funciona l'encriptació del tràfic https? Quina mena de xifratge es fa servir?

> _Resposta:_

Torna a fer correr les proves, i comprova com ha millorat:

    docker compose exec backend npm run bruno
    docker compose exec backend npm test

Fes commit dels canvis fins ara:

    git add .
    git commit -m "fase 1"

---

## Fase 2: Autenticació

Volem protegir les rutes que permeten modificar informació de tal manera que només un usuari registrat en pugui tenir accés.
L'app te un middleware definit `requireAuth` que permet verificar que s'està rebent un token que autentica a l'usuari.

**Modificació 2.1:** Afegix `requireAuth` a les següents rutes:

    post /articles/
    put /articles/:id
    patch /articles/:id
    delete /articles/:id

Afegeix-lo també a:

    get /auth/me

**Pregunta 2.1:** Què fa `requireAuth`? Modifica la `request` o la `response`?

Fes commit dels canvis fins ara:

    git add .
    git commit -m "fase 2"

---

## Fase 3: Gestió del password

Observa les funcions de `/auth/register` i `/auth/login`.
El password s'està emmagatzemant en clar!

**Pregunta 3.1:** Per què això és una mala política de seguretat?

> _Resposta:_

**Modificació 3.1:** Fes que el password s'emmagatzemi en forma de hash.
Al mateix `auth.js` tens una funció auxiliar per a fer el hash.
I, comentada, una funció que pots fer servir on faci falta per a verificar un password contra el hash emmagatzemat.

_No canvïis el nom del camp `passwordStored`, només el que s'hi emmagatzema_.

Tot i que ara ja no es guarda el password en clar, segueix sent mala política retornar el hash al client.

**Modificació 3.2:** A `data/users.js` hi ha la funció `toPublicUser`. Modifica-la adientment.

**Pregunta 3.2:** Per què és mala política de seguretat retornar el hash al client? Quin perill hi ha? Quina mena d'informació conté el hash?

> _Resposta:_

Fes commit dels canvis fins ara:

    git add .
    git commit -m "fase 3"

---

## Fase 4: CORS

La majoria dels tests que no passen es corresponen al CORS i al Helmet.

Obre el fitxer _app.js_ i busca on es configura CORS.

Tingues en compte que el nostre _backend_ dona servei a un _frontend_ que corre en el port 3000, i els tests estan ajustats a l'entorn de desenvolupament.

**Pregunta 4.1:** Que falta afegir o corregir a la configuració?

> _Resposta:_

**Modificació 4.1:** Modifica la configuració de CORS fins que desapareixin els errors de CORS (4 failed requests en bruno, 6 failed tests)

**Pregunta 4.2:** Per a que serveix CORS?

> _Resposta:_

**Pregunta 4.3:** Impedeix l'accés al servidor?

> _Resposta:_

Fes commit dels canvis fins ara:

    git add .
    git commit -m "fase 4"

---

## Fase 5: Helmet

Fixat ara en els errors de Helmet.

**Pregunta 5.1:** La capçalera _x-powered-by_, quina informació dona? Perquè és important no enviar-la?

> _Resposta:_

**Modificació 5.1:** Afegeix _helmet_ a la app. Comprova que els errors de helmet es corregeixen.

**Pregunta 5.2:** Se t'acut alguna protecció més que es pugui configurar a _helmet_ per sobre dels valors que ja porta per defecte i que sigui interessant en una backend de pur json? Justifica per què. No cal que la apliquis.

> _Resposta:_

Fes commit dels canvis fins ara:

    git add .
    git commit -m "fase 5"

---

## Fase 6: Emmascarar usuari inexistent

Si ens arriba una petició de login amb un usuari que existeix però el password es incorrecte, la resposta d'error, tot i ser la mateixa, és molt més lenta que si ens arriba una petició de login d'un usuari que no existeix.

**Pregunta 6.1:** Per què és important que la resposta trigui aproximadament el mateix existeixi o no l'usuari?

> _Resposta:_

**Modificació 6.1:** Modifica la funció de `/auth/login/` per a que triguin el mateix.
El test `✖ login with an unknown email still runs one argon2 verification with the same cost` hauria de passar a verd.

Fes commit dels canvis fins ara:

    git add .
    git commit -m "fase 6"

---

## Fase 7: Redirecció

Tot i que la nostra app ja no escolta al port http, voldriem mantenir-lo obert i redireccionar automàticament totes les peticions que hi arribin cap al port https.

Si tot va be, els tests relacionats amb la redirecció són els únics que queden en vermell.

**Modificació 7.1:** Redirecciona les peticions que arribin al port http cap al port https. Per garantir que es manté el mètode i el cos, fes servir status 308.

    res.redirect(308, `https://${req.hostname}:${config.httpsPort}${req.originalUrl}`);

Fes commit dels canvis fins ara:

    git add .
    git commit -m "fase 7"

---

## Fase 8: Tancament

**Pregunta 8.1:** Queda algun test en vermell? És important? Per què?

> _Resposta:_

**Modificació 8.1:** Fes que tots els test passin en verd.

## Entrega

Fes commit:

    git add .
    git commit -m "Tancament"

---

Fes un zip amb la carpeta sencera i puja-la al moodle.
