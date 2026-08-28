import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AdminNavBar } from "@/components/layout/AdminNavBar";
import KPICards from "./components/KPICards";
import FiltersBar from "./components/FiltersBar";
import LoanTrendChart from "./components/LoanTrendChart";
import TopMaterialsChart from "./components/TopMaterialsChart";
import RejectionReasonsChart from "./components/RejectionReasonsChart";
import LoanStatusChart from "./components/LoanStatusChart";
import RecentLoansTable from "./components/RecentLoansTable";
import {
  fetchKPIData,
  fetchTrendData,
  fetchTopMaterials,
  fetchRejectionReasons,
  fetchLoanStatusData,
  fetchRecentLoans,
} from "./actions";

type LoanRecord = {
  id: number;
  usuarioNombre: string;
  usuarioEmail: string;
  materiales: string;
  fechaSolicitud: Date;
  estado: string;
  razonRechazo?: string | undefined;
};

// Skeleton loaders
const ChartSkeleton = () => (
  <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-8 animate-pulse">
    <div className="h-4 bg-slate-200 rounded w-1/4 mb-6"></div>
    <div className="h-64 bg-slate-100 rounded"></div>
  </div>
);

const KPISkeleton = () => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
    {[...Array(4)].map((_, i) => (
      <div key={i} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 animate-pulse">
        <div className="h-4 bg-slate-200 rounded w-1/2 mb-4"></div>
        <div className="h-8 bg-slate-200 rounded w-1/3"></div>
      </div>
    ))}
  </div>
);

const TableSkeleton = () => (
  <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden animate-pulse">
    <div className="p-6 border-b border-slate-200">
      <div className="h-4 bg-slate-200 rounded w-1/4"></div>
    </div>
    <div className="divide-y divide-slate-200">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="px-6 py-4 h-12 bg-slate-50"></div>
      ))}
    </div>
  </div>
);

export const metadata = {
  title: "Reportes y Analítica | Admin",
  description: "Dashboard de análisis y reportes del sistema de inventario",
};

export default async function AnalyticsDashboard() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/login");
  }

  const role = (session.user as any).role || "USUARIO";
  if (role !== "ADMIN") {
    redirect("/dashboard/usuario");
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <AdminNavBar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Page header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">
            Reportes y Analítica
          </h1>
          <p className="text-sm text-slate-500 mt-2">
            Dashboard de análisis del sistema de inventario y préstamos
          </p>
        </div>

        {/* KPI Cards */}
        <Suspense fallback={<KPISkeleton />}>
          <KPICardsWrapper />
        </Suspense>

        {/* Filters */}
        <FiltersBar />

        {/* Charts Grid - Row 1: Trend */}
        <Suspense fallback={<ChartSkeleton />}>
          <TrendChartWrapper />
        </Suspense>

        {/* Charts Grid - Row 2: Materials & Rejections */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <Suspense fallback={<ChartSkeleton />}>
            <TopMaterialsWrapper />
          </Suspense>
          <Suspense fallback={<ChartSkeleton />}>
            <RejectionReasonsWrapper />
          </Suspense>
        </div>

        {/* Status Distribution */}
        <Suspense fallback={<ChartSkeleton />}>
          <LoanStatusWrapper />
        </Suspense>

        {/* Recent Loans Table */}
        <Suspense fallback={<TableSkeleton />}>
          <RecentLoansWrapper />
        </Suspense>
      </main>
    </div>
  );
}

// Server Component Wrappers for Data Fetching

async function KPICardsWrapper() {
  const data = await fetchKPIData();
  return <KPICards data={data} />;
}

async function TrendChartWrapper() {
  const data = await fetchTrendData(30);
  return <LoanTrendChart data={data} timeRange="month" />;
}

async function TopMaterialsWrapper() {
  const data = await fetchTopMaterials(5);
  return <TopMaterialsChart data={data} />;
}

async function RejectionReasonsWrapper() {
  const data = await fetchRejectionReasons(5);
  return <RejectionReasonsChart data={data} />;
}

async function LoanStatusWrapper() {
  const data = await fetchLoanStatusData();
  return <LoanStatusChart data={data} />;
}

async function RecentLoansWrapper() {
  const { loans, total } = await fetchRecentLoans(10, 0);
  return <RecentLoansTable data={loans as LoanRecord[]} total={total} />;
}
