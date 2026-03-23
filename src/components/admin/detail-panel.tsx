"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useState } from "react";
import { Availability, CharacteristicDataType } from "@/src/generated/prisma/enums";
import { apiDelete, apiPatch, apiPost } from "@/src/lib/api-client";
import { adminPermissionScopeOptions, requiredPermissionScopes } from "@/src/lib/admin-types";
import type { AdminClassId, AdminDetailPanelProps, AdminFormState } from "@/src/types";
import { AnimalMediaManager } from "./animal-media-manager";
import { AdminDetailView } from "./detail-view";
import { AdminQueryButton } from "./query-button";
import { Button } from "@/src/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/src/components/ui/field";
import { Input } from "@/src/components/ui/input";
import { LoadingState } from "@/src/components/loading-state";
import { Separator } from "@/src/components/ui/separator";

const selectClassName =
  "h-10 w-full rounded-md border border-white/10 bg-[#1f1a17] px-3 text-sm text-[#ece6dd] outline-none transition focus-visible:ring-2 focus-visible:ring-[#b8aea4]/40";
const textareaClassName =
  "min-h-28 w-full rounded-md border border-white/10 bg-[#1f1a17] px-3 py-2 text-sm text-[#ece6dd] outline-none transition focus-visible:ring-2 focus-visible:ring-[#b8aea4]/40";

function getCheckedValues(formData: FormData, fieldName: string) {
  return formData
    .getAll(fieldName)
    .map((value) => value.toString())
    .filter(Boolean);
}

function buildPayload(formData: FormData, formState: AdminFormState) {
  switch (formState.classId) {
    case "users":
      return {
        email: formData.get("email")?.toString() ?? "",
        groupIds: getCheckedValues(formData, "groupIds"),
        name: formData.get("name")?.toString() ?? "",
        password: formData.get("password")?.toString() ?? "",
      };
    case "groups":
      return {
        identifier: formData.get("identifier")?.toString() ?? "",
        name: formData.get("name")?.toString() ?? "",
        roleIds: getCheckedValues(formData, "roleIds"),
      };
    case "roles":
      return {
        name: formData.get("name")?.toString() ?? "",
        permissionKeys: getCheckedValues(formData, "permissionKeys"),
      };
    case "characteristics":
      return {
        dataType: formData.get("dataType")?.toString() ?? CharacteristicDataType.text,
        isFilterable: formData.get("isFilterable") === "on",
        key: formData.get("key")?.toString() ?? "",
        label: formData.get("label")?.toString() ?? "",
        optionsText: formData.get("optionsText")?.toString() ?? "",
      };
    case "animalTypes":
      return {
        characteristics: formState.characteristics.map((item) => ({
          characteristicId: item.characteristicId,
          displayOrder: formData.get(`characteristic.${item.characteristicId}.displayOrder`)?.toString() ?? "",
          required: formData.get(`characteristic.${item.characteristicId}.required`) === "on",
          showInCard: formData.get(`characteristic.${item.characteristicId}.showInCard`) === "on",
          selected: formData.get(`characteristic.${item.characteristicId}.selected`) === "on",
        })),
        name: formData.get("name")?.toString() ?? "",
      };
    case "animals": {
      const animalTypeId = formData.get("animalTypeId")?.toString() ?? "";
      const selectedAnimalType = formState.animalTypes.find((item) => item.value === animalTypeId);

      return {
        animalTypeId,
        availability: formData.get("availability")?.toString() ?? Availability.available,
        characteristicValues: Object.fromEntries(
          (selectedAnimalType?.characteristics ?? []).map((characteristic) => [
            characteristic.characteristicId,
            {
              boolean: formData.get(`characteristic.${characteristic.characteristicId}.boolean`) === "on",
              date: formData.get(`characteristic.${characteristic.characteristicId}.date`)?.toString() ?? "",
              number: formData.get(`characteristic.${characteristic.characteristicId}.number`)?.toString() ?? "",
              optionId: formData.get(`characteristic.${characteristic.characteristicId}.optionId`)?.toString() ?? "",
              text: formData.get(`characteristic.${characteristic.characteristicId}.text`)?.toString() ?? "",
            },
          ]),
        ),
        description: formData.get("description")?.toString() ?? "",
        identifier: formData.get("identifier")?.toString() ?? "",
        name: formData.get("name")?.toString() ?? "",
      };
    }
    case "carouselEntries":
      return {
        animalId: formData.get("animalId")?.toString() ?? "",
        animalMediaId: formData.get("animalMediaId")?.toString() ?? "",
        description: formData.get("description")?.toString() ?? "",
        displayOrder: formData.get("displayOrder")?.toString() ?? "",
      };
    case "adminClasses":
      return {
        allowCreate: formData.get("allowCreate") === "on",
        allowDelete: formData.get("allowDelete") === "on",
        createPermissions: getCheckedValues(formData, "createPermissions"),
        deletePermissions: getCheckedValues(formData, "deletePermissions"),
        description: formData.get("description")?.toString() ?? "",
        identifier: formData.get("identifier")?.toString() ?? "",
        label: formData.get("label")?.toString() ?? "",
        readPermissions: getCheckedValues(formData, "readPermissions"),
        updatePermissions: getCheckedValues(formData, "updatePermissions"),
      };
  }
}

