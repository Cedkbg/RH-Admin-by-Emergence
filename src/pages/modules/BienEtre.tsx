import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, HeartHandshake, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRoles } from "@/hooks/useUserRoles";
import { WellbeingSurveyForm } from "@/components/wellbeing/WellbeingSurveyForm";
import { WellbeingStats } from "@/components/wellbeing/WellbeingStats";
import { AgentWellbeingBlock } from "@/components/wellbeing/AgentWellbeingBlock";
import { AgentWellbeingHistory } from "@/components/wellbeing/AgentWellbeingHistory";

interface EmployeeShort {
  first_name: string;
  last_name: string;
}

interface Survey {
  id: string;
  mood_score: number | null;
  energy_score: number | null;
  stress_score: number | null;
  comments: string | null;
  highlight: string | null;
  moment: string;
  submitted_at: string;
  employee_id: string | null;
  employees?: EmployeeShort | null;
}

interface AgentBlock {
  agentId: string;
  firstName: string;
  lastName: string;
  matricule: string | null;
  direction: string;
  department: string;
  position: string | null;
  avgMood: number | null;
  avgEnergy: number | null;
  avgStress: number | null;
  lastMood: number | null;
  lastEnergy: number | null;
  lastStress: number | null;
  lastHighlight: string | null;
  lastDate: string | null;
  totalEntries: number;
  morningDone: boolean;
  eveningDone: boolean;
}

const BienEtre = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { hasAny } = useUserRoles();
  const isHrPrivileged = hasAny(["admin", "rh", "dg", "dga", "manager", "assistant_direction", "secretaire"]);
  const [fullName, setFullName] = useState<string>("");
  const [myEmployeeId, setMyEmployeeId] = useState<string | null>(null);
  const [items, setItems] = useState<Survey[]>([]);
  const [employees, setEmployees] = useState<{ id: string; first_name: string; last_name: string; matricule: string | null; direction_id: string | null; department_id: string | null; position: string | null }[]>([]);
  const [directions, setDirections] = useState<Map<string, string>>(new Map());
  const [departments, setDepartments] = useState<Map<string, string>>(new Map());
  const [refreshKey, setRefreshKey] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);

  const triggerRefresh = () => setRefreshKey((k) => k + 1);

