# La Quiniela Mundialista — Despliegue GRATUITO en Cloudflare + login de Microsoft

Login de Microsoft real (Entra ID), datos compartidos en Cloudflare KV.
**Sin costo.** No se necesita ningún secreto en el código.

Tiempo estimado: 25–35 minutos.

---

## Archivos del proyecto

```
quiniela-cloudflare/
├── index.html              La app (MSAL.js para login de Microsoft)
├── wrangler.toml           Config de Cloudflare (solo referencia / dev local)
├── .gitignore
└── functions/
    └── api/
        └── data.js         Cloudflare Pages Function (API + KV + validación JWT)
└── README.md
```

---

## Paso 1 — Subir a GitHub

1. Crea un repo nuevo en GitHub (privado está bien), p. ej. `quiniela-mundial`.
2. Sube el **contenido de esta carpeta** a la raíz del repo.
   - `index.html` debe quedar en la raíz, **no** dentro de otra carpeta.
   - Puedes arrastrar los archivos en la web de GitHub ("Add file → Upload files").

---

## Paso 2 — Registrar la app en Entra ID  ← sin secreto, tipo SPA

1. Ve a `entra.microsoft.com` → **Identidad → Aplicaciones → Registros de aplicaciones** →
   **+ Nuevo registro**.
2. Nombre: `Quiniela Mundial`.
3. **Tipos de cuenta admitidos:** *"Solo cuentas de este directorio organizativo"*.
4. **URI de redirección:**
   - Plataforma: **Aplicación de página única (SPA)** ← ¡importante! No "Web".
   - URI: `https://quiniela-mundial.pages.dev` (o la URL que Cloudflare te asigne en el Paso 3;
     puedes volver a agregar la URL real después).
5. **Registrar.**
6. En la página **Información general** anota:
   - **ID de aplicación (cliente)** → `CLIENT_ID`
   - **ID de directorio (inquilino)** → `TENANT_ID`

> ✅ Con tipo SPA y PKCE **no se necesita** un client secret. Eso es lo que hace este
>    despliegue completamente gratuito y sin secretos en el código.

---

## Paso 3 — Crear el proyecto en Cloudflare Pages

1. Ve a `dash.cloudflare.com` → **Workers & Pages** → **Create** → **Pages** →
   **Connect to Git**.
2. Autoriza Cloudflare en GitHub y elige tu repo `quiniela-mundial`.
3. **Build settings:**
   - Framework preset: **None**
   - Build command: *(déjalo vacío)*
   - Build output directory: *(déjalo vacío)*
4. **Save and Deploy.** Cloudflare hace el primer despliegue en ~1 minuto y te da la URL,
   algo como `https://quiniela-mundial.pages.dev`. **Cópiala.**

---

## Paso 4 — Crear el KV Namespace y enlazarlo

1. En el Dashboard de Cloudflare → **Workers & Pages** → **KV** → **Create a namespace**.
   Nombre: `quiniela-kv`. Crea. Anota el **Namespace ID** (lo ves en la lista).
2. Ve a tu proyecto Pages → **Settings** → **Functions** →
   **KV namespace bindings** → **Add binding**:
   - **Variable name:** `QUINIELA_KV`
   - **KV namespace:** `quiniela-kv`
3. Guarda.

---

## Paso 5 — Variables de entorno en Cloudflare

En tu proyecto Pages → **Settings** → **Environment variables** → **Add variable**:

| Variable    | Valor                                    |
|-------------|------------------------------------------|
| `TENANT_ID` | el ID de directorio (inquilino) del Paso 2 |

*(El `CLIENT_ID` va en el código de `index.html`, no es secreto; se agrega en el Paso 6.)*

Guarda los cambios y ve a **Deployments** → **Retry deployment** para que el Worker tome
las nuevas variables.

---

## Paso 6 — Pegar tus IDs en index.html y subir

Abre `index.html` con cualquier editor de texto (Notepad, VS Code, etc.).
Las dos primeras líneas del script son:

```js
const MSAL_CLIENT_ID = 'REEMPLAZA_CLIENT_ID';
const MSAL_TENANT_ID = 'REEMPLAZA_TENANT_ID';
```

