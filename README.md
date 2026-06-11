# Innovatar.cl

Plataforma tecnológica de generación de oportunidades, construida en **Astro 5 + Tailwind CSS 4**.
Sitio rápido, premium y orientado a conversión (leads, cotizaciones y el diferenciador *Diagnóstico Inteligente*).

---

## 🚀 Cómo ejecutarlo en VS Code

### 1. Requisitos previos
- **Node.js 18.20.8+ o 20.3.0+** (recomendado 20 o 22). Verifícalo con:
  ```bash
  node -v
  ```
  Si no lo tienes, descárgalo desde https://nodejs.org

### 2. Abrir el proyecto
- Abre VS Code → **Archivo → Abrir carpeta** → selecciona la carpeta `innovatar`.
- VS Code te sugerirá instalar las extensiones recomendadas (Astro + Tailwind). Acéptalas.

### 3. Instalar dependencias
Abre la terminal integrada (**Ctrl + ñ** o **Terminal → Nueva terminal**) y ejecuta:
```bash
npm install
```

### 4. Levantar el servidor de desarrollo
```bash
npm run dev
```
Abre el navegador en **http://localhost:4321**

### Otros comandos
```bash
npm run build     # Compila el sitio a /dist (producción)
npm run preview   # Previsualiza el build de producción
```

---

## 📁 Estructura del proyecto

```
innovatar/
├── astro.config.mjs          # Config Astro + plugin Tailwind v4
├── package.json
├── tsconfig.json
├── public/
│   └── favicon.svg
└── src/
    ├── styles/
    │   └── global.css        # Tokens de diseño, animaciones, clases base
    ├── layouts/
    │   └── Layout.astro      # HTML base + SEO + fuentes + schema
    ├── components/
    │   ├── Header.astro            # Nav sticky + menú móvil
    │   ├── Hero.astro              # Hero principal (animaciones on-load)
    │   ├── StatsBar.astro          # Stats con count-up al hacer scroll
    │   ├── ValueProps.astro        # 4 pilares de valor
    │   ├── Services.astro          # Grid de 6 servicios
    │   ├── DiagnosticoBanner.astro # ⭐ Banda Diagnóstico Inteligente
    │   ├── Process.astro           # Proceso en 4 pasos
    │   ├── Cases.astro             # Casos de éxito con resultados
    │   ├── CTASection.astro        # CTA final + formulario rápido
    │   ├── Footer.astro
    │   └── WhatsAppFloat.astro     # Botón flotante + barra inferior móvil
    └── pages/
        ├── index.astro       # Home (ensambla todas las secciones)
        ├── diagnostico.astro # Flujo Diagnóstico Inteligente (3 pasos)
        └── cotizar.astro     # Formulario de cotización
```

---

## 🎨 Sistema de diseño

Los tokens están en `src/styles/global.css` dentro de `@theme` (Tailwind v4):

| Token | Valor | Uso |
|---|---|---|
| `--color-ink` | `#060B17` | Fondo base oscuro |
| `--color-ink-soft` | `#0A1020` | Secciones alternadas |
| `--color-accent` | `#0EA5E9` | CTAs y acentos |
| `--font-display` | Plus Jakarta Sans | Tipografía |

Clases reutilizables: `.btn-primary`, `.btn-ghost`, `.btn-whatsapp`, `.gradient-text`, `.eyebrow`, `.chip`, `.glass-card`.

---

## 🔌 Backend: Supabase + Cloudflare (Fase 1 — ¡ya implementado!)

Los formularios ya **guardan los leads en Supabase** a través de un Worker, y además abren WhatsApp como canal inmediato. Arquitectura:

```
Formulario web  →  POST /api/leads (Cloudflare Worker)  →  Supabase (PostgreSQL)
                                                         ↘  + abre WhatsApp
Dashboard (aparte) ──lee directo──→ Supabase (anon key + RLS)
```

**Modelo de seguridad (importante):**
- El **Worker** escribe usando la `service_role` key → bypassa RLS, vive como secreto del servidor, **nunca** llega al navegador.
- El **dashboard** lee con la `anon` key + sesión autenticada → **RLS** garantiza que solo tu equipo autenticado ve los leads.
- En la tabla `leads`, RLS está activo: no hay política de INSERT pública (nadie inserta con la anon key), y el SELECT está permitido solo a usuarios `authenticated`.

