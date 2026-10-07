"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useI18n } from "@/context/I18nContext";
import { formatCalendarDate } from "@/lib/date";
import {
  fetchDashboardSummary,
  fetchOwnerAccountStatus,
  getStoredStaffToken,
  type DashboardResponse,
  type OwnerAccountStatus,
} from "@/lib/auth-api";

export default function Home() {
  const router = useRouter();
  const { user } = useAuth();
  const { t } = useI18n();
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [accountStatus, setAccountStatus] = useState<OwnerAccountStatus | null>(null);
  const [error, setError] = useState("");
  const firstName = user?.name.split(" ")[0] ?? "equipo";

  useEffect(() => {
    const load = async () => {
      const token = getStoredStaffToken();
      if (!token) return;

      try {
        setError("");
        if (user?.role === "owner") {
          const [dashboard, ownerStatus] = await Promise.all([
            fetchDashboardSummary(token),
            fetchOwnerAccountStatus(token),
          ]);
          setData(dashboard);
          setAccountStatus(ownerStatus);
        } else {
          const dashboard = await fetchDashboardSummary(token);
          setData(dashboard);
          setAccountStatus(null);
        }
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "No se pudo cargar el tablero.");
      }
    };

    void load();
  }, [user?.role]);

  const stats = data?.stats ?? {
    appointmentsToday: 0,
    vehiclesInWorkshop: 0,
    activeOrders: 0,
  };

  const summaryText = useMemo(() => {
    if (error) return "No se pudo cargar la agenda.";
    if (!data) return t("common", "loading");
    if (!data?.recentAppointments.length) {
      return t("dashboard", "noShiftsToday");
    }
    return `${data.recentAppointments.length} ${t("dashboard", "recentMovements")}`;
  }, [data, error, t]);

  return (
    <div className="mx-auto max-w-7xl p-4 pb-24 sm:p-6 md:p-8 md:pb-8">
      <header className="mb-6 overflow-hidden rounded-2xl border border-white/15 bg-[linear-gradient(145deg,#2400A2_0%,#190B47_70%)] p-5 shadow-[0_18px_40px_rgba(7,3,24,0.35)] sm:p-7">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#8A8A80]">{t("dashboard", "operationLabel")}</p>
        <h1 className="mt-2 text-2xl font-extrabold text-white sm:text-3xl">
          {t("dashboard", "welcome")}, <span className="text-[#FFE707]">{firstName}</span>
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/85 sm:text-base">
          {t("dashboard", "headerDescription")}
        </p>
        <div className="mt-4 rounded-xl border border-[#474211]/60 bg-[#474211]/20 px-4 py-3 text-sm text-white/90">
          {summaryText}
        </div>
      </header>

      {error ? (
        <div role="alert" className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {user?.role === "owner" && accountStatus?.pendingPlanRequest ? (
        <div className="mb-6 flex flex-col gap-3 rounded-xl border border-sky-300/30 bg-sky-50 px-4 py-3 text-sm text-sky-900 sm:flex-row sm:items-center sm:justify-between">
          <p>
            {t("dashboard", "reviewMessageStart")}{" "}
            <strong>{accountStatus.pendingPlanRequest.requestedPlanCode.toUpperCase()}</strong>{" "}
            {t("dashboard", "reviewMessageEnd")}
          </p>
          <button
            type="button"
            onClick={() => router.push("/cuenta")}
            className="rounded-lg border border-sky-500/30 bg-white px-3 py-1.5 font-semibold text-sky-700 transition hover:bg-sky-100"
          >
            {t("dashboard", "accountStatus")}
          </button>
        </div>
      ) : null}

      <section className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard label={t("dashboard", "shiftsToday")} value={data ? stats.appointmentsToday : "—"} accent={t("dashboard", "agenda")} />
        <StatCard label={t("dashboard", "vehiclesInShop")} value={data ? stats.vehiclesInWorkshop : "—"} accent={t("dashboard", "inProcess")} />
        <StatCard label={t("dashboard", "activeOrders")} value={data ? stats.activeOrders : "—"} accent={t("dashboard", "tracking")} />
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <section className="rounded-2xl border border-white/12 bg-[#2400A2]/80 shadow-[0_18px_38px_rgba(7,3,24,0.26)]">
          <div className="flex items-center justify-between border-b border-white/10 p-4 sm:p-5">
            <div>
              <h2 className="text-lg font-bold text-white">{t("dashboard", "upcomingShifts")}</h2>
              <p className="text-sm text-[#8A8A80]">{t("dashboard", "latestMovements")}</p>
            </div>
            <button
              onClick={() => router.push("/turnos")}
              className="rounded-lg bg-[#FFE707] px-3 py-2 text-sm font-semibold text-[#190B47] transition hover:brightness-95"
            >
              {t("dashboard", "viewShifts")}
            </button>
          </div>

          <div className="divide-y divide-white/10">
            {(data?.recentAppointments ?? []).map((appointment) => (
              <article key={appointment.id} className="p-4 sm:p-5">
                <h3 className="font-semibold text-white">
                  {appointment.vehicleLabel} · {appointment.plate}
                </h3>
                <p className="mt-1 text-sm text-white/80">
                  {formatCalendarDate(appointment.date)} · {appointment.time} · {appointment.reason}
                </p>
                <span className="mt-3 inline-flex rounded-full border border-[#8A8A80]/45 bg-[#190B47]/50 px-3 py-1 text-xs font-semibold text-white">
                  {appointment.status === "pending" ? "Pendiente" : appointment.status}
                </span>
              </article>
            ))}
            {data && !data.recentAppointments.length ? (
              <div className="p-4 text-sm text-[#8A8A80] sm:p-5">{t("dashboard", "noShiftsLoaded")}</div>
            ) : null}
          </div>
        </section>

        <section className="rounded-2xl border border-white/12 bg-[#2400A2]/80 p-4 shadow-[0_18px_38px_rgba(7,3,24,0.26)] sm:p-5">
          <h2 className="text-lg font-bold text-white">{t("dashboard", "quickActions")}</h2>
          <p className="mt-2 text-sm text-[#8A8A80]">{t("dashboard", "quickActionsHint")}</p>
          <div className="mt-4 space-y-3">
            <ActionButton
              label={t("dashboard", "registerEntry")}
              hint={t("dashboard", "registerEntryHint")}
              onClick={() => router.push("/clientes")}
            />
            <ActionButton
              label={t("dashboard", "manageOrders")}
              hint={t("dashboard", "manageOrdersHint")}
              onClick={() => router.push("/ordenes")}
            />
            <ActionButton
              label={t("dashboard", "customerPortal")}
              hint={t("dashboard", "customerPortalHint")}
              onClick={() => router.push("/portal")}
            />
            {user?.role === "owner" ? (
              <ActionButton
                label={t("dashboard", "accountOverview")}
                hint={t("dashboard", "accountOverviewHint")}
                onClick={() => router.push("/cuenta")}
              />
            ) : null}
          </div>
        </section>
      </div>
    </div>
  );
}

function StatCard({ label, value, accent }: { label: string; value: number | string; accent: string }) {
  return (
    <div className="rounded-xl border border-white/12 bg-[#2400A2]/80 p-4 shadow-[0_12px_30px_rgba(7,3,24,0.20)] sm:p-5">
      <p className="text-sm font-medium text-[#8A8A80]">{label}</p>
      <div className="mt-3 flex items-end justify-between gap-3">
        <p className="text-3xl font-extrabold text-white">{value}</p>
        <span className="rounded-full bg-[#FFE707] px-3 py-1 text-xs font-semibold text-[#190B47]">{accent}</span>
      </div>
    </div>
  );
}

function ActionButton({
  label,
  hint,
  onClick,
}: {
  label: string;
  hint: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full rounded-xl border border-white/12 bg-[#190B47]/65 p-4 text-left transition hover:border-[#FFE707]/55 hover:bg-[#190B47]"
    >
      <p className="font-semibold text-white">{label}</p>
      <p className="mt-1 text-sm text-[#8A8A80]">{hint}</p>
    </button>
  );
}
