export default {
  async fetch(request, env) {
    const headers = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type,Authorization',
      'Content-Type': 'application/json'
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers });
    }

    const url = new URL(request.url);

    if (url.pathname === '/health') {
      return new Response(JSON.stringify({ ok: true }), { headers });
    }

    if (url.pathname === '/upload' && request.method === 'POST') {
      try {
        const formData = await request.formData();
        const file = formData.get('file');
        const folder = formData.get('folder') || 'banners';
        if (!file || typeof file === 'string') {
          return new Response(JSON.stringify({ error: 'No file' }), { status: 400, headers });
        }
        const contentType = file.type || 'application/octet-stream';
        const fileBuffer = await file.arrayBuffer();
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        const key = folder + '/' + Date.now() + '_' + safeName;
        await env.R2_BUCKET.put(key, fileBuffer, { httpMetadata: { contentType } });
        const publicUrl = env.R2_PUBLIC_URL + '/' + key;
        return new Response(JSON.stringify({ ok: true, url: publicUrl, key }), { headers });
      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500, headers });
      }
    }

    if (url.pathname === '/delete' && request.method === 'DELETE') {
      try {
        const { key } = await request.json();
        if (!key) return new Response(JSON.stringify({ error: 'No key' }), { status: 400, headers });
        await env.R2_BUCKET.delete(key);
        return new Response(JSON.stringify({ ok: true }), { headers });
      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500, headers });
      }
    }

    return new Response(JSON.stringify({ error: 'Not found' }), { status: 404, headers });
  }
};
