const defaultWhatsappNumber = "553397087753";
const defaultWhatsappDisplayPhone = "(33) 99708-7753";

function getWhatsappNumber() {
  return (process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? defaultWhatsappNumber).replace(/\D/g, "");
}

function getWhatsappDisplayPhone() {
  return process.env.NEXT_PUBLIC_WHATSAPP_DISPLAY_PHONE ?? defaultWhatsappDisplayPhone;
}

function createWhatsappUrl(message: string) {
  return `https://wa.me/${getWhatsappNumber()}?text=${encodeURIComponent(message)}`;
}

function createDefaultWhatsappMessage() {
  return "Olá, gostaria de saber mais sobre o Elite da Raça.";
}

function createAnimalWhatsappMessage(animalName: string, animalIdentifier?: string) {
  const normalizedName = animalName.trim();
  const normalizedIdentifier = animalIdentifier?.trim();

  return normalizedIdentifier
    ? `Olá, gostaria de falar sobre o animal ${normalizedName} (${normalizedIdentifier}).`
    : `Olá, gostaria de falar sobre o animal ${normalizedName}.`;
}

function getAnimalReferenceFromPath(pathname: string) {
  const segments = pathname.split("/").filter(Boolean);

  if (segments[0] !== "animal" || !segments[1]) {
    return null;
  }

  const formattedIdentifier = decodeURIComponent(segments[1])
    .split("-")
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");

  return formattedIdentifier || null;
}

export { createAnimalWhatsappMessage, createDefaultWhatsappMessage, createWhatsappUrl, getAnimalReferenceFromPath, getWhatsappDisplayPhone };
