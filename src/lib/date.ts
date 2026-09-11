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

function getAgeFromBirthDate(value: Date, referenceDate = new Date()) {
  const referenceYear = referenceDate.getUTCFullYear();
  const referenceMonth = referenceDate.getUTCMonth();
  const referenceDay = referenceDate.getUTCDate();
  let years = referenceYear - value.getUTCFullYear();
  let months = referenceMonth - value.getUTCMonth();

  if (referenceDay < value.getUTCDate()) {
    months -= 1;
  }

  if (months < 0) {
    years -= 1;
    months += 12;
  }

  if (years < 0) {
    return {
      months: 0,
      years: 0,
    };
  }

  return {
    months: Math.max(months, 0),
    years,
  };
}

function formatMonthsLabel(months: number) {
  return months === 1 ? "1 mes" : `${months} meses`;
}

function formatYearsLabel(years: number) {
  return years === 1 ? "1 ano" : `${years} anos`;
}

function formatAgeFromBirthDate(value: Date, referenceDate = new Date()) {
  const age = getAgeFromBirthDate(value, referenceDate);

  if (age.years < 1) {
    return formatMonthsLabel(age.months);
  }

  return formatYearsLabel(age.years);
}

function formatDetailedAgeFromBirthDate(value: Date, referenceDate = new Date()) {
  const age = getAgeFromBirthDate(value, referenceDate);
  return `${formatYearsLabel(age.years)} e ${formatMonthsLabel(age.months)}`;
}

export { formatAgeFromBirthDate, formatDateInputValue, formatDateOnly, formatDetailedAgeFromBirthDate, parseDateInputValue };