Reemplaza los valores por los que anotaste en el Paso 2. Guarda el archivo, súbelo
a GitHub (reemplaza el anterior) y Cloudflare redesplegará automáticamente en ~1 min.

---

## Paso 7 — Agregar la URL real a Entra (si aún no lo hiciste)

Si en el Paso 2 pusiste una URL provisional, ahora que ya tienes la URL real:
- Entra ID → tu registro → **Autenticación** → en la sección "SPA" agrega:
  `https://TU-SUBDOMINIO.pages.dev`

---

## Paso 8 — Probar

1. Abre la URL de Cloudflare en una ventana privada.
2. Debería redirigirte al login de Microsoft. Entra con una cuenta de tu organización.
3. Verás la quiniela con los 72 partidos y tu nombre de Office arriba a la derecha.
4. Entra a **Organizador**, cambia el **PIN** (viene `1234`) y prueba cargar un resultado.

---

## Paso 9 — Compartir desde Viva Engage

Crea una publicación fijada en la comunidad correspondiente:

> ⚽ ¡Quiniela del Mundial! Entra con tu cuenta de Office, pronostica los marcadores
> del día y compite por el puntaje semanal:
> https://TU-SUBDOMINIO.pages.dev

---

## Si algo falla

| Síntoma                            | Causa probable                                              |
|------------------------------------|-------------------------------------------------------------|
| Bucle de login                     | URI de redirección en Entra no coincide con la URL real     |
| Error "Token inválido"             | `TENANT_ID` mal copiado en Cloudflare o en index.html       |
| "Falta el KV binding"              | El binding `QUINIELA_KV` no se guardó o no redeployaste     |
| No guarda / todo vacío             | El KV binding está mal nombrado (debe ser `QUINIELA_KV`)    |
| Solo te deja entrar a ti           | Revisa "Tipos de cuenta" en Entra (debe ser "este directorio") |

---

## Funciones nuevas (estadísticas, cuenta regresiva, imagen, rol de organizador, etc.)

Estas ya vienen en el código. Las que son solo del navegador funcionan al redesplegar
`index.html`. Las de seguridad/rol requieren un par de pasos extra que se indican abajo.

**Del lado del navegador (sin configuración):**
- **📊 Mis estadísticas** (pestaña Tabla → General): puntos, % de aciertos, marcadores
  exactos, mejor racha de exactos y mejor semana.
- **⏱ Cuenta regresiva** al próximo partido (arriba en Partidos).
- **🔔 Recordatorio** en la app: avisa cuántos partidos abiertos te faltan por pronosticar.
- **📸 Compartir imagen del ganador**: en la vista Por semana, genera una imagen del
  campeón para postear en Engage.

