"use client";
import { type FormEvent, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { fetchClients, fetchVehicleHistory, getStoredStaffToken, transferVehicle, type ClientRow, type VehicleHistoryResponse } from "@/lib/auth-api";
import { useAuth } from "@/context/AuthContext";
import { workOrderStatusLabel } from "@/lib/status";
import { formatCalendarDate } from "@/lib/date";

export default function VehicleHistoryPage() {
  const params = useParams<{ id: string }>();
  const { user } = useAuth();
  const [vehicle, setVehicle] = useState<VehicleHistoryResponse | null>(null);
  const [error, setError] = useState("");
  const [transferOpen, setTransferOpen] = useState(false);
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [clientsLoading, setClientsLoading] = useState(false);
  const [targetClientId, setTargetClientId] = useState("");
  const [transferNote, setTransferNote] = useState("");
  const [transferError, setTransferError] = useState("");
  const [transferring, setTransferring] = useState(false);
  const [success, setSuccess] = useState("");
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const token = getStoredStaffToken();
      if (!token || !params?.id) return;

      try {
        setError("");
        setVehicle(null);
        const nextVehicle = await fetchVehicleHistory(token, params.id);
        if (!cancelled) setVehicle(nextVehicle);
      } catch (loadError) {
        if (!cancelled) setError(loadError instanceof Error ? loadError.message : "No se pudo cargar el historial.");
      }
    };

    void load();
    return () => { cancelled = true; };
  }, [params?.id, refresh]);

  const openTransfer = async () => {
    const token = getStoredStaffToken();
    if (!token) return;
    setTransferOpen(true);
    setTargetClientId("");
    setTransferNote("");
    setTransferError("");
    setClientsLoading(true);
    try {
      setClients(await fetchClients(token));
    } catch (loadError) {
      setTransferError(loadError instanceof Error ? loadError.message : "No se pudieron cargar los clientes.");
    } finally {
      setClientsLoading(false);
    }
  };

  const handleTransfer = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const token = getStoredStaffToken();
    if (!token || !vehicle || !targetClientId || transferring) return;
    setTransferring(true);
    setTransferError("");
    try {
      const result = await transferVehicle(token, vehicle.id, {
        clientId: targetClientId, expectedClientId: vehicle.client.id,
        note: transferNote || undefined,
      });
      setSuccess(`Vehículo transferido a ${result.client.name}. Se conservó todo el historial de servicio.`);
      setTransferOpen(false);
      setRefresh((value) => value + 1);
    } catch (saveError) {
      setTransferError(saveError instanceof Error ? saveError.message : "No se pudo transferir el vehículo.");
    } finally {
      setTransferring(false);
    }
  };

  if (error) {
    return <div className="p-10 text-red-600"><p role="alert">{error}</p><button className="mt-4 rounded-xl border px-4 py-2" onClick={() => setRefresh((value) => value + 1)}>Reintentar</button></div>;
  }

  if (!vehicle) {
    return <div className="p-10 text-gray-500">Cargando historial...</div>;
  }

  const lastOrder = vehicle.workOrders[0];

  return (
    <div className="mx-auto max-w-5xl animate-in fade-in p-6 duration-500 md:p-10">
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-3">
            <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">
              {vehicle.brand} {vehicle.model}
            </h1>
            <span className="rounded-lg border border-gray-200 bg-gray-100 px-3 py-1 font-mono text-sm font-bold text-gray-700">
              {vehicle.plate}
            </span>
          </div>
          <p className="font-medium text-gray-500">
            Cliente: <span className="font-semibold text-blue-600">{vehicle.client.name}</span> • {vehicle.year ?? "s/d"}
          </p>
        </div>
        {user?.role === "owner" && <button type="button" onClick={() => void openTransfer()} className="rounded-xl border border-blue-200 bg-blue-50 px-5 py-2.5 font-semibold text-blue-700 transition hover:bg-blue-100">Transferir a otro cliente</button>}
      </div>

      {success && <p role="status" className="mb-6 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800">{success}</p>}

      {!!vehicle.ownershipTransfers?.length && (
        <section className="mb-8 rounded-2xl border border-gray-200 bg-white p-5">
          <h2 className="font-bold text-gray-900">Cambios de titular</h2>
          <ul className="mt-3 space-y-3">
            {vehicle.ownershipTransfers.map((transfer) => <li key={transfer.id} className="text-sm text-gray-600"><p className="font-semibold text-gray-800">{transfer.fromClientName} → {transfer.toClientName}</p><p>{new Date(transfer.createdAt).toLocaleString("es-AR")} · Registrado por {transfer.performedByName}</p>{transfer.note && <p className="mt-1">{transfer.note}</p>}{transfer.previousProfile && <details className="mt-2"><summary className="cursor-pointer font-medium text-blue-700">Ficha archivada del titular anterior</summary><div className="mt-2 rounded-xl bg-gray-50 p-3"><p>Alias: {transfer.previousProfile.alias || "Sin alias"}</p><p>Notas: {transfer.previousProfile.notes || "Sin notas"}</p><p>Seguro: {transfer.previousProfile.insuranceProvider || "Sin seguro"}</p><p>Póliza: {transfer.previousProfile.policyNumber || "Sin póliza"}</p></div></details>}</li>)}
          </ul>
        </section>
      )}

      {(lastOrder?.recommendedNextRevisionNote || lastOrder?.recommendedNextRevisionDate) && (
        <div className="mb-8 rounded-r-xl border-l-4 border-orange-500 bg-orange-50 p-4 shadow-sm">
          <h3 className="font-bold text-orange-900">Revision recomendada</h3>
          <p className="mt-1 text-sm text-orange-800">{lastOrder.recommendedNextRevisionNote}</p>
          {lastOrder.recommendedNextRevisionDate && <p className="mt-1 text-sm text-orange-800">Fecha: {formatCalendarDate(lastOrder.recommendedNextRevisionDate)}</p>}
        </div>
      )}

      <div className="mb-10 grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <p className="mb-1 text-sm font-medium text-gray-500">Total ordenes</p>
          <p className="text-2xl font-bold text-gray-900">{vehicle.workOrders.length}</p>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <p className="mb-1 text-sm font-medium text-gray-500">Ultima visita</p>
          <p className="text-lg font-bold text-gray-900">
            {lastOrder ? new Date(lastOrder.createdAt).toLocaleDateString("es-AR") : "Sin visitas"}
          </p>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <p className="mb-1 text-sm font-medium text-gray-500">Gasto historico</p>
          <p className="text-lg font-bold text-green-600">
            ${vehicle.workOrders.reduce((total, order) => total + order.totalCost, 0).toLocaleString("es-AR")}
          </p>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <p className="mb-1 text-sm font-medium text-gray-500">Estado actual</p>
          <span className="inline-block rounded-full border border-blue-100 bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700">
            {lastOrder ? workOrderStatusLabel(lastOrder.status) : "Sin orden"}
          </span>
        </div>
      </div>

      {transferOpen && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-gray-900/40 p-4 backdrop-blur-sm">
          <section role="dialog" aria-modal="true" aria-labelledby="transfer-title" className="max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
            <h2 id="transfer-title" className="text-xl font-bold text-gray-900">Transferir vehículo</h2>
            <p className="mt-2 text-sm text-gray-600">{vehicle.plate} · Titular actual: <strong>{vehicle.client.name}</strong></p>
            <p className="mt-3 text-sm text-gray-600">El nuevo cliente debe pertenecer a este taller. Se conservarán las órdenes, repuestos, revisiones y avances. El cliente anterior dejará de ver este vehículo en su portal.</p>
            <p className="mt-2 text-sm text-gray-500">La ficha personal del anterior titular (alias, notas y seguro) quedará archivada para el dueño del taller. El nuevo cliente tendrá su propia ficha; el color y todo el historial de servicio se conservan.</p>
            <form onSubmit={handleTransfer} className="mt-5 space-y-4">
              <label className="block text-sm font-semibold text-gray-700">Nuevo cliente titular
                <select required value={targetClientId} onChange={(event) => setTargetClientId(event.target.value)} disabled={clientsLoading || transferring} className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-3 py-3 text-gray-900">
                  <option value="">{clientsLoading ? "Cargando clientes…" : "Seleccionar cliente"}</option>
                  {clients.filter((client) => client.id !== vehicle.client.id).map((client) => <option key={client.id} value={client.id}>{client.name}{client.email ? ` · ${client.email}` : client.phone ? ` · ${client.phone}` : ""}</option>)}
                </select>
              </label>
              {!clientsLoading && !transferError && clients.filter((client) => client.id !== vehicle.client.id).length === 0 && <p className="text-sm text-amber-700">Todavía no hay otro cliente registrado en este taller.</p>}
              <label className="block text-sm font-semibold text-gray-700">Motivo o nota (opcional)
                <textarea maxLength={1000} value={transferNote} onChange={(event) => setTransferNote(event.target.value)} disabled={transferring} placeholder="Por ejemplo: venta del vehículo" rows={3} className="mt-2 w-full rounded-xl border border-gray-300 px-3 py-2 text-gray-900" />
              </label>
              {transferError && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{transferError}</p>}
              <div className="flex gap-3">
                <button type="button" disabled={transferring} onClick={() => setTransferOpen(false)} className="flex-1 rounded-xl border border-gray-300 px-4 py-3 font-semibold text-gray-700">Cancelar</button>
                <button type="submit" disabled={!targetClientId || clientsLoading || transferring} className="flex-1 rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white disabled:opacity-50">{transferring ? "Transfiriendo…" : "Confirmar transferencia"}</button>
              </div>
            </form>
          </section>
        </div>
      )}

      <h2 className="mb-6 text-xl font-bold text-gray-900">Historial de servicio</h2>
      <div className="space-y-6">
        {vehicle.workOrders.map((order) => (
          <div key={order.id} className="card-hover relative overflow-hidden rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <div className="absolute left-0 top-0 h-full w-1 bg-blue-500" />
            <div className="mb-4 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Orden #{order.id.slice(0, 8)}</h3>
                <p className="text-sm text-gray-500">
                  {new Date(order.createdAt).toLocaleDateString("es-AR")} • Mecanico: {order.mechanic?.name ?? "Sin asignar"}
                </p>
              </div>
              <div className="text-right">
                <span className="mb-2 inline-block rounded-full border border-orange-100 bg-orange-50 px-3 py-1 text-xs font-medium text-orange-600">
                  {workOrderStatusLabel(order.status)}
                </span>
                <p className="font-bold text-gray-900">${order.totalCost.toLocaleString("es-AR")}</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-xl bg-gray-50 p-4 text-sm text-gray-700">
                <span className="mb-1 block font-semibold text-gray-900">Diagnostico</span>
                {order.diagnostic ?? "Sin diagnostico registrado."}
              </div>

              {!!order.parts.length && (
                <div className="rounded-xl border border-gray-200 bg-white p-4 text-sm shadow-sm">
                  <span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-gray-500">Repuestos</span>
                  <div className="space-y-2">
                    {order.parts.map((part, index) => (
                      <div key={`${order.id}-${index}`} className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                        <span className="font-medium text-gray-700">{part.item.name}</span>
                        <span className="text-xs text-gray-500">
                          Cantidad {part.quantity} • Cobrado ${part.unitPrice.toLocaleString("es-AR")}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {!!order.updates.length && (
                <div className="space-y-3">
                  <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Actualizaciones al cliente</span>
                  {order.updates.map((update) => (
                    <div key={update.id} className="rounded-xl border border-blue-100 bg-blue-50 p-4">
                      <div className="mb-1 flex items-center justify-between gap-3">
                        <h4 className="font-semibold text-blue-900">{update.title}</h4>
                        <span className="text-xs text-blue-700">
                          {new Date(update.createdAt).toLocaleDateString("es-AR")}
                        </span>
                      </div>
                      <p className="text-sm text-blue-900">{update.message}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
