import { createAdminHandler } from '../_shared/admin-handler.js';

Deno.serve(createAdminHandler({
  url: Deno.env.get('SUPABASE_URL'),
  publicKey: Deno.env.get('SUPABASE_ANON_KEY'),
  serviceKey: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
}));
