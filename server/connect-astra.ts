/** Bound only the handshake; an established WebSocket must outlive this timer. */
export async function connectAstra(key:string, timeoutMs=15000):Promise<Response> {
  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),timeoutMs);
  try {
    return await fetch('https://api.openai.com/v1/responses',{
      headers:{Upgrade:'websocket',Authorization:`Bearer ${key}`},
      signal:controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}
