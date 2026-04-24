import React from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Users, 
  DollarSign, 
  Phone, 
  MapPin, 
  TrendingUpDown, 
  Award,
  Megaphone
} from "lucide-react";
import { DirectionDepartments } from "@/components/dashboard/DirectionDepartments";
import { commercialDepartments } from "@/data/orgData";

const CommercialDashboard = () => {
  return (
    <div className="p-6 bg-gradient-to-br from-amber-50 to-yellow-50 min-h-screen">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-gradient-to-r from-amber-500 to-yellow-600 rounded-xl">
            <Users className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Direction Commerciale <span className="text-sm font-normal text-amber-600">(D6)</span>
            </h1>
            <p className="text-gray-600">Pipeline, ventes, développement clients</p>
          </div>
        </div>
      </div>

      {/* KPI Commercial */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <DashboardKpi icon={DollarSign} title="CA Attaqué" value="€8.7M" trend="+14%" color="amber" />
        <DashboardKpi icon={TrendingUpDown} title="Conversion" value="28%" trend="+2pts" color="emerald" />
        <DashboardKpi icon={Users} title="Nouveaux clients" value="47" trend="+9" color="blue" />
        <DashboardKpi icon={Award} title="Winrate Q1" value="67%" trend="-3%" color="purple" />
      </div>

      {/* Départements Commerciale */}
      <DirectionDepartments
        title="Départements de la Direction Commerciale"
        departments={commercialDepartments}
        icon={Megaphone}
        colorClass="text-amber-600"
      />

      {/* Metrics Commercial */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <CommercialMetricBox title="Pipeline valeur">
          <div className="h-64 bg-gradient-to-r from-amber-50 to-emerald-50 rounded-2xl p-6">
            <div className="space-y-3 mb-6">
              <PipelineStage stage="Prospect" value="€2.1M" conversion="45%" />
              <PipelineStage stage="Négociation" value="€4.3M" conversion="68%" />
              <PipelineStage stage="Signature" value="€2.3M" conversion="92%" />
            </div>
            <div className="text-xl font-bold text-amber-900">Taux pondéré 28%</div>
          </div>
        </CommercialMetricBox>

        <CommercialMetricBox title="Top commerciaux">
          <div className="h-64 space-y-3 p-4 bg-white rounded-2xl">
            <CommercialRank name="Dupont J." ca="€1.47M" conversion="34%" rank={1} />
            <CommercialRank name="Martin L." ca="€1.23M" conversion="29%" rank={2} />
            <CommercialRank name="Leroy A." ca="€892K" conversion="25%" rank={3} />
          </div>
        </CommercialMetricBox>

        <CommercialMetricBox title="Zones géographiques">
          <div className="h-64 p-6 bg-gradient-to-b from-blue-50 to-amber-50 rounded-2xl space-y-3">
            <GeoZone city="Paris" pipeline="€3.2M" deals="18" />
            <GeoZone city="Lyon" pipeline="€1.8M" deals="9" />
            <GeoZone city="Marseille" pipeline="€1.4M" deals="7" />
            <GeoZone city="International" pipeline="€2.3M" deals="13" />
          </div>
        </CommercialMetricBox>
      </div>

      {/* Actions Commercial */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <CommercialActionBox title="🔥 Deals chauds">
          <DealRow client="Banque Nationale" value="€450K" stage="Final" prob="92%" />
          <DealRow client="Assureur X" value="€320K" stage="Négociation" prob="78%" />
          <DealRow client="Fintech Y" value="€210K" stage="Demo" prob="55%" />
        </CommercialActionBox>

        <CommercialActionBox title="📞 Follow-up aujourd'hui">
          <div className="space-y-2">
            <FollowupItem client="PME Nord" type="Rappel" urgency="Haute" />
            <FollowupItem client="CAC Ouest" type="Proposition" urgency="Moyenne" />
            <FollowupItem client="Mutuelle Sud" type="Qualif" urgency="Basse" />
          </div>
        </CommercialActionBox>

        <CommercialActionBox title="🎯 Objectifs commerciaux">
          <div className="space-y-3">
            <ObjectiveRow metric="CA Q1" target="€8M" achieved="€7.2M" progress="90%" />
            <ObjectiveRow metric="Nouveaux clients" target="60" achieved="47" progress="78%" />
            <ObjectiveRow metric="Winrate" target="70%" achieved="67%" progress="96%" />
          </div>
        </CommercialActionBox>
      </div>
    </div>
  );
};

// Composants Commercial
const DashboardKpi = ({ icon: Icon, title, value, trend, color }: any) => (
  <div className="group bg-white/80 backdrop-blur-sm p-6 rounded-2xl shadow-lg border border-white/50 hover:shadow-2xl transition-all hover:-translate-y-1">
    <div className="flex items-start gap-3 mb-3">
      <div className={`p-2 rounded-xl bg-gradient-to-r ${color === 'amber' ? 'from-amber-500 to-yellow-600' : color === 'emerald' ? 'from-emerald-500 to-teal-600' : color === 'blue' ? 'from-blue-500 to-cyan-600' : 'from-purple-500 to-pink-600'}`}>
        <Icon className="h-5 w-5 text-white" />
      </div>
      <div>
        <h3 className="text-sm font-medium text-gray-600">{title}</h3>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
      </div>
    </div>
    <Badge className={`ml-auto ${color === 'amber' ? 'bg-amber-100 text-amber-800' : color === 'emerald' ? 'bg-emerald-100 text-emerald-800' : color === 'blue' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'}`}>
      {trend}
    </Badge>
  </div>
);

const CommercialMetricBox = ({ title, children }: any) => (
  <div className="bg-white rounded-2xl shadow-lg border border-gray-100">
    <h3 className="font-semibold text-gray-900 p-6 pb-4 border-b border-gray-100">{title}</h3>
    <div className="p-6">
      {children}
    </div>
  </div>
);

const PipelineStage = ({ stage, value, conversion }: any) => (
  <div className="flex justify-between items-center p-3 bg-white rounded-lg shadow-sm border">
    <span className="font-medium">{stage}</span>
    <div className="text-right">
      <div className="font-mono font-bold text-lg">{value}</div>
      <div className="text-xs text-gray-500">{conversion}</div>
    </div>
  </div>
);

const CommercialRank = ({ name, ca, conversion, rank }: any) => (
  <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-amber-50 to-emerald-50 rounded-lg">
    <div className="w-8 h-8 bg-amber-500 text-white rounded-full flex items-center justify-center font-bold text-sm">{rank}</div>
    <span className="font-semibold min-w-0 truncate">{name}</span>
    <Badge className="font-mono">{ca}</Badge>
    <Badge variant="outline">{conversion}</Badge>
  </div>
);

const GeoZone = ({ city, pipeline, deals }: any) => (
  <div className="p-3 bg-white rounded-lg border shadow-sm">
    <p className="text-xs text-gray-600 uppercase font-medium">{city}</p>
    <p className="font-bold">{pipeline}</p>
    <p className="text-sm text-gray-500">({deals} deals)</p>
  </div>
);

const CommercialActionBox = ({ title, children }: any) => (
  <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
    <h3 className="font-semibold text-gray-900 mb-4">{title}</h3>
    {children}
  </div>
);

const DealRow = ({ client, value, stage, prob }: any) => (
  <div className="flex items-center gap-3 p-3 bg-emerald-50 rounded-lg border border-emerald-200 mb-2">
    <span className="font-bold text-emerald-800">{client}</span>
    <Badge variant="outline" className="font-mono">{value}</Badge>
    <span className="font-medium">{stage}</span>
    <div className="ml-auto font-mono text-sm text-gray-600">({prob})</div>
  </div>
);

const FollowupItem = ({ client, type, urgency }: any) => (
  <div className="flex items-center gap-3 p-2 rounded-lg bg-gray-50 hover:bg-gray-100">
    <span className="font-medium min-w-0 truncate">{client}</span>
    <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">{type}</span>
    <Badge className="ml-auto" variant={urgency === 'Haute' ? 'destructive' : 'secondary'}>{urgency}</Badge>
  </div>
);

const ObjectiveRow = ({ metric, target, achieved, progress }: any) => (
  <div className="flex items-center gap-4 p-3 bg-white border rounded-lg">
    <span className="font-semibold min-w-[140px]">{metric}</span>
    <span className="font-mono">{target}</span>
    <span className="font-mono font-bold text-emerald-600">{achieved}</span>
    <Badge className="ml-auto">{progress}</Badge>
  </div>
);

export default CommercialDashboard;

