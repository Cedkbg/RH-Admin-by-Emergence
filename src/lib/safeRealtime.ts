import { supabase } from "@/integrations/supabase/client";

/**
 * iOS Safari / WebView peut refuser l'ouverture de WebSocket
 * ("WebSocket not available: The operation is insecure") ce qui faisait
 * planter toute la page via l'ErrorBoundary. On enveloppe `subscribe()`
 * pour que l'échec realtime soit silencieux : l'app continue à fonctionner
 * sans temps réel.
 */
try {
  const client: any = supabase;
  const origChannel = client.channel?.bind(client);
  if (origChannel && !client.__safeRealtimePatched) {
    client.channel = (...args: any[]) => {
      const ch = origChannel(...args);
      if (ch && typeof ch.subscribe === "function" && !ch.__safeSubscribePatched) {
        const origSubscribe = ch.subscribe.bind(ch);
        ch.subscribe = (cb?: any) => {
          try {
            return origSubscribe(cb);
          } catch (e) {
            console.warn("[Realtime] indisponible, on continue sans :", e);
            return ch;
          }
        };
        ch.__safeSubscribePatched = true;
      }
      return ch;
    };
    client.__safeRealtimePatched = true;
  }
} catch (e) {
  console.warn("[Realtime] patch impossible", e);
}
