import { redirect } from "next/navigation";
import { AdminDetailPanel } from "@/src/components/admin/detail-panel";
import { AdminQueryButton } from "@/src/components/admin/query-button";
import { CustomSection } from "@/src/components/custom-section";
import { LogoutButton } from "@/src/components/logout-button";
import {
  getAdminClasses,
  getAdminClassCapabilities,
  getAdminSession,
  getAnimalMediaByAnimalId,
  getDetailByClass,
  getFormStateByClass,
  getObjectsByClass,
  getVisibleAdminClasses,
  isAdminClassId,
} from "@/src/lib/admin";
import type { AdminPageProps } from "@/src/types";

function getParamValue(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function Page({ searchParams }: AdminPageProps) {
  const session = await getAdminSession();

  if (!session) {
    redirect("/admin/login");
  }

  const resolvedSearchParams = await searchParams;
  const adminClasses = await getAdminClasses();
  const visibleClasses = getVisibleAdminClasses(adminClasses, session.permissions);
  const requestedClassId = getParamValue(resolvedSearchParams.classId);
  const fallbackClassId = visibleClasses[0]?.identifier;
  const selectedClassId =
    requestedClassId && isAdminClassId(requestedClassId) && visibleClasses.some((item) => item.identifier === requestedClassId)
      ? requestedClassId
      : fallbackClassId;

  if (!selectedClassId) {
    return (
      <div className="flex h-[100dvh] flex-col gap-4 overflow-hidden bg-[#0d0c0b] p-4 text-[#ece6dd]">
        <div className="shrink-0 flex items-start justify-between gap-4 rounded-2xl border border-white/8 bg-[#151311] p-4 shadow-[0_24px_60px_-34px_rgba(0,0,0,0.82)]">
          <div>
            <h1 className="text-2xl font-bold">Admin</h1>
            <p className="text-sm text-[#b9afa2]">Sua conta foi autenticada, mas nao possui classes disponiveis para leitura.</p>
          </div>
          <LogoutButton />
        </div>
      </div>
    );
  }

  const requestedObjectId = getParamValue(resolvedSearchParams.objectId);
  const requestedMode = getParamValue(resolvedSearchParams.mode);
  const hasRequestedClass = Boolean(
    requestedClassId && isAdminClassId(requestedClassId) && visibleClasses.some((item) => item.identifier === requestedClassId),
  );
  const selectedClass = visibleClasses.find((item) => item.identifier === selectedClassId) ?? visibleClasses[0];

  if (!selectedClass) {
    redirect("/admin/login");
  }

  const capabilities = getAdminClassCapabilities(selectedClass, session.permissions);
  const objects = await getObjectsByClass(selectedClass.identifier);
  const selectedObjectId = objects.some((item) => item.identifier === requestedObjectId) ? requestedObjectId : undefined;
  const detail = selectedObjectId ? await getDetailByClass(selectedClass.identifier, selectedObjectId) : null;
  const animalMedia =
    selectedClass.identifier === "animals" && selectedObjectId ? await getAnimalMediaByAnimalId(selectedObjectId) : [];
  const canUseCreateMode = requestedMode === "create" && capabilities.canCreate;
  const canUseEditMode = requestedMode === "edit" && capabilities.canUpdate && Boolean(selectedObjectId);
  const formState = canUseCreateMode
    ? await getFormStateByClass(selectedClass.identifier, "create")
    : canUseEditMode && selectedObjectId
      ? await getFormStateByClass(selectedClass.identifier, "edit", selectedObjectId)
      : null;
  const showClassesOnMobile = !hasRequestedClass;
  const showObjectsOnMobile = hasRequestedClass && !selectedObjectId && !formState;
  const showDetailsOnMobile = hasRequestedClass && (Boolean(selectedObjectId) || Boolean(formState));
  const classesSection = (
    <CustomSection
      label="CLASSES"
      items={visibleClasses.map((item) => ({
        identifier: item.identifier,
        label: item.label,
        description: item.description,
      }))}
      queryKey="classId"
      selectedIdentifier={selectedClassId}
      clearKeys={["objectId", "mode"]}
      emptyMessage="Nenhuma classe disponivel."
      searchPlaceholder="Buscar classe..."
    />
  );
  const objectsSection = (
    <CustomSection
      label="OBJECTS"
      items={objects}
      queryKey="objectId"
      selectedIdentifier={selectedObjectId}
      clearKeys={["mode"]}
      emptyMessage={`Nenhum registro encontrado para ${selectedClass.label.toLowerCase()}.`}
      searchPlaceholder="Buscar objeto..."
      headerAction={
        capabilities.canCreate ? (
          <AdminQueryButton label="Novo" loadingLabel="Carregando formulario..." updates={{ mode: "create" }} clears={["objectId"]} />
        ) : undefined
      }
    />
  );
  const detailsSection = (
    <AdminDetailPanel
      animalMedia={animalMedia}
      classId={selectedClass.identifier}
      classLabel={selectedClass.label}
      objectId={selectedObjectId}
      detail={detail}
      formState={formState}
      capabilities={capabilities}
    />
  );

  return (
    <div className="flex h-[100dvh] flex-col gap-4 overflow-hidden bg-[#0d0c0b] p-4 text-[#ece6dd]">
      <div className="shrink-0 flex flex-col gap-4 rounded-2xl border border-white/8 bg-[#151311] p-4 shadow-[0_24px_60px_-34px_rgba(0,0,0,0.82)] sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Admin</h1>
          <p className="text-sm text-[#b9afa2]">Classes e acoes sao exibidas conforme as permissoes do usuario autenticado.</p>
        </div>
        <LogoutButton />
      </div>

      <div className="flex min-h-0 flex-1 flex-col lg:hidden">
        {showClassesOnMobile ? (
          <div className="flex min-h-0 flex-1 flex-col gap-3">
            <div className="shrink-0 rounded-2xl border border-white/8 bg-[#151311] p-4 shadow-[0_24px_60px_-34px_rgba(0,0,0,0.82)]">
              <p className="text-sm font-semibold uppercase tracking-wide text-[#8f8579]">Etapa 1</p>
              <h2 className="text-xl font-bold text-[#f3ede5]">Escolha uma classe</h2>
              <p className="mt-1 text-sm text-[#b9afa2]">Selecione a area que deseja administrar.</p>
            </div>
            {classesSection}
          </div>
        ) : null}

        {showObjectsOnMobile ? (
          <div className="flex min-h-0 flex-1 flex-col gap-3">
            <div className="shrink-0 flex flex-col gap-3 rounded-2xl border border-white/8 bg-[#151311] p-4 shadow-[0_24px_60px_-34px_rgba(0,0,0,0.82)] sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-[#8f8579]">Etapa 2</p>
                <h2 className="text-xl font-bold text-[#f3ede5]">{selectedClass.label}</h2>
                <p className="mt-1 text-sm text-[#b9afa2]">Escolha um objeto para abrir os detalhes.</p>
              </div>
              <AdminQueryButton label="Voltar" loadingLabel="Carregando classes..." clears={["classId", "objectId", "mode"]} variant="outline" />
            </div>
            {objectsSection}
          </div>
        ) : null}

        {showDetailsOnMobile ? (
          <div className="flex min-h-0 flex-1 flex-col gap-3">
            <div className="shrink-0 flex flex-col gap-3 rounded-2xl border border-white/8 bg-[#151311] p-4 shadow-[0_24px_60px_-34px_rgba(0,0,0,0.82)] sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-[#8f8579]">Etapa 3</p>
                <h2 className="text-xl font-bold text-[#f3ede5]">Detalhes de {selectedClass.label.toLowerCase()}</h2>
                <p className="mt-1 text-sm text-[#b9afa2]">Visualize, edite ou cadastre um novo registro nesta classe.</p>
              </div>
              <AdminQueryButton label="Voltar" loadingLabel="Carregando objetos..." clears={["objectId", "mode"]} variant="outline" />
            </div>
            {detailsSection}
          </div>
        ) : null}
      </div>

      <div className="hidden min-h-0 flex-1 gap-4 lg:flex">
        {classesSection}
        {objectsSection}
        {detailsSection}
      </div>
    </div>
  );
}
