import { createAdminHandler } from '../_shared/admin-handler.js';

Deno.serve(createAdminHandler({
  url: Deno.env.get('SUPABASE_URL'),
  publicKey: Deno.env.get('SUPABASE_ANON_KEY'),
  serviceKey: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
  allowedOrigins: (Deno.env.get('ALLOWED_ORIGINS') || 'https://wang03062001.github.io').split(',').map(value => value.trim()),
  siteUrl: Deno.env.get('APP_SITE_URL') || 'https://wang03062001.github.io/webapp-calendar/',
}));
