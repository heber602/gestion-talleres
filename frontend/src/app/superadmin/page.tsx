"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpRight, Building2, CheckCircle2, CreditCard, FlaskConical, LayoutDashboard, LogOut, RefreshCw, Search, ShieldCheck, Users, Wallet } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useAuth } from "@/context/AuthContext";
import {
  createSuperadminAccount,
  fetchSuperadminFinances,
  fetchSuperadminPlanRequests,
  fetchSuperadminPlans,
  fetchSuperadminTenants,
  fetchSuperadminTestAccounts,
  fetchSuperadminUsers,
  getStoredStaffToken,
  moderateTenant,
  resolveSuperadminPlanRequest,
  upsertPlatformPlan,
  type PlanChangeRequest,
  type PlatformFinanceSummary,
  type PlatformPlan,
  type SuperadminTenant,
  type SuperadminTestAccount,
  type SuperadminUser,
} from "@/lib/auth-api";

type TenantStatus = "active" | "suspended";
type BillingCycle = "monthly" | "semiannual" | "annual";
type AdminView = "overview" | "tenants" | "requests" | "finances" | "plans" | "users";
const adminViews = [
  { id: "overview", label: "Resumen", icon: LayoutDashboard },
  { id: "tenants", label: "Talleres", icon: Building2 },
  { id: "requests", label: "Solicitudes", icon: CreditCard },
  { id: "finances", label: "Finanzas", icon: Wallet },
  { id: "plans", label: "Planes", icon: ShieldCheck },
  { id: "users", label: "Usuarios", icon: Users },
] as const;
const viewDescriptions: Record<AdminView, string> = {
  overview: "",
  tenants: "Buscá un taller y seleccioná su ficha para gestionar estado, contrato y renovaciones.",
  requests: "Revisá quién pidió un cambio de plan y decidí si corresponde aprobarlo.",
  finances: "Consultá los ingresos estimados por planes y la distribución de tu plataforma.",
  plans: "Elegí un plan para editar su precio, capacidad y funciones incluidas.",
  users: "Encontrá personas por nombre, rol o taller y consultá su último acceso.",
};

const inputClassName =
  "mt-1 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-500/15";

const tooltipStyle = {
  borderRadius: "16px",
  border: "1px solid rgba(255,255,255,0.08)",
  background: "#0f172a",
  color: "#e2e8f0",
};

