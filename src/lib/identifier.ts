function normalizeIdentifier(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-|-$/g, "");
}

function buildUniqueIdentifier(value: string, existingIdentifiers: Iterable<string>, currentIdentifier?: string) {
  const normalized = normalizeIdentifier(value);

  if (!normalized) {
    return "";
  }

  const takenIdentifiers = new Set(
    Array.from(existingIdentifiers)
      .map((item) => item.trim().toLowerCase())
      .filter((item) => item && item !== currentIdentifier?.trim().toLowerCase()),
  );

  if (!takenIdentifiers.has(normalized)) {
    return normalized;
  }

  let suffix = 1;
  let nextIdentifier = `${normalized}-${suffix}`;

  while (takenIdentifiers.has(nextIdentifier)) {
    suffix += 1;
    nextIdentifier = `${normalized}-${suffix}`;
  }

  return nextIdentifier;
}

export { buildUniqueIdentifier, normalizeIdentifier };
