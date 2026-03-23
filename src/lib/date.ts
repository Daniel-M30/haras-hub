function formatDateOnly(value: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "UTC",
  }).format(value);
}

function formatDateInputValue(value: Date) {
  const year = value.getUTCFullYear();
  const month = String(value.getUTCMonth() + 1).padStart(2, "0");
  const day = String(value.getUTCDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function parseDateInputValue(value: string) {
  const normalized = value.trim();

  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    return null;
  }

  const parsed = new Date(`${normalized}T00:00:00.000Z`);

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed;
}

function formatAgeFromBirthDate(value: Date, referenceDate = new Date()) {
  const referenceYear = referenceDate.getUTCFullYear();
  const referenceMonth = referenceDate.getUTCMonth();
  const referenceDay = referenceDate.getUTCDate();
  let age = referenceYear - value.getUTCFullYear();

  if (
    referenceMonth < value.getUTCMonth() ||
    (referenceMonth === value.getUTCMonth() && referenceDay < value.getUTCDate())
  ) {
    age -= 1;
  }

  const normalizedAge = Math.max(age, 0);

  return normalizedAge === 1 ? "1 ano" : `${normalizedAge} anos`;
}

export { formatAgeFromBirthDate, formatDateInputValue, formatDateOnly, parseDateInputValue };
