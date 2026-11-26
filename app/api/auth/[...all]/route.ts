import { toNextJsHandler } from 'better-auth/next-js';
import { getAuth } from '@/src/lib/auth';

export const dynamic = 'force-dynamic';

function normalizeProxyRequest(request: Request): Request {
  const rawHost = request.headers.get('x-forwarded-host') || request.headers.get('host') || '';
  const host = rawHost.split(',')[0].trim();
  if (!host) return request;

  const isLocalHost = /^(localhost|127\.0\.0\.1)(:\d+)?$/i.test(host);
  if (isLocalHost) return request;

  const rawProto = (request.headers.get('x-forwarded-proto') || '').split(',')[0].trim().toLowerCase();
  if ((host.endsWith('.run.app') || host.endsWith('.vercel.app')) && rawProto !== 'https') {
    const headers = new Headers(request.headers);
    headers.set('x-forwarded-proto', 'https');
    headers.set('x-forwarded-host', host);
    return new Request(request, { headers });
  }
  return request;
}

async function handleRequest(request: Request): Promise<Response> {
  try {
    const normalizedRequest = normalizeProxyRequest(request);
    const auth = await getAuth();
    const handlers = toNextJsHandler(auth);
    switch (normalizedRequest.method) {
      case 'GET':
        return await handlers.GET(normalizedRequest);
      case 'POST':
        return await handlers.POST(normalizedRequest);
      case 'PATCH':
        return await handlers.PATCH(normalizedRequest);
      case 'PUT':
        return await handlers.PUT(normalizedRequest);
      case 'DELETE':
        return await handlers.DELETE(normalizedRequest);
      default:
        return new Response('Method Not Allowed', { status: 405 });
    }
  } catch (err: any) {
    console.error('Better Auth route error:', err?.message || err);
    const msg = 'Authentication service unavailable. Please verify MongoDB Atlas connectivity.';
    return Response.json(
      { error: msg, message: msg },
      { status: 503 }
    );
  }
}

export const GET = handleRequest;
export const POST = handleRequest;
export const PATCH = handleRequest;
export const PUT = handleRequest;
export const DELETE = handleRequest;