**Pronóstico inmutable en el servidor (#7).** Ya está activo: los pronósticos se envían por
`/api/predict`, que verifica en el servidor que el partido siga abierto y **rechaza cambiar
un pronóstico ya enviado**, aunque alguien intente llamar la API directamente.
> ⚠️ Debes desplegar **las dos** funciones (`functions/api/data.js` y `functions/api/predict.js`).
> Si subes el `index.html` nuevo sin `predict.js`, no se podrán guardar pronósticos.

**Rol de organizador en Entra (#6) — opcional pero recomendado.**
Hace que solo cuentas autorizadas puedan cargar resultados, a nivel servidor (no solo el PIN).

1. En `entra.microsoft.com` → tu registro `cloud-quiniela` → **Roles de aplicación** →
   **Crear rol de aplicación**:
   - Nombre para mostrar: `Organizador`
   - Tipos de miembro permitidos: **Usuarios o grupos**
   - **Valor:** `Organizer`  ← exactamente así (lo lee el código)
   - Descripción: cualquiera. Aplicar.
2. Ve a **Aplicaciones empresariales** → busca `cloud-quiniela` → **Usuarios y grupos** →
   **Agregar usuario** → elígete a ti (y a otros organizadores) y asígnales el rol **Organizador**.
3. En Cloudflare → tu proyecto → **Settings → Environment variables**, agrega:
   | Variable      | Valor    |
   |---------------|----------|
   | `ORG_ENFORCE` | `true`   |
   | `CLIENT_ID`   | tu client id (si no lo agregaste ya) |
   Vuelve a desplegar.
4. Cierra sesión y entra de nuevo (para que el token traiga el rol). Como organizador,
   la pestaña Organizador se abre sin PIN; para los demás, el servidor rechaza cargar
   resultados.

> Si NO pones `ORG_ENFORCE=true`, todo sigue como hasta ahora (el PIN es el único gate).
> Alternativa sin roles: en vez del rol, puedes listar los object-id de los organizadores
> en una variable `ORGANIZER_OIDS` (separados por coma).

---

## Recordatorio diario automático (#8) — con Power Automate (gratis, ya lo tienes)

Un aviso *automático* cada mañana no se puede hacer solo con esta app (haría falta un
servidor que envíe correos/notificaciones). Pero como tu organización tiene Microsoft 365,
puedes armar un **flujo programado en Power Automate** (incluido) en 5 minutos:

1. Ve a `make.powerautomate.com` → **Crear** → **Flujo de nube programado**.
2. Repetir **cada día** a la hora que quieras (p. ej. 8:00 a.m.).
3. Acción: **publicar mensaje** en un canal de **Teams** o en una comunidad de **Viva Engage**
   (busca el conector correspondiente), con un texto como:
   > ⚽ ¡No olvides tus pronósticos del día! https://cloud-quiniela.pages.dev
4. Guarda. Listo: recordatorio diario sin costo.

(El aviso dentro de la app —🔔— ya funciona cuando la persona la abre; esto agrega el
empujón externo.)

---

## Seguridad — evitar que terceros extraigan información

Esta versión incluye varias barreras para que nadie externo lea datos de las cuentas:

1. **Toda la API exige un token válido de Microsoft de tu organización.** La función verifica
   la firma del token (RS256 con las claves públicas de tu inquilino), que sea de tu
   inquilino (`tid`), que no esté vencido y que haya sido emitido **para esta app** (`aud`).
   Sin ese token nadie puede leer ni escribir; un atacante externo no puede obtenerlo.
2. **CORS restringido al propio dominio.** La API solo responde al origen de tu app, no a
   sitios externos.
3. **Encabezados de seguridad** (archivo `_headers`): Content-Security-Policy (bloquea
   scripts externos y limita a dónde puede conectarse la página), `frame-ancestors 'none'`
   y `X-Frame-Options: DENY` (impiden que otra web la incruste para engañar al usuario),
   `nosniff`, `Referrer-Policy: no-referrer`, HSTS, etc.
4. **Escape de texto** en nombres y equipos, para evitar inyección de scripts.

**Para activar el refuerzo de la audiencia del token**, agrega una variable más en
Cloudflare (Settings → Environment variables) y vuelve a desplegar:

| Variable    | Valor                                              |
|-------------|----------------------------------------------------|
| `CLIENT_ID` | el ID de aplicación (cliente) del Paso 2 (público) |
| `APP_ORIGIN`| `https://TU-SUBDOMINIO.pages.dev` (opcional, fija el CORS) |

> Nota honesta: esto protege muy bien frente a accesos externos. No te defiende de un
> usuario *interno* malintencionado que ya tiene sesión (podría llamar a la API con su
> propio token). Para ese caso está el **rol de organizador** (mencionado abajo) y el
> bloqueo inmutable de pronósticos en el servidor. Para una quiniela entre compañeros,
> lo que tienes ya es sólido.
>
> Si más adelante quieres **incrustar** la app dentro de SharePoint/Teams (en un iframe),
> habrá que relajar `frame-ancestors`/`X-Frame-Options` para permitir ese dominio.

---

## Capas gratuitas (a junio 2026 — verifica en cloudflare.com si cambió)

- **Cloudflare Pages:** hosting ilimitado, gratis.
- **Cloudflare KV:** 100 000 lecturas/día y 1 000 escrituras/día gratis. Una quiniela
  de ~50 personas con ~4 partidos al día está muy lejos de esos límites.
- **Entra ID app registration:** siempre gratis.
- **MSAL.js:** biblioteca open source, CDN gratuita de Microsoft.
