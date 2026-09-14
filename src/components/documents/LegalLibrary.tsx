import { useEffect, useMemo, useState } from "react";
import { Search, BookOpen, ChevronRight, X, Scale, FileText } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

export interface LegalArticle {
  id: string;
  num: string;
  label: string;
  note: string | null;
  heading: string | null;
  titre: string | null;
  chapitre: string | null;
  section: string | null;
  text: string;
}

interface LegalDoc {
  id: string;
  title: string;
  subtitle: string;
  articles: LegalArticle[];
}

const DOC_LOADERS: Record<string, () => Promise<{ default: LegalDoc }>> = {
  statut: () => import("@/data/legal/statut-personnel.json") as Promise<{ default: LegalDoc }>,
  code: () => import("@/data/legal/code-travail.json") as Promise<{ default: LegalDoc }>,
};

const TABS = [
  { id: "statut", label: "Statut du personnel", icon: FileText },
  { id: "code", label: "Code du travail", icon: Scale },
] as const;

const normalize = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

/** Surligne les occurrences de la recherche dans un texte. */
const Highlight = ({ text, query }: { text: string; query: string }) => {
  if (!query.trim()) return <>{text}</>;
  const nText = normalize(text);
  const nQuery = normalize(query.trim());
  const parts: React.ReactNode[] = [];
  let i = 0;
  let found = nText.indexOf(nQuery);
  let key = 0;
  while (found !== -1 && nQuery.length > 1) {
    parts.push(text.slice(i, found));
    parts.push(
      <mark key={key++} className="rounded bg-primary/20 px-0.5 text-foreground">
        {text.slice(found, found + nQuery.length)}
      </mark>
    );
    i = found + nQuery.length;
    found = nText.indexOf(nQuery, i);
  }
  parts.push(text.slice(i));
  return <>{parts}</>;
};

const LegalLibrary = () => {
  const [docId, setDocId] = useState<string>("statut");
  const [docs, setDocs] = useState<Record<string, LegalDoc>>({});
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [titreFilter, setTitreFilter] = useState<string>("all");

  useEffect(() => {
    let active = true;
    if (docs[docId]) { setLoading(false); return; }
    setLoading(true);
    DOC_LOADERS[docId]()
      .then((m) => { if (active) setDocs((d) => ({ ...d, [docId]: m.default })); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docId]);

  const doc = docs[docId];
  const articles = doc?.articles ?? [];

  const titres = useMemo(() => {
    const set: string[] = [];
    articles.forEach((a) => { if (a.titre && !set.includes(a.titre)) set.push(a.titre); });
    return set;
  }, [articles]);

  const results = useMemo(() => {
    const q = normalize(query.trim());
    return articles.filter((a) => {
      if (titreFilter !== "all" && a.titre !== titreFilter) return false;
      if (!q) return true;
      return (
        normalize(a.label).includes(q) ||
        normalize(a.heading || "").includes(q) ||
        normalize(a.chapitre || "").includes(q) ||
        normalize(a.titre || "").includes(q) ||
        normalize(a.text).includes(q)
      );
    });
  }, [articles, query, titreFilter]);

  /** Groupement par titre puis chapitre pour une lecture structurée. */
  const groups = useMemo(() => {
    const map: { titre: string; chapitres: { chapitre: string; items: LegalArticle[] }[] }[] = [];
    results.forEach((a) => {
      const t = a.titre || "Dispositions";
      const c = a.chapitre || "";
      let g = map.find((x) => x.titre === t);
      if (!g) { g = { titre: t, chapitres: [] }; map.push(g); }
      let ch = g.chapitres.find((x) => x.chapitre === c);
      if (!ch) { ch = { chapitre: c, items: [] }; g.chapitres.push(ch); }
      ch.items.push(a);
    });
    return map;
  }, [results]);

  return (
    <section className="rounded-xl border bg-card shadow-sm">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b p-4">
        <div className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-primary" />
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide">Textes de référence</h2>
            <p className="text-xs text-muted-foreground">
              {doc ? doc.subtitle : "Chargement…"}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {TABS.map((t) => (
            <Button
              key={t.id}
              size="sm"
              variant={docId === t.id ? "default" : "outline"}
              onClick={() => { setDocId(t.id); setQuery(""); setTitreFilter("all"); setOpenId(null); }}
            >
              <t.icon className="mr-1.5 h-3.5 w-3.5" /> {t.label}
            </Button>
          ))}
        </div>
      </header>

      <div className="flex flex-wrap items-center gap-2 border-b p-4">
        <div className="relative min-w-[240px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher un article, un mot-clé (congé, salaire, préavis…)"
            className="pl-9 pr-9"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
              aria-label="Effacer la recherche"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <select
          value={titreFilter}
          onChange={(e) => setTitreFilter(e.target.value)}
          className="h-10 max-w-[280px] truncate rounded-md border bg-background px-3 text-sm"
        >
          <option value="all">Tous les titres</option>
          {titres.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <Badge variant="secondary" className="shrink-0">
          {loading ? "…" : `${results.length} article(s)`}
        </Badge>
      </div>

      {loading ? (
        <div className="p-12 text-center text-sm text-muted-foreground">Chargement du document…</div>
      ) : results.length === 0 ? (
        <div className="p-12 text-center text-sm text-muted-foreground">
          Aucun article ne correspond à « {query} ».
        </div>
      ) : (
        <ScrollArea className="h-[620px]">
          <div className="divide-y">
            {groups.map((g) => (
              <div key={g.titre}>
                <div className="sticky top-0 z-10 bg-secondary/60 px-4 py-2 text-xs font-semibold uppercase tracking-wide backdrop-blur">
                  {g.titre}
                </div>
                {g.chapitres.map((ch) => (
                  <div key={g.titre + ch.chapitre}>
                    {ch.chapitre && (
                      <p className="px-4 pt-3 text-xs font-medium text-muted-foreground">{ch.chapitre}</p>
                    )}
                    <ul className="divide-y">
                      {ch.items.map((a) => {
                        const open = openId === a.id;
                        return (
                          <li key={a.id}>
                            <button
                              onClick={() => setOpenId(open ? null : a.id)}
                              className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-muted/50"
                            >
                              <ChevronRight
                                className={cn("mt-0.5 h-4 w-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-90")}
                              />
                              <span className="min-w-0 flex-1">
                                <span className="flex flex-wrap items-center gap-2">
                                  <span className="text-sm font-semibold">
                                    <Highlight text={a.label} query={query} />
                                  </span>
                                  {a.heading && (
                                    <span className="text-sm text-muted-foreground">
                                      — <Highlight text={a.heading} query={query} />
                                    </span>
                                  )}
                                </span>
                                {!open && (
                                  <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                                    {a.text.replace(/\n+/g, " ").slice(0, 140)}…
                                  </span>
                                )}
                              </span>
                            </button>
                            {open && (
                              <div className="space-y-3 bg-muted/30 px-4 pb-5 pl-11 pt-1">
                                {a.note && (
                                  <Badge variant="outline" className="text-[10px]">{a.note}</Badge>
                                )}
                                {a.section && (
                                  <p className="text-xs italic text-muted-foreground">{a.section}</p>
                                )}
                                {a.text.split("\n\n").map((p, i) => (
                                  <p key={i} className="text-sm leading-relaxed text-foreground/90">
                                    <Highlight text={p} query={query} />
                                  </p>
                                ))}
                              </div>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </ScrollArea>
      )}
    </section>
  );
};

export default LegalLibrary;