// Load all data
  useEffect(() => {
    const load = async () => {
      try {
        const [surveysRes, empsRes, dirsRes, depsRes] = await Promise.all([
          supabase
            .from("wellbeing_surveys")
            .select("*, employees(first_name, last_name)")
            .order("submitted_at", { ascending: false })
            .limit(200),
          supabase.from("employees").select("id,first_name,last_name,matricule,direction_id,department_id,position"),
          supabase.from("directions").select("id,name"),
          supabase.from("departments").select("id,name"),
        ]);
        setItems((surveysRes.data as unknown as Survey[]) || []);
        setEmployees((empsRes.data as any[]) || []);
        const dm = new Map<string, string>();
        ((dirsRes.data as any[]) || []).forEach((d: any) => dm.set(d.id, d.name));
        setDirections(dm);
        const pm = new Map<string, string>();
        ((depsRes.data as any[]) || []).forEach((d: any) => pm.set(d.id, d.name));
        setDepartments(pm);
      } catch (e) {
        console.error("BienEtre refresh failed", e);
      }
    };
    load();
  }, [refreshKey]);

  // Load profile full name
  useEffect(() => {
    if (!user?.id) return;
    supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.full_name) setFullName(data.full_name);
      });
  }, [user?.id]);

  // Find employee ID from email
  useEffect(() => {
    if (!user?.email) return;
    supabase
      .from("employees")
      .select("id")
      .ilike("email", user.email)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.id) setMyEmployeeId(data.id);
      });
  }, [user?.email]);

  const today = new Date().toISOString().slice(0, 10);

  const mine = useMemo(() => items.filter((i) => i.employee_id), [items]);

  const personalItems = useMemo(() => {
    if (!isHrPrivileged) return mine;
    if (!myEmployeeId) return [];
    return items.filter((i) => i.employee_id === myEmployeeId);
  }, [mine, items, isHrPrivileged, myEmployeeId]);

  const todayMine = useMemo(
    () => personalItems.filter((i) => i.submitted_at === today),
    [personalItems, today],
  );

  const doneMorning = todayMine.some((i) => i.moment === "morning");
  const doneEvening = todayMine.some((i) => i.moment === "evening");

  const avgFor = (key: "mood_score" | "energy_score" | "stress_score") => {
    const vals = personalItems.map((i) => i[key]).filter((v): v is number => v != null);
    if (!vals.length) return null;
    return (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1);
  };

  const avgMood = avgFor("mood_score");
  const avgEnergy = avgFor("energy_score");
  const avgStress = avgFor("stress_score");

  const removeSurvey = async (id: string) => {
    if (!confirm("Supprimer cette entrée ?")) return;
    const { error } = await supabase.from("wellbeing_surveys").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Supprimée");
    triggerRefresh();
  };

  // Build agent blocks
  const todayStr = today;

  const agentBlocks = useMemo(() => {
    const surveyByAgent = new Map<string, Survey[]>();
    items.forEach((s) => {
      const eid = s.employee_id || "orphan";
      if (!surveyByAgent.has(eid)) surveyByAgent.set(eid, []);
      surveyByAgent.get(eid)!.push(s);
    });

    return employees
      .map((emp) => {
        const empSurveys = surveyByAgent.get(emp.id) || [];
        if (empSurveys.length === 0) return null;

        const moodVals = empSurveys.map((s) => s.mood_score).filter((v): v is number => v != null);
        const energyVals = empSurveys.map((s) => s.energy_score).filter((v): v is number => v != null);
        const stressVals = empSurveys.map((s) => s.stress_score).filter((v): v is number => v != null);
        const avg = (arr: number[]) =>
          arr.length > 0 ? +(arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(1) : null;

        const last = empSurveys[0] || null;
        const todayEntries = empSurveys.filter((s) => s.submitted_at === todayStr);

        return {
          agentId: emp.id,
          firstName: emp.first_name,
          lastName: emp.last_name,
          matricule: emp.matricule,
          direction: emp.direction_id ? directions.get(emp.direction_id) || "—" : "—",
          department: emp.department_id ? departments.get(emp.department_id) || "—" : "—",
          position: emp.position,
          avgMood: avg(moodVals),
          avgEnergy: avg(energyVals),
          avgStress: avg(stressVals),
          lastMood: last?.mood_score ?? null,
          lastEnergy: last?.energy_score ?? null,
          lastStress: last?.stress_score ?? null,
          lastHighlight: last?.highlight ?? null,
          lastDate: last?.submitted_at ?? null,
          totalEntries: empSurveys.length,
          morningDone: todayEntries.some((s) => s.moment === "morning"),
          eveningDone: todayEntries.some((s) => s.moment === "evening"),
        } as AgentBlock;
      })
      .filter((block): block is AgentBlock => block !== null)
      .filter((block) => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return (
          block.lastName.toLowerCase().includes(q) ||
          block.firstName.toLowerCase().includes(q) ||
          (block.matricule || "").toLowerCase().includes(q) ||
          block.direction.toLowerCase().includes(q)
        );
      });
  }, [employees, items, directions, searchQuery, todayStr]);

  const selectedAgent = selectedAgentId
    ? employees.find((e) => e.id === selectedAgentId)
    : null;

  const selectedAgentData = selectedAgent
    ? agentBlocks.find((b) => b.agentId === selectedAgentId)
    : null;

  return (
    <div className="mx-auto max-w-[1400px] space-y-6 animate-fade-in pb-8">
      <Button variant="ghost" onClick={() => navigate(-1)} className="w-fit -ml-2">
        <ArrowLeft className="mr-2 h-4 w-4" /> Retour
      </Button>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Bien-être & QVT</h1>
          <p className="text-sm text-muted-foreground">
            Journal de bien-être — humeur, énergie, stress. Marquez votre ressenti matin et soir.
          </p>
        </div>
      </div>

      {/* Formulaire personnel */}
      <WellbeingSurveyForm
        fullName={fullName}
        doneMorning={doneMorning}
        doneEvening={doneEvening}
        onSuccess={triggerRefresh}
      />

      {/* Mes statistiques */}
      <WellbeingStats
        avgMood={avgMood}
        avgEnergy={avgEnergy}
        avgStress={avgStress}
        totalEntries={personalItems.length}
      />

      {/* Section agents (si RH) */}
      {isHrPrivileged && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <HeartHandshake className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">Vue d'ensemble des agents</h3>
              <Badge variant="secondary" className="ml-1">
                {agentBlocks.length} agent{agentBlocks.length > 1 ? "s" : ""}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Rechercher un agent…"
                  className="h-9 pl-9 text-sm"
                />
              </div>
            </div>
          </div>

          {/* Agent blocks grid */}
          {agentBlocks.length === 0 ? (
            <Card className="p-12 text-center text-sm text-muted-foreground border-dashed">
              {searchQuery
                ? "Aucun agent ne correspond à votre recherche."
                : "Aucune donnée bien-être disponible pour les agents."}
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {agentBlocks.map((block) => (
                <AgentWellbeingBlock
                  key={block.agentId}
                  {...block}
                  onClick={() => setSelectedAgentId(block.agentId)}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* Agent detail dialog */}
      {selectedAgent && selectedAgentData && (
        <AgentWellbeingHistory
          agentId={selectedAgentData.agentId}
          firstName={selectedAgentData.firstName}
          lastName={selectedAgentData.lastName}
          matricule={selectedAgentData.matricule}
          direction={selectedAgentData.direction}
          onClose={() => setSelectedAgentId(null)}
          onDelete={removeSurvey}
        />
      )}
    </div>
  );
};

export default BienEtre;