export default function SuperAdminPage() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const didInit = useRef(false);
  const [view, setView] = useState<AdminView>("overview");
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");
  const [tenantSearch, setTenantSearch] = useState("");
  const [tenantStatusFilter, setTenantStatusFilter] = useState("all");
  const [showCreateAdmin, setShowCreateAdmin] = useState(false);

  const [tenants, setTenants] = useState<SuperadminTenant[]>([]);
  const [users, setUsers] = useState<SuperadminUser[]>([]);
  const [testAccounts, setTestAccounts] = useState<SuperadminTestAccount[]>([]);
  const [plans, setPlans] = useState<PlatformPlan[]>([]);
  const [finances, setFinances] = useState<PlatformFinanceSummary | null>(null);
  const [planRequests, setPlanRequests] = useState<PlanChangeRequest[]>([]);
  const [selectedTenant, setSelectedTenant] = useState<SuperadminTenant | null>(null);

  const [status, setStatus] = useState<TenantStatus>("active");
  const [planOverride, setPlanOverride] = useState("starter");
  const [userLimit, setUserLimit] = useState("8");
  const [moderationNote, setModerationNote] = useState("");
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("monthly");
  const [planStartAt, setPlanStartAt] = useState("");
  const [planEndsAt, setPlanEndsAt] = useState("");
  const [nextRenewalAt, setNextRenewalAt] = useState("");
  const [autoRenew, setAutoRenew] = useState(true);
  const [effectiveMonthlyPrice, setEffectiveMonthlyPrice] = useState("0");

  const [planForm, setPlanForm] = useState({
    code: "starter",
    name: "",
    monthlyPrice: "29",
    maxUsers: "4",
    maxWorkOrders: "30",
    features: "",
    active: true,
  });

  const [userSearch, setUserSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("todos");
  const [tenantFilter, setTenantFilter] = useState("todos");
  const [error, setError] = useState("");
  const [planRequestsSupported, setPlanRequestsSupported] = useState(true);
  const [savingTenant, setSavingTenant] = useState(false);
  const [savingPlan, setSavingPlan] = useState(false);
  const [resolvingRequestId, setResolvingRequestId] = useState<string | null>(null);
  const [superadminForm, setSuperadminForm] = useState({
    name: "",
    email: "",
    password: "",
    tenantId: "",
  });
  const [creatingSuperadmin, setCreatingSuperadmin] = useState(false);

  useEffect(() => { window.scrollTo({ top: 0 }); }, [view]);

  useEffect(() => {
    if (!user) router.replace("/login");
    else if (user.role !== "superadmin") router.replace("/");
  }, [router, user]);

  const loadAll = useCallback(async (token: string, initialize = false, keepTenantId?: string) => {
    setLoading(true);
    try {
      setError("");
      const [tenantRows, userRows, testAccountRows, planRows, financeRows] = await Promise.all([
        fetchSuperadminTenants(token),
        fetchSuperadminUsers(token),
        fetchSuperadminTestAccounts(token),
        fetchSuperadminPlans(token),
        fetchSuperadminFinances(token),
      ]);
      let supportsPlanRequests = true;
      const planRequestRows = await fetchSuperadminPlanRequests(token).catch(() => {
        supportsPlanRequests = false;
        return [];
      });

      setTenants(tenantRows);
      setUsers(userRows);
      setTestAccounts(testAccountRows);
      setPlans(planRows);
      setFinances(financeRows);
      setPlanRequests(planRequestRows);
      setPlanRequestsSupported(supportsPlanRequests);
      setSuperadminForm((prev) => ({
        ...prev,
        tenantId: prev.tenantId || tenantRows[0]?.id || "",
      }));

      const nextTenant =
        tenantRows.find((tenant) => tenant.id === keepTenantId) ??
        tenantRows[0] ??
        null;

      if (nextTenant) {
        hydrateTenant(nextTenant);
      }

      if (initialize && planRows[0]) {
        hydratePlan(planRows[0]);
        didInit.current = true;
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "No se pudo cargar el panel de 81cc.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user?.role !== "superadmin") return;
    const token = getStoredStaffToken();
    if (!token) return;
    void loadAll(token, !didInit.current);
  }, [loadAll, user]);

  const hydrateTenant = (tenant: SuperadminTenant) => {
    setSelectedTenant(tenant);
    setStatus(tenant.status as TenantStatus);
    setPlanOverride(tenant.effectivePlan || tenant.plan);
    setUserLimit(String(tenant.maxCapacity));
    setModerationNote(tenant.moderationNote ?? "");
    setBillingCycle(tenant.billingCycle);
    setPlanStartAt(toInputDate(tenant.planStartAt));
    setPlanEndsAt(toInputDate(tenant.planEndsAt));
    setNextRenewalAt(toInputDate(tenant.nextRenewalAt));
    setAutoRenew(tenant.autoRenew);
    setEffectiveMonthlyPrice(String(tenant.effectiveMonthlyPrice));
  };

  const hydratePlan = (plan: PlatformPlan) => {
    setPlanForm({
      code: plan.code,
      name: plan.name,
      monthlyPrice: String(plan.monthlyPrice),
      maxUsers: String(plan.maxUsers),
      maxWorkOrders: plan.maxWorkOrders != null ? String(plan.maxWorkOrders) : "",
      features: plan.features.join(", "),
      active: plan.active,
    });
  };

  const saveTenant = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const token = getStoredStaffToken();
    if (!token || !selectedTenant) return;
    try {
      setSavingTenant(true);
      setError("");
      await moderateTenant(token, selectedTenant.id, {
        status,
        planOverride,
        moderationNote: moderationNote.trim() || null,
        maxCapacity: Number(userLimit),
        billingCycle,
        planStartAt,
        planEndsAt,
        nextRenewalAt,
        autoRenew,
        effectiveMonthlyPrice: Number(effectiveMonthlyPrice),
      });
      await loadAll(token, false, selectedTenant.id);
      setNotice(`Configuración de ${selectedTenant.name} guardada.`);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "No se pudo guardar la configuración.");
    } finally {
      setSavingTenant(false);
    }
  };

  const savePlan = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const token = getStoredStaffToken();
    if (!token) return;
    try {
      setSavingPlan(true);
      setError("");
      const rows = await upsertPlatformPlan(token, {
        code: planForm.code.trim().toLowerCase(),
        name: planForm.name.trim(),
        monthlyPrice: Number(planForm.monthlyPrice),
        maxUsers: Number(planForm.maxUsers),
        maxWorkOrders: planForm.maxWorkOrders ? Number(planForm.maxWorkOrders) : null,
        features: planForm.features.split(",").map((item) => item.trim()).filter(Boolean),
        active: planForm.active,
      });
      setPlans(rows);
      const next = rows.find((item) => item.code === planForm.code.trim().toLowerCase());
      if (next) hydratePlan(next);
      setFinances(await fetchSuperadminFinances(token));
      setNotice("Plan guardado correctamente.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "No se pudo guardar el plan.");
    } finally {
      setSavingPlan(false);
    }
  };

  const resolvePlanRequest = async (
    requestId: string,
    action: "approve" | "reject",
  ) => {
    const token = getStoredStaffToken();
    if (!token) return;
    try {
      setResolvingRequestId(requestId);
      setError("");
      const rows = await resolveSuperadminPlanRequest(token, requestId, {
        action,
        reviewNote: action === "approve" ? "Aprobado desde panel superadmin." : "Rechazado desde panel superadmin.",
      });
      setPlanRequests(rows);
      await loadAll(token, false, selectedTenant?.id);
      setNotice(action === "approve" ? "Solicitud aprobada." : "Solicitud rechazada.");
    } catch (resolveError) {
      setError(resolveError instanceof Error ? resolveError.message : "No se pudo resolver la solicitud.");
    } finally {
      setResolvingRequestId(null);
    }
  };

  const createNewSuperadmin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const token = getStoredStaffToken();
    if (!token) return;
    try {
      setCreatingSuperadmin(true);
      setError("");
      await createSuperadminAccount(token, {
        name: superadminForm.name.trim(),
        email: superadminForm.email.trim(),
        password: superadminForm.password,
        tenantId: superadminForm.tenantId || undefined,
      });
      setSuperadminForm((prev) => ({ ...prev, name: "", email: "", password: "" }));
      await loadAll(token, false, selectedTenant?.id);
      setNotice("Superadministrador creado correctamente.");
      setShowCreateAdmin(false);
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "No se pudo crear el superadmin.");
    } finally {
      setCreatingSuperadmin(false);
    }
  };

  const filteredUsers = useMemo(() => {
    const search = userSearch.trim().toLowerCase();
    return users.filter((entry) => {
      const matchesSearch =
        !search ||
        entry.name.toLowerCase().includes(search) ||
        entry.email.toLowerCase().includes(search) ||
        entry.tenantName.toLowerCase().includes(search);
      return (
        matchesSearch &&
        (roleFilter === "todos" || entry.role === roleFilter) &&
        (tenantFilter === "todos" || entry.tenantId === tenantFilter)
      );
    });
  }, [roleFilter, tenantFilter, userSearch, users]);

  if (!user || user.role !== "superadmin") return null;

  const pendingRequests = planRequests.filter((request) => request.status === "pending");
  const needsAttention = tenants.filter((tenant) => tenant.warningLevel !== "normal" || tenant.status === "suspended").sort((a, b) => a.remainingDays - b.remainingDays);
  const visibleTenants = tenants.filter((tenant) => {
    const matchesSearch = `${tenant.name} ${tenant.ownerEmail ?? ""}`.toLowerCase().includes(tenantSearch.toLowerCase());
    return matchesSearch && (tenantStatusFilter === "all" || (tenantStatusFilter === "attention" ? tenant.warningLevel !== "normal" : tenant.status === tenantStatusFilter));
  });
  const openTenant = (tenant: SuperadminTenant) => { hydrateTenant(tenant); setView("tenants"); setNotice(""); };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.16),transparent_18%),radial-gradient(circle_at_20%_78%,rgba(245,158,11,0.14),transparent_20%),radial-gradient(circle_at_92%_20%,rgba(168,85,247,0.12),transparent_16%),linear-gradient(180deg,#07111f_0%,#0b1424_48%,#08111c_100%)] text-white">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-slate-950/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <div>
            <div className="text-2xl font-extrabold tracking-tight">81<span className="text-amber-400">cc</span></div>
            <p className="text-xs font-medium tracking-wide text-slate-400">CENTRO DE CONTROL</p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => router.push("/laboratorio")} className="flex items-center gap-2 rounded-xl border border-sky-400/20 bg-sky-400/10 px-3 py-2 text-sm font-semibold text-sky-100">
              <FlaskConical size={16} /> Laboratorio
            </button>
            <button onClick={() => { logout(); router.push("/login"); }} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-300">
              <span className="flex items-center gap-2"><LogOut size={16} /> Salir</span>
            </button>
          </div>
        </div>
        <nav aria-label="Secciones de administración" className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-4 sm:px-6">
          {adminViews.map(({ id, label, icon: Icon }) => <button key={id} type="button" aria-current={view === id ? "page" : undefined} onClick={() => { setView(id); setNotice(""); }} className={`flex shrink-0 items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition ${view === id ? "border-amber-400 text-amber-300" : "border-transparent text-slate-400 hover:bg-white/5 hover:text-white"}`}><Icon size={17} />{label}{id === "requests" && pendingRequests.length > 0 && <span className="rounded-full bg-amber-400 px-2 text-xs text-slate-950">{pendingRequests.length}</span>}</button>)}
        </nav>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6">
        <div className="flex items-start justify-between gap-4">
          <div><p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-sky-300">Administración de 81cc</p><h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{view === "overview" ? "Tu plataforma, de un vistazo" : adminViews.find((entry) => entry.id === view)?.label}</h1><p className="mt-2 text-sm text-slate-400">{view === "overview" ? `Hola, ${user.name.split(" ")[0]}. Estos son los números y las tareas que necesitan tu atención.` : viewDescriptions[view]}</p></div>
          <button type="button" aria-label="Actualizar panel" disabled={loading} onClick={() => { const token = getStoredStaffToken(); if (token) void loadAll(token, false, selectedTenant?.id); }} className="rounded-xl border border-white/10 p-3 text-slate-300 transition hover:bg-white/10 disabled:opacity-40"><RefreshCw size={18} className={loading ? "animate-spin" : ""} /></button>
        </div>
        {error ? <div role="alert" className="rounded-2xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error} <span>Usá Actualizar panel para reintentar.</span></div> : null}
        {notice && <div role="status" className="flex items-center gap-2 rounded-xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-sm text-emerald-200"><CheckCircle2 size={18} />{notice}</div>}
        {loading && <p role="status" className="text-sm text-sky-200">Actualizando información…</p>}

        {view === "overview" && <>
          <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <KpiCard label="Talleres activos" value={loading && !finances ? "—" : finances?.headline.activeTenants ?? 0} description="Talleres habilitados en la plataforma" tone="sky" />
            <KpiCard label="Ingreso mensual" value={loading && !finances ? "—" : `$${(finances?.headline.mrr ?? 0).toLocaleString("es-AR")}`} description="Recurrente estimado según los planes" tone="amber" />
            <KpiCard label="Solicitudes pendientes" value={loading ? "—" : pendingRequests.length} description="Cambios de plan por resolver" tone="violet" />
            <KpiCard label="Requieren atención" value={loading ? "—" : needsAttention.length} description="Vencimientos próximos o suspensiones" tone="rose" />
          </section>
          <section className="grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
            <Panel title="Qué necesita tu atención" subtitle="Empezá por lo que tiene una acción pendiente">
              {!loading && !needsAttention.length && !pendingRequests.length && <div className="rounded-2xl border border-emerald-400/15 bg-emerald-400/5 p-6"><CheckCircle2 className="mb-3 text-emerald-300" size={30} /><h3 className="font-bold text-emerald-100">Todo al día</h3><p className="mt-2 text-sm text-slate-400">No hay solicitudes pendientes, vencimientos próximos ni talleres suspendidos.</p></div>}
              {pendingRequests.length > 0 && <button onClick={() => setView("requests")} className="mb-3 flex w-full items-center justify-between gap-3 rounded-xl border border-amber-400/20 bg-amber-400/10 p-4 text-left"><div><p className="font-semibold text-amber-100">{pendingRequests.length} {pendingRequests.length === 1 ? "solicitud de plan" : "solicitudes de plan"}</p><p className="mt-1 text-xs text-slate-400">Revisá los pedidos de los talleres</p></div><ArrowUpRight size={20} /></button>}
              {needsAttention.slice(0, 4).map((tenant) => <button key={tenant.id} onClick={() => openTenant(tenant)} className="mb-2 flex w-full flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-4 text-left transition hover:border-amber-400/40"><div><p className="font-semibold">{tenant.name}</p><p className="mt-1 text-xs text-slate-400">{tenant.status === "suspended" ? "Taller suspendido" : remainingLabel(tenant.remainingDays)}</p></div><span className="flex items-center gap-3"><WarningBadge level={tenant.warningLevel} /><ArrowUpRight size={18} /></span></button>)}
              {needsAttention.length > 4 && <button onClick={() => { setTenantStatusFilter("all"); setView("tenants"); }} className="mt-3 text-sm font-semibold text-sky-300">Ver todos los talleres →</button>}
            </Panel>
            <Panel title="Acciones rápidas" subtitle="Un acceso directo a cada tarea">
              <div className="space-y-3">{[{title:"Gestionar talleres", description:"Contratos, vigencia y estado", target:"tenants" as AdminView, icon:Building2}, {title:"Revisar solicitudes", description:"Aprobar o rechazar cambios de plan", target:"requests" as AdminView, icon:CreditCard}, {title:"Explorar usuarios", description:"Accesos y actividad del equipo", target:"users" as AdminView, icon:Users}].map(({title,description,target,icon:Icon}) => <button key={target} onClick={() => setView(target)} className="group flex w-full items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-4 text-left transition hover:border-sky-400/30 hover:bg-sky-400/5"><span className="rounded-xl bg-sky-400/10 p-2.5 text-sky-300"><Icon size={20} /></span><div className="min-w-0 flex-1"><p className="text-sm font-semibold">{title}</p><p className="mt-1 text-xs text-slate-400">{description}</p></div><ArrowUpRight size={17} className="text-slate-500 group-hover:text-sky-300" /></button>)}</div>
            </Panel>
          </section>
          <Panel title="Red de talleres" subtitle="Elegí un taller para abrir su configuración">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{tenants.slice(0,6).map((tenant) => <button key={tenant.id} onClick={() => openTenant(tenant)} className="group rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.05] to-transparent p-5 text-left transition hover:-translate-y-1 hover:border-sky-400/40"><div className="mb-4 flex items-center justify-between"><span className="rounded-xl bg-violet-400/10 p-3 text-violet-300"><Building2 size={22} /></span><StatusBadge status={tenant.status} /></div><h3 className="font-bold">{tenant.name}</h3><p className="mt-1 truncate text-xs text-slate-400">{tenant.ownerEmail || "Sin correo de titular"}</p><div className="mt-4 flex items-center justify-between border-t border-white/10 pt-3 text-sm"><span className="text-slate-300">{tenant.effectivePlanLabel} · ${tenant.effectiveMonthlyPrice.toLocaleString("es-AR")}/mes</span><ArrowUpRight size={18} className="text-sky-300" /></div></button>)}</div>
            {!loading && !tenants.length && <p className="text-sm text-slate-400">Todavía no hay talleres registrados.</p>}
            {tenants.length > 6 && <button onClick={() => setView("tenants")} className="mt-5 text-sm font-semibold text-sky-300">Ver los {tenants.length} talleres →</button>}
          </Panel>
        </>}

        {view === "finances" && <><section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <KpiCard label="Talleres activos" value={finances?.headline.activeTenants ?? 0} description={finances?.descriptions.activeTenants ?? ""} tone="sky" />
          <KpiCard label="Suspendidos" value={finances?.headline.suspendedTenants ?? 0} description={finances?.descriptions.suspendedTenants ?? ""} tone="rose" />
          <KpiCard label="Ingreso mensual (MRR)" value={`$${(finances?.headline.mrr ?? 0).toLocaleString("es-AR")}`} description={finances?.descriptions.mrr ?? ""} tone="amber" />
          <KpiCard label="Promedio por taller" value={`$${Math.round(finances?.headline.arpa ?? 0).toLocaleString("es-AR")}`} description={finances?.descriptions.arpa ?? ""} tone="violet" />
          <KpiCard label="Proyección anual" value={`$${(finances?.headline.projectedArr ?? 0).toLocaleString("es-AR")}`} description={finances?.descriptions.projectedArr ?? ""} tone="sky" />
          <KpiCard label="Ingreso / volumen" value={`${(finances?.headline.takeRate ?? 0).toFixed(1).replace(".", ",")}%`} description={finances?.descriptions.takeRate ?? ""} tone="emerald" />
          <KpiCard label="Volumen procesado" value={`$${(finances?.headline.processedVolume ?? 0).toLocaleString("es-AR")}`} description={finances?.descriptions.processedVolume ?? ""} tone="amber" />
          <KpiCard label="Planes personalizados" value={finances?.headline.customPlans ?? 0} description={finances?.descriptions.customPlans ?? ""} tone="violet" />
        </section></>}

        {view === "finances" && <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <AlertCard label="Vencen en 30 días" value={finances?.expiringSummary.dueIn30Days ?? 0} tone="amber" />
          <AlertCard label="Vencen en 15 días" value={finances?.expiringSummary.dueIn15Days ?? 0} tone="orange" />
          <AlertCard label="Vencen en 7 días" value={finances?.expiringSummary.dueIn7Days ?? 0} tone="rose" />
          <AlertCard label="MRR en riesgo" value={`$${(finances?.expiringSummary.atRiskMrr ?? 0).toLocaleString("es-AR")}`} tone="violet" />
        </section>}

        {view === "tenants" && <section className="grid items-start gap-6 xl:grid-cols-[1fr_1fr]">
          <Panel title="Directorio de talleres" subtitle={`${visibleTenants.length} de ${tenants.length} talleres · Seleccioná uno para editarlo`}>
            <div className="mb-5 space-y-3"><label className="relative block"><Search className="absolute left-3 top-4 text-slate-500" size={17} /><input aria-label="Buscar taller" placeholder="Nombre o correo del taller" value={tenantSearch} onChange={(event) => setTenantSearch(event.target.value)} className={`${inputClassName} pl-10`} /></label><select aria-label="Filtrar talleres" value={tenantStatusFilter} onChange={(event) => setTenantStatusFilter(event.target.value)} className={inputClassName}><option value="all">Todos los talleres</option><option value="active">Activos</option><option value="suspended">Suspendidos</option><option value="attention">Vencimientos próximos o vencidos</option></select></div>
            <div className="grid max-h-[720px] gap-4 overflow-y-auto pr-1">
              {visibleTenants.map((tenant) => (
                <button
                  key={tenant.id}
                  type="button"
                  onClick={() => hydrateTenant(tenant)}
                  aria-pressed={selectedTenant?.id === tenant.id}
                  className={`rounded-[1.4rem] border p-4 text-left transition ${
                    selectedTenant?.id === tenant.id ? "border-amber-400/35 bg-white/[0.06]" : "border-white/8 bg-white/[0.03]"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-lg font-bold text-white">{tenant.name}</p>
                      <p className="text-sm text-slate-400">{tenant.ownerEmail}</p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <StatusBadge status={tenant.status} />
                      <WarningBadge level={tenant.warningLevel} />
                    </div>
                  </div>
                  <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    <MiniMetric label="Plan" value={tenant.effectivePlanLabel} />
                    <MiniMetric label="Ciclo" value={billingLabel(tenant.billingCycle)} />
                    <MiniMetric label="Restan" value={remainingLabel(tenant.remainingDays)} />
                    <MiniMetric label="Precio" value={`$${tenant.effectiveMonthlyPrice.toLocaleString("es-AR")}`} />
                  </div>
                  <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-400">
                    <span>Vence {formatDate(tenant.planEndsAt)}</span>
                    <span>Renueva {formatDate(tenant.nextRenewalAt)}</span>
                  </div>
                </button>
              ))}
              {!visibleTenants.length && <p className="py-6 text-center text-sm text-slate-400">No hay talleres que coincidan con tu búsqueda.</p>}
            </div>
          </Panel>

          <Panel title="Configuración contractual" subtitle="Edición manual por taller">
            {selectedTenant ? (
              <form onSubmit={saveTenant} className="space-y-4">
                <ContractOverview tenant={selectedTenant} />
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Estado">
                    <select value={status} onChange={(event) => setStatus(event.target.value as TenantStatus)} className={inputClassName}>
                      <option value="active">Activo</option>
                      <option value="suspended">Suspendido</option>
                    </select>
                  </Field>
                  <Field label="Plan base del catálogo">
                    <select value={planOverride} onChange={(event) => setPlanOverride(event.target.value)} className={inputClassName}>
                      {plans.map((plan) => <option key={plan.code} value={plan.code}>{plan.name} ({plan.code})</option>)}
                    </select>
                  </Field>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Ciclo contratado">
                    <select value={billingCycle} onChange={(event) => setBillingCycle(event.target.value as BillingCycle)} className={inputClassName}>
                      <option value="monthly">Mensual</option>
                      <option value="semiannual">Semestral</option>
                      <option value="annual">Anual</option>
                    </select>
                  </Field>
                  <Input label="Precio mensual efectivo" type="number" value={effectiveMonthlyPrice} onChange={setEffectiveMonthlyPrice} />
                </div>
                <div className="grid gap-4 md:grid-cols-3">
                  <Input label="Inicio del plan" type="date" value={planStartAt} onChange={setPlanStartAt} />
                  <Input label="Vence el" type="date" value={planEndsAt} onChange={setPlanEndsAt} />
                  <Input label="Próxima renovación" type="date" value={nextRenewalAt} onChange={setNextRenewalAt} />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <Input label="Límite de usuarios" type="number" value={userLimit} onChange={setUserLimit} />
                  <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-sm font-semibold text-slate-200">
                    <input type="checkbox" checked={autoRenew} onChange={(event) => setAutoRenew(event.target.checked)} />
                    Renovación automática informativa
                  </label>
                </div>
                <Field label="Nota interna">
                  <textarea rows={4} value={moderationNote} onChange={(event) => setModerationNote(event.target.value)} className={inputClassName} />
                </Field>
                <button type="submit" disabled={savingTenant} className="w-full rounded-2xl bg-[linear-gradient(135deg,#f59e0b,#f97316)] py-3 font-bold text-slate-950 disabled:opacity-60">
                  {savingTenant ? "Guardando..." : "Guardar configuración contractual"}
                </button>
              </form>
            ) : (
              <p className="text-sm text-slate-400">Seleccioná un taller para editar su contrato.</p>
            )}
          </Panel>
        </section>}

        <div className="contents">
          {view === "plans" &&
          <Panel title="Catálogo de planes" subtitle="Base comercial de referencia">
            <form onSubmit={savePlan} className="space-y-4">
              <div className="space-y-3">
                {plans.map((plan) => (
                  <button key={plan.id} type="button" onClick={() => hydratePlan(plan)} className="w-full rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-left">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-bold text-white">{plan.name}</p>
                        <p className="text-xs text-slate-400">{plan.code}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-violet-200">${plan.monthlyPrice.toLocaleString("es-AR")}</p>
                        <p className="text-xs text-slate-400">{plan.maxUsers} usuarios</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
              <Input label="Código" value={planForm.code} onChange={(value) => setPlanForm((prev) => ({ ...prev, code: value.toLowerCase() }))} />
              <Input label="Nombre" value={planForm.name} onChange={(value) => setPlanForm((prev) => ({ ...prev, name: value }))} />
              <div className="grid gap-4 md:grid-cols-2">
                <Input label="Precio mensual" type="number" value={planForm.monthlyPrice} onChange={(value) => setPlanForm((prev) => ({ ...prev, monthlyPrice: value }))} />
                <Input label="Máx. usuarios" type="number" value={planForm.maxUsers} onChange={(value) => setPlanForm((prev) => ({ ...prev, maxUsers: value }))} />
              </div>
              <Input label="Máx. órdenes" type="number" value={planForm.maxWorkOrders} onChange={(value) => setPlanForm((prev) => ({ ...prev, maxWorkOrders: value }))} />
              <Field label="Funciones incluidas (separadas por comas)">
                <textarea rows={3} value={planForm.features} onChange={(event) => setPlanForm((prev) => ({ ...prev, features: event.target.value }))} className={inputClassName} />
              </Field>
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-300">
                <input type="checkbox" checked={planForm.active} onChange={(event) => setPlanForm((prev) => ({ ...prev, active: event.target.checked }))} />
                Plan activo
              </label>
              <button type="submit" disabled={savingPlan} className="w-full rounded-2xl bg-[linear-gradient(135deg,#8b5cf6,#3b82f6)] py-3 font-bold text-white disabled:opacity-60">
                {savingPlan ? "Guardando..." : "Crear o actualizar plan"}
              </button>
            </form>
          </Panel>}

          {view === "finances" && <div className="space-y-8">
            <div className="grid gap-8 lg:grid-cols-2">
              <ChartPanel title="Ingreso mensual por plan">
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={finances?.charts.byPlan ?? []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.12)" vertical={false} />
                    <XAxis dataKey="name" tick={{ fill: "#cbd5e1", fontSize: 12 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: "#cbd5e1", fontSize: 12 }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Legend />
                    <Bar dataKey="mrr" name="Ingreso mensual" radius={[8, 8, 0, 0]}>
                      {(finances?.charts.byPlan ?? []).map((entry) => <Cell key={entry.code} fill={entry.color} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </ChartPanel>

              <ChartPanel title="Distribución por ciclo">
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie data={finances?.charts.byCycle ?? []} dataKey="tenants" nameKey="name" innerRadius={55} outerRadius={88} paddingAngle={4}>
                      {(finances?.charts.byCycle ?? []).map((entry) => <Cell key={entry.cycle} fill={entry.color} />)}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </ChartPanel>
            </div>

            <ChartPanel title="Alertas de vencimiento">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={finances?.charts.expiringBuckets ?? []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.12)" vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: "#cbd5e1", fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "#cbd5e1", fontSize: 12 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="value" name="Talleres" radius={[8, 8, 0, 0]}>
                    {(finances?.charts.expiringBuckets ?? []).map((entry) => <Cell key={entry.name} fill={entry.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartPanel>
          </div>}
        </div>

        <div className="contents">
          {view === "requests" &&
          <Panel title="Solicitudes de plan" subtitle="Aprobación manual de contrataciones">
            {planRequestsSupported ? (
              <SimpleTable
                headers={["Taller", "Plan solicitado", "Estado", "Solicitado por", "Acciones"]}
                rows={planRequests.map((request) => [
                  <div key={`${request.id}-tenant`}>
                    <p className="font-semibold text-white">{request.tenantName}</p>
                    <p className="text-xs text-slate-400">{new Date(request.createdAt).toLocaleString("es-AR")}</p>
                  </div>,
                  <div key={`${request.id}-plan`} className="text-sm text-slate-200">
                    {request.requestedPlanCode.toUpperCase()} · {billingLabel(request.requestedBillingCycle)}
                  </div>,
                  <span key={`${request.id}-status`} className={`rounded-full border px-3 py-1 text-xs font-bold ${
                    request.status === "pending"
                      ? "border-amber-400/25 bg-amber-400/10 text-amber-200"
                      : request.status === "approved"
                        ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-200"
                        : "border-rose-400/25 bg-rose-400/10 text-rose-200"
                  }`}>
                    {request.status === "pending" ? "Pendiente" : request.status === "approved" ? "Aprobada" : "Rechazada"}
                  </span>,
                  <div key={`${request.id}-owner`} className="text-sm text-slate-300">
                    <p>{request.requestedByName}</p>
                    <p className="text-xs text-slate-400">{request.requestedByEmail}</p>
                  </div>,
                  <div key={`${request.id}-actions`} className="flex gap-2">
                    <button
                      type="button"
                      disabled={request.status !== "pending" || resolvingRequestId === request.id}
                      onClick={() => void resolvePlanRequest(request.id, "approve")}
                      className="rounded-lg border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-200 disabled:opacity-40"
                    >
                      Aprobar
                    </button>
                    <button
                      type="button"
                      disabled={request.status !== "pending" || resolvingRequestId === request.id}
                      onClick={() => void resolvePlanRequest(request.id, "reject")}
                      className="rounded-lg border border-rose-400/30 bg-rose-400/10 px-3 py-1 text-xs font-semibold text-rose-200 disabled:opacity-40"
                    >
                      Rechazar
                    </button>
                  </div>,
                ])}
                emptyText="No hay solicitudes pendientes por ahora."
              />
            ) : (
              <div className="rounded-xl border border-amber-400/25 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
                Este backend todavía no expone solicitudes de plan. Actualizalo y reiniciá el servicio para habilitar esta sección.
              </div>
            )}
          </Panel>}

          {view === "users" && <><button type="button" onClick={() => setShowCreateAdmin((value) => !value)} aria-expanded={showCreateAdmin} className="rounded-xl border border-violet-400/30 bg-violet-400/10 px-5 py-3 text-sm font-semibold text-violet-200">{showCreateAdmin ? "Cancelar alta de superadmin" : "+ Crear superadmin"}</button>{showCreateAdmin &&
          <Panel title="Crear superadmin" subtitle="Alta manual para equipo interno">
            <form onSubmit={createNewSuperadmin} className="space-y-4">
              <Input
                label="Nombre"
                value={superadminForm.name}
                onChange={(value) => setSuperadminForm((prev) => ({ ...prev, name: value }))}
              />
              <Input
                label="Correo"
                value={superadminForm.email}
                onChange={(value) => setSuperadminForm((prev) => ({ ...prev, email: value.toLowerCase() }))}
              />
              <Input
                label="Contraseña inicial"
                type="password"
                value={superadminForm.password}
                onChange={(value) => setSuperadminForm((prev) => ({ ...prev, password: value }))}
              />
              <Field label="Taller asociado">
                <select
                  value={superadminForm.tenantId}
                  onChange={(event) => setSuperadminForm((prev) => ({ ...prev, tenantId: event.target.value }))}
                  className={inputClassName}
                >
                  {tenants.map((tenant) => (
                    <option key={tenant.id} value={tenant.id}>
                      {tenant.name}
                    </option>
                  ))}
                </select>
              </Field>
              <button
                type="submit"
                disabled={creatingSuperadmin || !superadminForm.name || !superadminForm.email || superadminForm.password.length < 6}
                className="w-full rounded-2xl bg-[linear-gradient(135deg,#22d3ee,#3b82f6)] py-3 font-bold text-slate-950 disabled:opacity-60"
              >
                {creatingSuperadmin ? "Creando..." : "Crear superadmin"}
              </button>
            </form>
          </Panel>}</>}
        </div>

        {view === "users" && testAccounts.length > 0 &&
        <Panel title="Usuarios de prueba" subtitle="Sólo visible para superadmin">
          <SimpleTable
            headers={["Usuario", "Rol", "Ámbito", "Email", "Contraseña"]}
            rows={testAccounts.map((account) => [
              <div key={`${account.email}-name`}><p className="font-semibold text-white">{account.name}</p><p className="text-xs text-slate-400">{account.notes}</p></div>,
              <RolePill key={`${account.email}-role`} role={account.role} />,
              <span key={`${account.email}-scope`} className="text-sm text-slate-300">{account.scope}</span>,
              <span key={`${account.email}-email`} className="text-sm text-sky-200">{account.email}</span>,
              <code key={`${account.email}-password`} className="rounded-lg border border-amber-400/20 bg-amber-400/10 px-3 py-1 text-sm font-semibold text-amber-100">{account.password}</code>,
            ])}
            emptyText="No hay cuentas de prueba cargadas."
          />
        </Panel>}

        {view === "users" &&
        <Panel title="Usuarios globales" subtitle="Filtros rápidos de acceso y actividad">
          <div className="grid gap-3 md:grid-cols-3">
            <input aria-label="Buscar usuarios" type="text" value={userSearch} onChange={(event) => setUserSearch(event.target.value)} placeholder="Buscar usuario, email o taller" className={inputClassName} />
            <select aria-label="Filtrar usuarios por rol" value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)} className={inputClassName}>
              <option value="todos">Todos los roles</option>
              <option value="owner">Dueños</option>
              <option value="employee">Empleados</option>
              <option value="superadmin">Superadmins</option>
            </select>
            <select aria-label="Filtrar usuarios por taller" value={tenantFilter} onChange={(event) => setTenantFilter(event.target.value)} className={inputClassName}>
              <option value="todos">Todos los talleres</option>
              {tenants.map((tenant) => <option key={tenant.id} value={tenant.id}>{tenant.name}</option>)}
            </select>
          </div>
          <div className="mt-4">
            <SimpleTable
              headers={["Usuario", "Rol", "Taller", "Último acceso"]}
              rows={filteredUsers.map((entry) => [
                <div key={`${entry.id}-user`}><p className="font-semibold text-white">{entry.name}</p><p className="text-xs text-slate-400">{entry.email}</p></div>,
                <RolePill key={`${entry.id}-role`} role={entry.role} />,
                <span key={`${entry.id}-tenant`} className="text-sm text-slate-300">{entry.tenantName}</span>,
                <span key={`${entry.id}-last`} className="text-sm text-slate-400">{entry.lastSeenAt ? new Date(entry.lastSeenAt).toLocaleString("es-AR") : "Sin sesiones"}</span>,
              ])}
              emptyText="No hay usuarios que coincidan con los filtros actuales."
            />
          </div>
        </Panel>}
      </main>
    </div>
  );
}

function Panel({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <section className="overflow-hidden rounded-[2rem] border border-white/10 bg-slate-900/65 p-6 shadow-[0_24px_70px_rgba(2,6,23,0.28)] backdrop-blur">
      <div className="mb-5">
        <h2 className="text-xl font-bold text-white">{title}</h2>
        <p className="text-sm text-slate-400">{subtitle}</p>
      </div>
      {children}
    </section>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="block text-sm font-semibold text-slate-200">{label}{children}</label>;
}

function Input({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (value: string) => void; type?: string }) {
  return <label className="block text-sm font-semibold text-slate-200">{label}<input type={type} value={value} onChange={(event) => onChange(event.target.value)} className={inputClassName} /></label>;
}

function KpiCard({ label, value, description, tone }: { label: string; value: string | number; description: string; tone: "sky" | "rose" | "amber" | "violet" | "emerald" }) {
  const tones = { sky: "border-sky-400/18 bg-[linear-gradient(135deg,rgba(14,165,233,0.16),rgba(15,23,42,0.75))]", rose: "border-rose-400/18 bg-[linear-gradient(135deg,rgba(244,63,94,0.16),rgba(15,23,42,0.75))]", amber: "border-amber-400/18 bg-[linear-gradient(135deg,rgba(245,158,11,0.16),rgba(15,23,42,0.75))]", violet: "border-violet-400/18 bg-[linear-gradient(135deg,rgba(139,92,246,0.16),rgba(15,23,42,0.75))]", emerald: "border-emerald-400/18 bg-[linear-gradient(135deg,rgba(16,185,129,0.16),rgba(15,23,42,0.75))]" };
  return <div className={`rounded-[1.7rem] border p-5 ${tones[tone]}`}><p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-300/75">{label}</p><p className="mt-3 text-3xl font-extrabold text-white">{value}</p><p className="mt-3 text-sm text-slate-300/80">{description}</p></div>;
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-[1.2rem] border border-white/8 bg-white/[0.04] p-3"><p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">{label}</p><p className="mt-2 text-sm font-bold text-white">{value}</p></div>;
}

function StatusBadge({ status }: { status: string }) {
  const active = status === "active";
  return <span className={`rounded-full border px-3 py-1 text-xs font-bold ${active ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-200" : "border-rose-400/25 bg-rose-400/10 text-rose-200"}`}>{active ? "Activo" : "Suspendido"}</span>;
}

function WarningBadge({ level }: { level: SuperadminTenant["warningLevel"] }) {
  const map = { normal: "border-emerald-400/25 bg-emerald-400/10 text-emerald-200", "30d": "border-amber-400/25 bg-amber-400/10 text-amber-200", "15d": "border-orange-400/25 bg-orange-400/10 text-orange-200", "7d": "border-rose-400/25 bg-rose-400/10 text-rose-200", expired: "border-red-500/25 bg-red-500/10 text-red-200" } as const;
  const label = { normal: "En regla", "30d": "A 30 días", "15d": "A 15 días", "7d": "A 7 días", expired: "Vencido" } as const;
  return <span className={`rounded-full border px-3 py-1 text-xs font-bold ${map[level]}`}>{label[level]}</span>;
}

function RolePill({ role }: { role: string }) {
  const tones: Record<string, string> = { owner: "border-amber-400/25 bg-amber-400/10 text-amber-200", employee: "border-sky-400/25 bg-sky-400/10 text-sky-200", superadmin: "border-violet-400/25 bg-violet-400/10 text-violet-200", client: "border-emerald-400/25 bg-emerald-400/10 text-emerald-200" };
  return <span className={`whitespace-nowrap rounded-full border px-3 py-1 text-xs font-bold ${tones[role] ?? "border-white/10 bg-white/5 text-slate-200"}`}>{{owner:"Dueño",employee:"Empleado",superadmin:"Superadmin",client:"Cliente"}[role] ?? role}</span>;
}

function AlertCard({ label, value, tone }: { label: string; value: string | number; tone: "amber" | "orange" | "rose" | "violet" }) {
  const tones = { amber: "border-amber-400/20 bg-amber-400/10 text-amber-100", orange: "border-orange-400/20 bg-orange-400/10 text-orange-100", rose: "border-rose-400/20 bg-rose-400/10 text-rose-100", violet: "border-violet-400/20 bg-violet-400/10 text-violet-100" };
  return <div className={`rounded-[1.6rem] border p-5 ${tones[tone]}`}><p className="text-[11px] font-semibold uppercase tracking-[0.24em] opacity-75">{label}</p><p className="mt-3 text-3xl font-extrabold">{value}</p></div>;
}

function ChartPanel({ title, children }: { title: string; children: ReactNode }) {
  return <div className="rounded-[2rem] border border-white/10 bg-slate-900/65 p-6 shadow-[0_24px_70px_rgba(2,6,23,0.28)]"><h3 className="mb-5 text-lg font-bold text-white">{title}</h3>{children}</div>;
}

function ContractOverview({ tenant }: { tenant: SuperadminTenant }) {
  return (
    <div className="rounded-[1.6rem] border border-white/10 bg-slate-950/55 p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-lg font-bold text-white">{tenant.name}</p>
          <p className="text-sm text-slate-400">{tenant.ownerEmail}</p>
          <p className="mt-2 text-xs uppercase tracking-[0.18em] text-sky-300">{billingLabel(tenant.billingCycle)} · {tenant.effectivePlanLabel}</p>
        </div>
        <WarningBadge level={tenant.warningLevel} />
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <MiniMetric label="Vence el" value={formatDate(tenant.planEndsAt)} />
        <MiniMetric label="Próxima renovación" value={formatDate(tenant.nextRenewalAt)} />
        <MiniMetric label="Tiempo restante" value={remainingLabel(tenant.remainingDays)} />
      </div>
    </div>
  );
}

function SimpleTable({ headers, rows, emptyText }: { headers: string[]; rows: ReactNode[][]; emptyText: string }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left">
        <thead>
          <tr className="border-b border-white/10 text-xs uppercase tracking-[0.22em] text-slate-500">
            {headers.map((header) => <th key={header} className="px-4 py-3">{header}</th>)}
          </tr>
        </thead>
        <tbody className="divide-y divide-white/6">
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex} className="transition hover:bg-white/[0.03]">
              {row.map((cell, cellIndex) => <td key={cellIndex} className="px-4 py-4">{cell}</td>)}
            </tr>
          ))}
          {!rows.length ? <tr><td colSpan={headers.length} className="px-4 py-8 text-center text-sm text-slate-400">{emptyText}</td></tr> : null}
        </tbody>
      </table>
    </div>
  );
}

function toInputDate(value: string) {
  return value ? new Date(value).toISOString().slice(0, 10) : "";
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("es-AR");
}

function remainingLabel(days: number) {
  if (days < 0) return `Vencido hace ${Math.abs(days)} d`;
  if (days === 0) return "Vence hoy";
  return `${days} días`;
}

function billingLabel(cycle: BillingCycle) {
  if (cycle === "annual") return "Anual";
  if (cycle === "semiannual") return "Semestral";
  return "Mensual";
}
