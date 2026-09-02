import { useEffect, useState } from "react";
import { Coffee, Clock, XCircle, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const kinshasaToday = () =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Kinshasa", year: "numeric", month: "2-digit", day: "2-digit" })
    .format(new Date());

export function BreakStats() {
  const [counts, setCounts] = useState({ on_break: 0, postponed: 0, skipped: 0, done: 0 });

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("break_sessions")
        .select("status")
        .eq("date", kinshasaToday());
      const c = { on_break: 0, postponed: 0, skipped: 0, done: 0 };
      (data || []).forEach((r: { status: string }) => {
        if (r.status in c) c[r.status as keyof typeof c] += 1;
      });
      setCounts(c);
    };
    load();
    const id = setInterval(load, 60_000);
    return () => clearInterval(id);
  }, []);

  const items = [
    { key: "on_break", label: "En pause", value: counts.on_break, icon: Coffee, cls: "text-amber-600 bg-amber-500/10" },
    { key: "postponed", label: "Pauses décalées", value: counts.postponed, icon: Clock, cls: "text-blue-600 bg-blue-500/10" },
    { key: "done", label: "Pauses terminées", value: counts.done, icon: CheckCircle2, cls: "text-emerald-600 bg-emerald-500/10" },
    { key: "skipped", label: "Sans pause", value: counts.skipped, icon: XCircle, cls: "text-muted-foreground bg-muted" },
  ];

  return (
    <section className="rounded-xl border bg-card p-4 shadow-sm">
      <h2 className="mb-3 text-sm font-semibold">Pauses du jour</h2>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {items.map((i) => {
          const I = i.icon;
          return (
            <div key={i.key} className="flex items-center gap-3 rounded-lg border p-3">
              <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${i.cls}`}>
                <I className="h-4 w-4" />
              </div>
              <div>
                <p className="text-lg font-bold leading-none">{i.value}</p>
                <p className="text-xs text-muted-foreground">{i.label}</p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
