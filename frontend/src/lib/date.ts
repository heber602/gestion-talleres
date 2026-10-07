// Fechas de calendario (turnos/revisiones) no representan un instante UTC.
export function formatCalendarDate(value: string, locale = "es-AR") {
  const date = new Date(`${value.slice(0, 10)}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString(locale, { timeZone: "UTC" });
}
