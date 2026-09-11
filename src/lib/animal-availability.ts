const minAnimalAvailability = 0;
const maxAnimalAvailability = 100;
const defaultAnimalAvailability = 100;

function clampAnimalAvailability(value: number) {
  return Math.min(maxAnimalAvailability, Math.max(minAnimalAvailability, value));
}

function normalizeAnimalAvailability(value: number) {
  return Number.isFinite(value) ? clampAnimalAvailability(Math.round(value)) : defaultAnimalAvailability;
}

function parseAnimalAvailability(value: unknown) {
  if (typeof value === "number") {
    return Number.isInteger(value) ? normalizeAnimalAvailability(value) : null;
  }

  if (typeof value === "string" && value.trim()) {
    const parsedValue = Number.parseInt(value.trim(), 10);
    return Number.isInteger(parsedValue) ? normalizeAnimalAvailability(parsedValue) : null;
  }

  return null;
}

function formatAnimalAvailability(value: number) {
  return `${normalizeAnimalAvailability(value)}%`;
}

function isAnimalPubliclyAvailable(value: number) {
  return normalizeAnimalAvailability(value) > 0;
}

export {
  defaultAnimalAvailability,
  formatAnimalAvailability,
  isAnimalPubliclyAvailable,
  maxAnimalAvailability,
  minAnimalAvailability,
  normalizeAnimalAvailability,
  parseAnimalAvailability,
};