function OptionChecklist({
  fieldName,
  options,
  selectedValues,
  lockedValues = [],
}: {
  fieldName: string;
  options: Array<{ value: string; label: string; description?: string }>;
  selectedValues: string[];
  lockedValues?: string[];
}) {
  return (
    <div className="grid gap-2 md:grid-cols-2">
      {options.map((option) => (
        <label
          key={option.value}
          className={`flex items-start gap-3 rounded-lg border p-3 text-sm ${
            lockedValues.includes(option.value) ? "border-[#6f665c] bg-[#2a241f]" : "border-white/8 bg-white/4"
          }`}
        >
          {lockedValues.includes(option.value) ? <input type="hidden" name={fieldName} value={option.value} /> : null}
          <input
            type="checkbox"
            name={fieldName}
            value={option.value}
            defaultChecked={selectedValues.includes(option.value)}
            className="mt-1"
            disabled={lockedValues.includes(option.value)}
          />
          <span className="space-y-1">
            <span className="block font-medium text-[#f3ede5]">
              {option.label}
              {lockedValues.includes(option.value) ? " (obrigatoria)" : ""}
            </span>
            {option.description ? <span className="block text-[#8f8579]">{option.description}</span> : null}
          </span>
        </label>
      ))}
    </div>
  );
}

