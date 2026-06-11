/// <reference types="astro/client" />

// Variables de entorno disponibles en el Worker (Cloudflare runtime)
interface Env {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE: string;
}

type Runtime = import('@astrojs/cloudflare').Runtime<Env>;

declare namespace App {
  interface Locals extends Runtime {}
}
