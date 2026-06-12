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

## Capas gratuitas (a junio 2026 — verifica en cloudflare.com si cambió)

- **Cloudflare Pages:** hosting ilimitado, gratis.
- **Cloudflare KV:** 100 000 lecturas/día y 1 000 escrituras/día gratis. Una quiniela
  de ~50 personas con ~4 partidos al día está muy lejos de esos límites.
- **Entra ID app registration:** siempre gratis.
- **MSAL.js:** biblioteca open source, CDN gratuita de Microsoft.
