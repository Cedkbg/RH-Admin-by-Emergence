import React from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Package, 
  ShoppingBag, 
  Star, 
  Users, 
  TrendingUp, 
  AlertTriangle
} from "lucide-react";
import { DirectionDepartments } from "@/components/dashboard/DirectionDepartments";
import { productDepartments } from "@/data/orgData";

const ProductDashboard = () => {
  return (
    <div className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 min-h-screen">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl">
            <Package className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Direction Produits <span className="text-sm font-normal text-green-600">(D2)</span>
            </h1>
            <p className="text-gray-600">Lifecycle produit, roadmap, UX/UI</p>
          </div>
        </div>
      </div>

      {/* KPI Product */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <DashboardKpi icon={Package} title="Produits actifs" value="47" trend="+2" color="emerald" />
        <DashboardKpi icon={Star} title="NPS score" value="8.7/10" trend="+0.3" color="yellow" />
        <DashboardKpi icon={ShoppingBag} title="Churn mensuel" value="2.1%" trend="-0.4%" color="blue" />
        <DashboardKpi icon={Users} title="Utilisateurs MAU" value="28.4K" trend="+12%" color="purple" />
      </div>

      {/* Départements Produits */}
      <DirectionDepartments
        title="Départements de la Direction Produits"
        departments={productDepartments}
        icon={Package}
        colorClass="text-green-600"
      />

      {/* Metrics Product */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <ProductMetricBox title="Roadmap Q1">
          <div className="h-64 bg-gradient-to-r from-emerald-50 to-green-50 rounded-2xl p-6">
            <div className="space-y-3 mb-4">
              <RoadmapItem phase="Design" status="100%" />
              <RoadmapItem phase="Dev" status="75%" />
              <RoadmapItem phase="Test" status="20%" />
              <RoadmapItem phase="Release" status="0%" />
            </div>
            <div className="text-2xl font-bold text-gray-900">On track</div>
          </div>
        </ProductMetricBox>

        <ProductMetricBox title="Top Features">
          <div className="h-64 space-y-3 p-4 bg-white rounded-2xl">
            <FeatureItem score="92" title="Mobile App" usage="84%" />
            <FeatureItem score="87" title="API Banking" usage="67%" />
            <FeatureItem score="76" title="Analytics" usage="45%" />
          </div>
        </ProductMetricBox>

        <ProductMetricBox title="Feedback utilisateurs">
          <div className="h-64 p-4 bg-gradient-to-b from-purple-50 to-pink-50 rounded-2xl space-y-3">
            <div className="flex justify-between text-sm">
              <span>⭐⭐⭐⭐⭐</span><span>247</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>⭐⭐⭐⭐</span><span>89</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>⭐⭐⭐</span><span>12</span>
            </div>
            <div className="text-xl font-bold text-emerald-600">4.7/5</div>
          </div>
        </ProductMetricBox>
      </div>

      {/* Actions Product */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <ProductActionBox title="🚨 Features bloquantes">
          <ActionRow icon="⚠️" status="Blocked" title="Payment UX" priority="High" />
          <ActionRow icon="⏳" status="Review" title="Dashboard v2" priority="Medium" />
        </ProductActionBox>

        <ProductActionBox title="📱 Releases récentes">
          <ActionRow icon="🚀" status="Live" title="App v2.4.1" date="Aujourd'hui" />
          <ActionRow icon="✅" status="Approved" title="Web v1.9.3" date="Hier" />
        </ProductActionBox>

        <ProductActionBox title="🎯 Priorités semaine">
          <ActionRow icon="🔥" status="P1" title="Mobile perf" effort="8h" />
          <ActionRow icon="📈" status="P2" title="A/B testing" effort="16h" />
          <ActionRow icon="🔍" status="P3" title="User survey" effort="4h" />
        </ProductActionBox>
      </div>
    </div>
  );
};

// Composants Product
const DashboardKpi = ({ icon: Icon, title, value, trend, color }: any) => (
  <div className="group bg-white/80 backdrop-blur-sm p-6 rounded-2xl shadow-lg border border-white/50 hover:shadow-2xl transition-all hover:-translate-y-1">
    <div className="flex items-start gap-3 mb-3">
      <div className={`p-2 rounded-xl bg-gradient-to-r ${color === 'emerald' ? 'from-emerald-500 to-emerald-600' : color === 'yellow' ? 'from-yellow-500 to-amber-600' : color === 'blue' ? 'from-blue-500 to-blue-600' : 'from-purple-500 to-purple-600'}`}>
        <Icon className="h-5 w-5 text-white" />
      </div>
      <div>
        <h3 className="text-sm font-medium text-gray-600">{title}</h3>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
      </div>
    </div>
    <Badge className={`ml-auto ${color === 'emerald' ? 'bg-emerald-100 text-emerald-800' : color === 'yellow' ? 'bg-yellow-100 text-yellow-800' : color === 'blue' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'}`}>
      {trend}
    </Badge>
  </div>
);

const ProductMetricBox = ({ title, children }: any) => (
  <div className="bg-white rounded-2xl shadow-lg border border-gray-100">
    <h3 className="font-semibold text-gray-900 p-6 pb-4 border-b border-gray-100">{title}</h3>
    <div className="p-6">
      {children}
    </div>
  </div>
);

const RoadmapItem = ({ phase, status }: any) => (
  <div className="flex items-center gap-3 p-2">
    <div className="w-2 h-2 bg-emerald-500 rounded-full" />
    <span className="font-medium">{phase}</span>
    <div className="ml-auto">
      <div className="w-20 bg-gray-200 rounded-full h-2">
        <div className="bg-emerald-500 h-2 rounded-full" style={{ width: status }} />
      </div>
    </div>
  </div>
);

const FeatureItem = ({ score, title, usage }: any) => (
  <div className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
    <span className="text-lg font-bold text-emerald-600">{score}</span>
    <span className="font-medium">{title}</span>
    <Badge className="ml-auto">{usage}</Badge>
  </div>
);

const ProductActionBox = ({ title, children }: any) => (
  <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
    <h3 className="font-semibold text-gray-900 mb-4">{title}</h3>
    {children}
  </div>
);

const ActionRow = ({ icon, status, title, priority, effort, date }: any) => (
  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg mb-2 last:mb-0 hover:bg-gray-100 transition-colors">
    <span className="text-lg">{icon}</span>
    <div className="flex-1">
      <p className="font-medium text-gray-900">{title}</p>
      {priority && <Badge variant="secondary">{priority}</Badge>}
      {date && <p className="text-sm text-gray-500">{date}</p>}
      {effort && <p className="text-xs text-gray-400">{effort}</p>}
    </div>
    <Badge>{status}</Badge>
  </div>
);

export default ProductDashboard;

