const currencyNames = new Intl.DisplayNames(["ru"], { type: "currency" });
const amounts = new Intl.NumberFormat("ru");
const dates = new Intl.DateTimeFormat("ru", { dateStyle: "medium", timeStyle: "short" });

export function currencyLabel(code) {
  return /^[A-Z]{3}$/.test(code) ? `${code} · ${currencyNames.of(code)}` : code;
}

export function budgetLabel(amount, code) {
  return amount == null ? "Бюджет не указан" : [amounts.format(amount), code].filter(Boolean).join(" ");
}

export function dateLabel(value) {
  return value && Number.isFinite(Date.parse(value)) ? dates.format(new Date(value)) : "";
}