function AdminObjectForm({ classId, formState, objectId }: { classId: AdminClassId; formState: AdminFormState; objectId?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedAnimalTypeId, setSelectedAnimalTypeId] = useState(formState.classId === "animals" ? formState.values.animalTypeId : "");
  const [selectedCarouselAnimalId, setSelectedCarouselAnimalId] = useState(formState.classId === "carouselEntries" ? formState.values.animalId : "");
  const [selectedCarouselMediaId, setSelectedCarouselMediaId] = useState(
    formState.classId === "carouselEntries" ? formState.values.animalMediaId : "",
  );
  const [selectedCharacteristics, setSelectedCharacteristics] = useState(
    formState.classId === "animalTypes" ? Object.fromEntries(formState.characteristics.map((item) => [item.characteristicId, item.selected])) : {},
  );

  const selectedAnimalType =
    formState.classId === "animals" ? (formState.animalTypes.find((item) => item.value === selectedAnimalTypeId) ?? null) : null;
  const selectedCarouselMediaOptions =
    formState.classId === "carouselEntries" ? (formState.mediaOptionsByAnimalId[selectedCarouselAnimalId] ?? []) : [];

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const formData = new FormData(event.currentTarget);
      const payload = buildPayload(formData, formState);
      const isEditMode = formState.mode === "edit" && objectId;
      const { data, error } =
        isEditMode && objectId
          ? await apiPatch<{ id: string }>(`/api/admin/${classId}/${objectId}`, payload)
          : await apiPost<{ id: string }>(`/api/admin/${classId}`, payload);

      if (error || !data) {
        setError(error ?? "Nao foi possivel salvar o registro.");
        return;
      }

      const params = new URLSearchParams(searchParams.toString());
      params.set("classId", classId);
      params.set("objectId", data.id);
      params.delete("mode");
      router.replace(`${pathname}?${params.toString()}`);
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <div>
        <h4 className="text-xl font-semibold text-[#f3ede5]">{formState.title}</h4>
        <p className="mt-1 text-sm text-[#8f8579]">{formState.description}</p>
      </div>

      <FieldGroup>
        {formState.classId === "users" ? (
          <>
            <Field>
              <FieldLabel htmlFor="admin-user-name">Nome</FieldLabel>
              <Input id="admin-user-name" name="name" defaultValue={formState.values.name} placeholder="Nome do usuario" />
            </Field>
            <Field>
              <FieldLabel htmlFor="admin-user-email">Email</FieldLabel>
              <Input
                id="admin-user-email"
                name="email"
                type="email"
                required
                defaultValue={formState.values.email}
                placeholder="usuario@dominio.com"
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="admin-user-password">{formState.mode === "create" ? "Senha" : "Nova senha"}</FieldLabel>
              <Input
                id="admin-user-password"
                name="password"
                type="password"
                required={formState.mode === "create"}
                placeholder={formState.mode === "create" ? "Senha inicial" : "Preencha apenas para alterar"}
              />
            </Field>
            <Field>
              <FieldLabel>Grupos</FieldLabel>
              <OptionChecklist fieldName="groupIds" options={formState.groupOptions} selectedValues={formState.values.groupIds} />
            </Field>
          </>
        ) : null}

        {formState.classId === "groups" ? (
          <>
            <Field>
              <FieldLabel htmlFor="admin-group-name">Nome</FieldLabel>
              <Input id="admin-group-name" name="name" required defaultValue={formState.values.name} />
            </Field>
            <Field>
              <FieldLabel htmlFor="admin-group-identifier">Identificador</FieldLabel>
              <Input id="admin-group-identifier" name="identifier" required defaultValue={formState.values.identifier} />
            </Field>
            <Field>
              <FieldLabel>Papeis vinculados</FieldLabel>
              <OptionChecklist fieldName="roleIds" options={formState.roleOptions} selectedValues={formState.values.roleIds} />
            </Field>
          </>
        ) : null}

        {formState.classId === "roles" ? (
          <>
            <Field>
              <FieldLabel htmlFor="admin-role-name">Nome</FieldLabel>
              <Input id="admin-role-name" name="name" required defaultValue={formState.values.name} />
            </Field>
            <Field>
              <FieldLabel>Permissoes</FieldLabel>
              <OptionChecklist fieldName="permissionKeys" options={formState.permissionOptions} selectedValues={formState.values.permissionKeys} />
            </Field>
          </>
        ) : null}

        {formState.classId === "animalTypes" ? (
          <>
            <Field>
              <FieldLabel htmlFor="admin-animal-type-name">Nome</FieldLabel>
              <Input id="admin-animal-type-name" name="name" required defaultValue={formState.values.name} />
            </Field>
            <Field>
              <FieldLabel>Caracteristicas</FieldLabel>
              <div className="space-y-3">
                {formState.characteristics.map((item) => {
                  const isSelected = Boolean(selectedCharacteristics[item.characteristicId]);

                  return (
                    <div key={item.characteristicId} className="rounded-lg border border-white/8 bg-[#1b1714] p-4">
                      <div className="grid gap-3 md:grid-cols-[minmax(0,1.4fr)_minmax(0,0.8fr)_140px_140px_180px]">
                        <label className="flex items-start gap-3">
                          <input
                            type="checkbox"
                            name={`characteristic.${item.characteristicId}.selected`}
                            defaultChecked={item.selected}
                            className="mt-1"
                            onChange={(event) =>
                              setSelectedCharacteristics((current) => ({
                                ...current,
                                [item.characteristicId]: event.target.checked,
                              }))
                            }
                          />
                          <span className="space-y-1">
                            <span className="block font-medium text-[#f3ede5]">{item.label}</span>
                            <span className="block text-sm text-[#8f8579]">
                              Chave: {item.key} - {item.optionCount} opcoes cadastradas
                            </span>
                          </span>
                        </label>
                        <div className="space-y-1">
                          <label className="text-xs font-semibold uppercase tracking-wide text-[#8f8579]">Tipo</label>
                          <div
                            className={`flex h-10 items-center rounded-md border border-white/10 px-3 text-sm ${!isSelected ? "bg-[#1f1a17] text-[#6f665c]" : "bg-[#1f1a17] text-[#ece6dd]"}`}
                          >
                            {item.dataType === CharacteristicDataType.text
                              ? "Texto"
                              : item.dataType === CharacteristicDataType.number
                                ? "Numero"
                                : item.dataType === CharacteristicDataType.date
                                  ? "Data"
                                  : item.dataType === CharacteristicDataType.boolean
                                    ? "Booleano"
                                    : "Selecao"}
                          </div>
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-semibold uppercase tracking-wide text-[#8f8579]">Ordem</label>
                          <Input
                            name={`characteristic.${item.characteristicId}.displayOrder`}
                            type="number"
                            min={1}
                            defaultValue={item.displayOrder}
                            disabled={!isSelected}
                          />
                        </div>
                        <label className="flex items-center gap-2 rounded-lg border border-white/10 bg-[#1f1a17] px-3 py-2 text-sm text-[#ece6dd]">
                          <input
                            type="checkbox"
                            name={`characteristic.${item.characteristicId}.required`}
                            defaultChecked={item.required}
                            disabled={!isSelected}
                          />
                          Obrigatorio
                        </label>
                        <label className="flex items-center gap-2 rounded-lg border border-white/10 bg-[#1f1a17] px-3 py-2 text-sm text-[#ece6dd]">
                          <input
                            type="checkbox"
                            name={`characteristic.${item.characteristicId}.showInCard`}
                            defaultChecked={item.showInCard}
                            disabled={!isSelected}
                          />
                          Principal na listagem
                        </label>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Field>
          </>
        ) : null}

        {formState.classId === "characteristics" ? (
          <>
            <Field>
              <FieldLabel htmlFor="admin-characteristic-key">Chave</FieldLabel>
              <Input id="admin-characteristic-key" name="key" required defaultValue={formState.values.key} />
            </Field>
            <Field>
              <FieldLabel htmlFor="admin-characteristic-label">Rotulo</FieldLabel>
              <Input id="admin-characteristic-label" name="label" required defaultValue={formState.values.label} />
            </Field>
            <Field>
              <FieldLabel htmlFor="admin-characteristic-data-type">Tipo de dado</FieldLabel>
              <select id="admin-characteristic-data-type" name="dataType" defaultValue={formState.values.dataType} className={selectClassName}>
                <option value={CharacteristicDataType.text}>Texto</option>
                <option value={CharacteristicDataType.number}>Numero</option>
                <option value={CharacteristicDataType.date}>Data</option>
                <option value={CharacteristicDataType.boolean}>Booleano</option>
                <option value={CharacteristicDataType.select}>Selecao</option>
              </select>
            </Field>
            <Field>
              <FieldLabel>Filtro publico</FieldLabel>
              <label className="flex items-center gap-2 rounded-lg border border-white/10 bg-[#1f1a17] px-3 py-2 text-sm text-[#ece6dd]">
                <input type="checkbox" name="isFilterable" defaultChecked={formState.values.isFilterable} />
                Permitir esta caracteristica nos filtros publicos quando o tipo de dado suportar filtro
              </label>
            </Field>
            <Field>
              <FieldLabel htmlFor="admin-characteristic-options">Opcoes</FieldLabel>
              <textarea
                id="admin-characteristic-options"
                name="optionsText"
                defaultValue={formState.values.optionsText}
                className={textareaClassName}
                placeholder="Uma opcao por linha"
              />
            </Field>
          </>
        ) : null}

        {formState.classId === "animals" ? (
          <>
            <Field>
              <FieldLabel htmlFor="admin-animal-identifier">Identificador</FieldLabel>
              <Input id="admin-animal-identifier" name="identifier" required defaultValue={formState.values.identifier} placeholder="atlas-do-vale" />
            </Field>
            <Field>
              <FieldLabel htmlFor="admin-animal-name">Nome</FieldLabel>
              <Input id="admin-animal-name" name="name" required defaultValue={formState.values.name} />
            </Field>
            <Field>
              <FieldLabel htmlFor="admin-animal-type">Tipo</FieldLabel>
              <select
                id="admin-animal-type"
                name="animalTypeId"
                required
                defaultValue={formState.values.animalTypeId}
                className={selectClassName}
                onChange={(event) => setSelectedAnimalTypeId(event.target.value)}
              >
                {formState.animalTypes.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field>
              <FieldLabel htmlFor="admin-animal-availability">Disponibilidade</FieldLabel>
              <select id="admin-animal-availability" name="availability" defaultValue={formState.values.availability} className={selectClassName}>
                <option value={Availability.available}>Disponivel</option>
                <option value={Availability.unavailable}>Indisponivel</option>
              </select>
            </Field>
            <Field>
              <FieldLabel htmlFor="admin-animal-description">Descricao comercial</FieldLabel>
              <textarea
                id="admin-animal-description"
                name="description"
                defaultValue={formState.values.description}
                className={textareaClassName}
                placeholder="Resumo comercial do animal"
              />
            </Field>
            <Field>
              <FieldLabel>Caracteristicas do tipo selecionado</FieldLabel>
              {selectedAnimalType ? (
                <div className="space-y-3 rounded-lg border border-white/8 bg-[#1b1714] p-4">
                  {selectedAnimalType.characteristics.map((characteristic) => {
                    const value = formState.characteristicValues[characteristic.characteristicId] ?? {
                      boolean: false,
                      date: "",
                      number: "",
                      optionId: "",
                      text: "",
                    };

                    return (
                      <div key={characteristic.characteristicId} className="rounded-lg border border-white/8 bg-[#151311] p-3">
                        <p className="text-sm font-medium text-[#f3ede5]">
                          {characteristic.label}
                          {characteristic.required ? <span className="text-[#ff9b93]"> *</span> : null}
                        </p>
                        <p className="mb-3 text-xs text-[#8f8579]">Chave: {characteristic.key}</p>

                        {characteristic.dataType === CharacteristicDataType.text ? (
                          <Input
                            name={`characteristic.${characteristic.characteristicId}.text`}
                            defaultValue={value.text}
                            placeholder={`Informe ${characteristic.label.toLowerCase()}`}
                          />
                        ) : null}

                        {characteristic.dataType === CharacteristicDataType.number ? (
                          <Input
                            name={`characteristic.${characteristic.characteristicId}.number`}
                            type="number"
                            step="any"
                            defaultValue={value.number}
                            placeholder="0"
                          />
                        ) : null}

                        {characteristic.dataType === CharacteristicDataType.date ? (
                          <Input name={`characteristic.${characteristic.characteristicId}.date`} type="date" defaultValue={value.date} />
                        ) : null}

                        {characteristic.dataType === CharacteristicDataType.boolean ? (
                          <label className="flex items-center gap-2 text-sm">
                            <input
                              type="checkbox"
                              name={`characteristic.${characteristic.characteristicId}.boolean`}
                              defaultChecked={value.boolean}
                            />
                            Marcar como verdadeiro
                          </label>
                        ) : null}

                        {characteristic.dataType === CharacteristicDataType.select ? (
                          <select
                            name={`characteristic.${characteristic.characteristicId}.optionId`}
                            defaultValue={value.optionId}
                            className={selectClassName}
                          >
                            <option value="">Selecione</option>
                            {characteristic.options.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-[#8f8579]">Selecione um tipo para carregar os campos dinamicos.</p>
              )}
            </Field>
          </>
        ) : null}

        {formState.classId === "carouselEntries" ? (
          <>
            <Field>
              <FieldLabel htmlFor="admin-carousel-order">Ordem de exibicao</FieldLabel>
              <Input id="admin-carousel-order" name="displayOrder" type="number" min={1} required defaultValue={formState.values.displayOrder} />
            </Field>
            <Field>
              <FieldLabel htmlFor="admin-carousel-animal">Animal</FieldLabel>
              <select
                id="admin-carousel-animal"
                name="animalId"
                required
                value={selectedCarouselAnimalId}
                className={selectClassName}
                onChange={(event) => {
                  const nextAnimalId = event.target.value;
                  const nextMediaOptions = formState.mediaOptionsByAnimalId[nextAnimalId] ?? [];
                  setSelectedCarouselAnimalId(nextAnimalId);
                  setSelectedCarouselMediaId(nextMediaOptions[0]?.value ?? "");
                }}
              >
                {formState.animalOptions.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field>
              <FieldLabel htmlFor="admin-carousel-media">Imagem de destaque</FieldLabel>
              <select
                id="admin-carousel-media"
                name="animalMediaId"
                required
                value={selectedCarouselMediaId}
                className={selectClassName}
                onChange={(event) => setSelectedCarouselMediaId(event.target.value)}
              >
                {selectedCarouselMediaOptions.length ? (
                  selectedCarouselMediaOptions.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))
                ) : (
                  <option value="">Nenhuma imagem disponivel</option>
                )}
              </select>
            </Field>
            <Field>
              <FieldLabel htmlFor="admin-carousel-description">Descricao</FieldLabel>
              <textarea
                id="admin-carousel-description"
                name="description"
                defaultValue={formState.values.description}
                className={textareaClassName}
                placeholder="Texto livre para exibir no carrossel"
              />
            </Field>
          </>
        ) : null}

        {formState.classId === "adminClasses" ? (
          <>
            <Field>
              <FieldLabel htmlFor="admin-class-identifier">Identificador</FieldLabel>
              <Input id="admin-class-identifier" name="identifier" readOnly defaultValue={formState.values.identifier} />
            </Field>
            <Field>
              <FieldLabel htmlFor="admin-class-label">Rotulo</FieldLabel>
              <Input id="admin-class-label" name="label" required defaultValue={formState.values.label} />
            </Field>
            <Field>
              <FieldLabel htmlFor="admin-class-description">Descricao</FieldLabel>
              <textarea
                id="admin-class-description"
                name="description"
                required
                defaultValue={formState.values.description}
                className={textareaClassName}
                placeholder="Explique o papel desta classe no painel"
              />
            </Field>
            <Field>
              <FieldLabel>Acoes permitidas na classe</FieldLabel>
              <div className="grid gap-3 md:grid-cols-2">
                <label className="flex items-center gap-2 rounded-lg border border-white/10 bg-[#1f1a17] px-3 py-2 text-sm text-[#ece6dd]">
                  <input
                    type="checkbox"
                    name="allowCreate"
                    defaultChecked={formState.values.allowCreate}
                    disabled={formState.values.identifier === "adminClasses"}
                  />
                  Permitir criacao
                </label>
                <label className="flex items-center gap-2 rounded-lg border border-white/10 bg-[#1f1a17] px-3 py-2 text-sm text-[#ece6dd]">
                  <input
                    type="checkbox"
                    name="allowDelete"
                    defaultChecked={formState.values.allowDelete}
                    disabled={formState.values.identifier === "adminClasses"}
                  />
                  Permitir exclusao
                </label>
              </div>
              {formState.values.identifier === "adminClasses" ? (
                <p className="mt-2 text-xs text-[#8f8579]">A classe de configuracao do admin nao permite criacao ou exclusao de registros.</p>
              ) : null}
            </Field>
            <Field>
              <FieldLabel>Permissoes de leitura</FieldLabel>
              <OptionChecklist
                fieldName="readPermissions"
                options={[...adminPermissionScopeOptions]}
                selectedValues={formState.values.readPermissions}
                lockedValues={[...requiredPermissionScopes.read]}
              />
            </Field>
            <Field>
              <FieldLabel>Permissoes de criacao</FieldLabel>
              <OptionChecklist
                fieldName="createPermissions"
                options={[...adminPermissionScopeOptions]}
                selectedValues={formState.values.createPermissions}
                lockedValues={[...requiredPermissionScopes.create]}
              />
            </Field>
            <Field>
              <FieldLabel>Permissoes de edicao</FieldLabel>
              <OptionChecklist
                fieldName="updatePermissions"
                options={[...adminPermissionScopeOptions]}
                selectedValues={formState.values.updatePermissions}
                lockedValues={[...requiredPermissionScopes.update]}
              />
            </Field>
            <Field>
              <FieldLabel>Permissoes de exclusao</FieldLabel>
              <OptionChecklist
                fieldName="deletePermissions"
                options={[...adminPermissionScopeOptions]}
                selectedValues={formState.values.deletePermissions}
                lockedValues={[...requiredPermissionScopes.delete]}
              />
            </Field>
          </>
        ) : null}
      </FieldGroup>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Salvando..." : formState.submitLabel}
        </Button>
        {isSubmitting ? <LoadingState inline label="Carregando operacao..." /> : null}
      </div>
      {error ? <p className="text-sm text-[#ff9b93]">{error}</p> : null}
    </form>
  );
}

export function AdminDetailPanel({ animalMedia, classId, classLabel, objectId, detail, formState, capabilities }: AdminDetailPanelProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleDelete() {
    if (!objectId || !window.confirm("Tem certeza que deseja excluir este registro?")) {
      return;
    }

    setDeleteError(null);
    setIsDeleting(true);

    try {
      const { error } = await apiDelete<{ ok: boolean }>(`/api/admin/${classId}/${objectId}`);

      if (error) {
        setDeleteError(error);
        return;
      }

      const params = new URLSearchParams(searchParams.toString());
      params.set("classId", classId);
      params.delete("objectId");
      params.delete("mode");
      router.replace(`${pathname}?${params.toString()}`);
      router.refresh();
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <section className="min-w-0 flex min-h-0 flex-[1.6] flex-col overflow-hidden rounded-2xl border border-white/8 bg-[#151311] text-[#ece6dd] shadow-[0_24px_60px_-34px_rgba(0,0,0,0.82)]">
      <div className="shrink-0 flex flex-col gap-4 p-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-xl font-bold text-[#f3ede5] sm:text-2xl">DETAILS</h3>
          <p className="text-sm text-[#8f8579]">
            {formState ? `Formulario de ${classLabel.toLowerCase()}.` : "Visualize, edite ou remova o item selecionado."}
          </p>
        </div>

        <div className="flex flex-wrap items-start gap-2 sm:justify-end">
          {formState ? <AdminQueryButton label="Cancelar" loadingLabel="Carregando visualizacao..." clears={["mode"]} variant="outline" /> : null}

          {!formState && objectId && detail && capabilities.canUpdate ? (
            <AdminQueryButton label="Editar" loadingLabel="Carregando formulario..." updates={{ mode: "edit" }} variant="outline" />
          ) : null}

          {!formState && objectId && detail && capabilities.canDelete ? (
            <div className="flex flex-col items-end gap-1">
              <Button type="button" variant="destructive" disabled={isDeleting} onClick={handleDelete}>
                {isDeleting ? "Excluindo..." : "Excluir"}
              </Button>
              {isDeleting ? <LoadingState inline label="Carregando exclusao..." /> : null}
            </div>
          ) : null}
        </div>
      </div>

      <Separator />
      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {formState ? (
          <AdminObjectForm key={`${classId}-${formState.mode}-${objectId ?? "new"}`} classId={classId} formState={formState} objectId={objectId} />
        ) : !objectId ? (
          <p className="text-sm text-[#8f8579]">Selecione um objeto ou use a acao de criar para abrir o formulario.</p>
        ) : !detail ? (
          <p className="text-sm text-[#8f8579]">O objeto selecionado nao foi encontrado.</p>
        ) : (
          <AdminDetailView detail={detail} />
        )}

        {classId === "animals" && objectId ? (
          <div className="mt-4">
            <AnimalMediaManager animalId={objectId} items={animalMedia} canManage={capabilities.canUpdate} />
          </div>
        ) : null}

        {deleteError ? <p className="mt-4 text-sm text-[#ff9b93]">{deleteError}</p> : null}
      </div>
    </section>
  );
}
