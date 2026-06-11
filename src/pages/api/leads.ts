import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';

// Este endpoint se ejecuta como Cloudflare Worker (on-demand), no es estático.
export const prerender = false;

/**
 * Lee las credenciales según el entorno:
 *  - Producción (Cloudflare): locals.runtime.env  ← variables del proyecto Pages
 *  - Local (astro dev): import.meta.env            ← archivo .env
 * La SERVICE_ROLE key es secreta: solo vive aquí, en el servidor. Nunca al cliente.
 */
function getEnv(locals: App.Locals) {
  const runtimeEnv = (locals as any)?.runtime?.env ?? {};
  return {
    url: runtimeEnv.SUPABASE_URL ?? import.meta.env.SUPABASE_URL,
    serviceRole: runtimeEnv.SUPABASE_SERVICE_ROLE ?? import.meta.env.SUPABASE_SERVICE_ROLE,
  };
}

function clean(v: unknown): string | null {
  const s = typeof v === 'string' ? v.trim() : '';
  return s.length ? s : null;
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const body = await request.json().catch(() => ({}));

    // Validación de servidor (nunca confíes solo en el navegador)
    const nombre = clean(body.nombre);
    const telefono = clean(body.telefono);
    if (!nombre || !telefono) {
      return json({ ok: false, error: 'Nombre y teléfono son obligatorios.' }, 400);
    }

    const { url, serviceRole } = getEnv(locals);
    if (!url || !serviceRole) {
      console.error('Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE.');
      return json({ ok: false, error: 'Servidor sin configurar.' }, 500);
    }

    // supabase-js funciona en Workers usando fetch (HTTP), no conexión Postgres directa.
    const supabase = createClient(url, serviceRole, {
      auth: { persistSession: false },
    });

    // Normaliza servicios: acepta `servicios` (array) o `servicio` (string)
    const servicios: string[] | null = Array.isArray(body.servicios)
      ? body.servicios.map(String)
      : clean(body.servicio)
        ? [String(body.servicio)]
        : null;

    const { error } = await supabase.from('leads').insert({
      nombre,
      telefono,
      email: clean(body.email),
      empresa: clean(body.empresa),
      region: clean(body.region),
      segmento: clean(body.segmento),
      servicios,
      mensaje: clean(body.mensaje),
      descripcion: clean(body.descripcion),
      urgencia: clean(body.urgencia),
      origen: clean(body.origen) ?? 'web',
    });

    if (error) {
      console.error('Error al insertar lead en Supabase:', error.message);
      return json({ ok: false, error: 'No se pudo guardar la solicitud.' }, 500);
    }

    return json({ ok: true });
  } catch (e) {
    console.error('Error inesperado en /api/leads:', e);
    return json({ ok: false, error: 'Error inesperado.' }, 500);
  }
};
