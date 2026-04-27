import { useEffect, useState } from "react";
import { BarChart3, Users, Briefcase, GraduationCap, Wallet, Calendar, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

const Rapports = () => {
  const [stats, setStats] = useState({
    employees: 0, directions: 0, jobs: 0, trainings: 0, leaves: 0, payroll: 0,
  });

  useEffect(() => {
    (async () => {
      const tables = ["employees", "directions", "job_offers", "trainings", "leave_requests", "payroll"] as const;
      const counts = await Promise.all(
        tables.map((t) => supabase.from(t).select("*", { count: "exact", head: true }))
      );
      setStats({
        employees: counts[0].count ?? 0,
        directions: counts[1].count ?? 0,
        jobs: counts[2].count ?? 0,
        trainings: counts[3].count ?? 0,
        leaves: counts[4].count ?? 0,
        payroll: counts[5].count ?? 0,
      });
    })();
  }, []);

  const cards = [
    { label: "Agents", value: stats.employees, icon: Users, color: "text-module-blue bg-module-blue/10" },
    { label: "Directions", value: stats.directions, icon: BarChart3, color: "text-module-green bg-module-green/10" },
    { label: "Offres d'emploi", value: stats.jobs, icon: Briefcase, color: "text-module-pink bg-module-pink/10" },
    { label: "Formations", value: stats.trainings, icon: GraduationCap, color: "text-module-teal bg-module-teal/10" },
    { label: "Demandes de congé", value: stats.leaves, icon: Calendar, color: "text-module-orange bg-module-orange/10" },
    { label: "Bulletins de paie", value: stats.payroll, icon: Wallet, color: "text-module-yellow bg-module-yellow/10" },
  ];

  return (
    <div className="mx-auto max-w-[1400px] space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Rapports & Analyses</h1>
        <p className="text-sm text-muted-foreground">Indicateurs clés de l'organisation.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => {
          const I = c.icon;
          return (
            <div key={c.label} className="rounded-xl border bg-card p-5 shadow-sm">
              <div className={`mb-3 flex h-12 w-12 items-center justify-center rounded-lg ${c.color}`}>
                <I className="h-6 w-6" />
              </div>
              <p className="text-xs font-medium uppercase text-muted-foreground">{c.label}</p>
              <p className="mt-1 text-3xl font-bold">{c.value}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Rapports;
