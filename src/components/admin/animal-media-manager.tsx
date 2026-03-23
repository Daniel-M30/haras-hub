"use client";
/* eslint-disable @next/next/no-img-element */

import { useRouter } from "next/navigation";
import { type ChangeEvent, useState } from "react";
import { MediaKind } from "@/src/generated/prisma/enums";
import { apiDelete, apiPost } from "@/src/lib/api-client";
import type { AnimalMediaManagerProps } from "@/src/types";
import { Button } from "@/src/components/ui/button";
import { LoadingState } from "@/src/components/loading-state";

export function AnimalMediaManager({ animalId, items, canManage }: AnimalMediaManagerProps) {
  const router = useRouter();
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [removingMediaId, setRemovingMediaId] = useState<string | null>(null);

  async function handleUpload(event: ChangeEvent<HTMLInputElement>) {
    const files = event.target.files;

    if (!files?.length) {
      return;
    }

    setUploadError(null);
    setIsUploading(true);

    try {
      const formData = new FormData();

      for (const file of Array.from(files)) {
        formData.append("files", file);
      }

      const { error } = await apiPost<{ ok: boolean }>(`/api/admin/animals/${animalId}/media`, formData);

      if (error) {
        setUploadError(error);
        return;
      }

      router.refresh();
      event.target.value = "";
    } finally {
      setIsUploading(false);
    }
  }

  async function handleDelete(mediaId: string) {
    if (!window.confirm("Tem certeza que deseja remover esta midia?")) {
      return;
    }

    setDeleteError(null);
    setRemovingMediaId(mediaId);

    try {
      const { error } = await apiDelete<{ ok: boolean }>(`/api/admin/animals/${animalId}/media/${mediaId}`);

      if (error) {
        setDeleteError(error);
        return;
      }

      router.refresh();
    } finally {
      setRemovingMediaId(null);
    }
  }

  return (
    <div className="space-y-4 rounded-lg border border-white/8 bg-[#1b1714] p-4 text-[#ece6dd]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h4 className="text-lg font-semibold">Midias</h4>
          <p className="text-sm text-[#b9afa2]">Associe fotos e videos ao animal selecionado.</p>
        </div>

        {canManage ? (
          <label className="inline-flex cursor-pointer items-center rounded-xl border border-white/10 bg-[#1f1a17] px-4 py-2 text-sm font-medium text-[#ece6dd] transition hover:bg-[#26211c] hover:text-white">
            <input type="file" accept="image/*,video/*" multiple className="hidden" onChange={handleUpload} disabled={isUploading} />
            {isUploading ? "Enviando..." : "Adicionar arquivos"}
          </label>
        ) : null}
      </div>

      {isUploading ? <LoadingState inline label="Carregando upload..." /> : null}
      {uploadError ? <p className="text-sm text-[#ff9b93]">{uploadError}</p> : null}
      {deleteError ? <p className="text-sm text-[#ff9b93]">{deleteError}</p> : null}

      {items.length ? (
        <div className="grid gap-3 md:grid-cols-2">
          {items.map((item) => (
            <article key={item.id} className="space-y-3 rounded-lg border border-white/8 bg-white/4 p-3">
              <div className="overflow-hidden rounded-lg bg-[#11100f]">
                {item.kind === MediaKind.image ? (
                  <img src={item.url} alt={item.fileName} className="aspect-video w-full object-cover" />
                ) : (
                  <video src={item.url} controls className="aspect-video w-full bg-black object-cover" />
                )}
              </div>

              <div className="space-y-1">
                <p className="font-medium text-[#f3ede5]">{item.fileName}</p>
                <p className="text-sm text-[#8f8579]">{item.kind === MediaKind.image ? "Imagem" : "Video"}</p>
              </div>

              {canManage ? (
                <div className="flex items-center gap-3">
                  <Button type="button" variant="destructive" size="sm" disabled={removingMediaId === item.id} onClick={() => handleDelete(item.id)}>
                    {removingMediaId === item.id ? "Removendo..." : "Remover"}
                  </Button>
                  {removingMediaId === item.id ? <LoadingState inline label="Carregando remocao..." /> : null}
                </div>
              ) : null}
            </article>
          ))}
        </div>
      ) : (
        <p className="text-sm text-[#8f8579]">Nenhuma midia associada a este animal.</p>
      )}
    </div>
  );
}
