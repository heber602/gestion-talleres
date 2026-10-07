export function workOrderStatusLabel(status: string) {
  return ({ pending: "Pendiente", estimating: "En diagnóstico", waiting_parts: "Esperando repuestos", repairing: "En reparación", finished: "Listo para entregar", cancelled: "Cancelado", delivered: "Entregado" } as Record<string, string>)[status] ?? status;
}