### Puesta en marcha (10 minutos)

**1. Crear el proyecto Supabase**
- Entra a https://supabase.com → New project.
- Ve a **SQL Editor → New query**, pega el contenido de `supabase/schema.sql` y ejecútalo. Esto crea la tabla `leads` y las políticas RLS.

**2. Conectar credenciales en local**
- Copia `.env.example` a `.env`:
  ```bash
  cp .env.example .env
  ```
- En Supabase → **Settings → API**, copia:
  - **Project URL** → `SUPABASE_URL`
  - **service_role** key → `SUPABASE_SERVICE_ROLE`  ⚠️ secreta

**3. Probar localmente**
  ```bash
  npm install
  npm run dev
  ```
  Envía el formulario de cotización en http://localhost:4321 y verás el registro aparecer en Supabase → **Table Editor → leads**.

**4. Desplegar en Cloudflare Pages**
- Sube el repo a GitHub y conéctalo en Cloudflare → **Pages → Create**.
- Build command: `npm run build` · Output: `dist`
- En **Settings → Environment variables**, agrega `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE` (marca esta última como *Secret*). El Worker las lee en producción vía `locals.runtime.env`.

### Nota técnica (Workers ↔ Supabase)
El Worker se conecta a Supabase con `supabase-js` sobre **fetch/HTTP**, no por conexión Postgres directa. Los Cloudflare Workers no mantienen conexiones TCP persistentes, así que esta es la forma correcta y la que está implementada en `src/pages/api/leads.ts`.

---

---

## 📊 Mini CRM de Leads (`/dashboard`) — ¡ya implementado!

Panel interno en `http://localhost:4321/dashboard` que **lee y escribe directo en Supabase** (anon key + RLS), sin pasar por el Worker. Funciona como un CRM ligero:
- Login con email/contraseña (Supabase Auth).
- Tarjetas resumen (total, hoy, sin contactar, ganados).
- **Vista Tabla**: búsqueda, filtro por origen y por estado.
- **Vista Kanban**: columnas por etapa (Nuevo → Contactado → Cotizado → Ganado/Perdido). **Arrastra una tarjeta** entre columnas para cambiar su estado.
- **Detalle editable** en modal: cambia el estado, escribe **notas de seguimiento** y responde por WhatsApp con un clic.

**Modelo de seguridad:** la tabla `leads` tiene políticas RLS de `SELECT` y `UPDATE` solo para usuarios `authenticated`. El equipo logueado lee todos los leads y edita estado/notas; nadie sin sesión accede a nada. El `INSERT` sigue siendo exclusivo del Worker (service_role).

**Cómo darle acceso a tu equipo:**
1. Instalación nueva: ejecuta `supabase/schema.sql`. Si ya tenías la versión de solo-lectura: ejecuta `supabase/02_crm_update.sql` (añade `notas`/`updated_at` y la política UPDATE).
2. En Supabase → **Authentication → Users → Add user**, crea las cuentas de tu equipo.

**Variables que necesita** (en `.env.example`): `PUBLIC_SUPABASE_URL` y `PUBLIC_SUPABASE_ANON_KEY`.

> ⚠️ Las variables `PUBLIC_*` se inyectan en **tiempo de build**. En Cloudflare Pages, agrégalas también en las *Environment variables* del proyecto, porque `npm run build` las necesita para el dashboard.

---

## 🗺 Roadmap sobre este stack

- **Fase 1 (hecho):** formularios → Worker → Supabase. Captación y persistencia de leads. **Dashboard de lectura (`/dashboard`).**
- **Fase 2:** edición de estado de leads (con política UPDATE en RLS), tablas operativas (cotizaciones, trabajos, equipos, facturas), automatizaciones (n8n/Make), archivos en Cloudflare R2.
- **Fase 3:** reemplazar la clasificación por reglas del Diagnóstico (`classify()` en `diagnostico.astro`) por un agente IA en el Worker. La interfaz no cambia.

---

## 📄 Páginas pendientes de construir
Los enlaces ya apuntan a estas rutas; solo falta crearlas siguiendo los wireframes:
`/servicios` y `/servicios/[slug]`, `/soluciones/[segmento]`, `/casos-de-exito`,
`/mesa-de-ayuda`, `/blog`, `/nosotros`, `/contacto`, `/gracias`.

---

*Construido con ❤️ en Chile.*
