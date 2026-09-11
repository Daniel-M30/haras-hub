"use client";
/* eslint-disable @next/next/no-img-element */

import { useRouter } from "next/navigation";
import { type ChangeEvent, useState } from "react";
import { MediaKind } from "@/src/generated/prisma/enums";
import { apiDelete, apiPost } from "@/src/lib/api-client";
import { animalMediaUploadChunkSizeInBytes, animalMediaUploadChunkSizeLabel, findOversizedUploadFile, maxAnimalMediaUploadSizeLabel } from "@/src/lib/media-upload";
import type { AnimalMediaManagerProps, AnimalMediaUploadSessionPayload, RegisteredAnimalMediaUploadInput } from "@/src/types";
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

    const oversizedFile = findOversizedUploadFile(files);

    if (oversizedFile) {
      setUploadError(`O arquivo "${oversizedFile.name}" excede o limite de ${maxAnimalMediaUploadSizeLabel}.`);
      event.target.value = "";
      return;
    }

    setIsUploading(true);

    try {
      for (const file of Array.from(files)) {
        const { data: uploadSession, error: uploadSessionError } = await apiPost<AnimalMediaUploadSessionPayload>(
          `/api/admin/animals/${animalId}/media/upload`,
          {
            contentType: file.type,
            fileName: file.name,
            size: file.size,
          },
        );

        if (uploadSessionError || !uploadSession) {
          setUploadError(uploadSessionError ?? "Nao foi possivel preparar o upload do arquivo.");
          return;
        }

        let uploadFailed = false;

        try {
          for (let chunkIndex = 0; chunkIndex < uploadSession.totalChunks; chunkIndex += 1) {
            const start = chunkIndex * animalMediaUploadChunkSizeInBytes;
            const end = Math.min(start + animalMediaUploadChunkSizeInBytes, file.size);
            const chunk = new Uint8Array(await file.slice(start, end).arrayBuffer());
            const { error: chunkUploadError } = await apiPost<{ ok: boolean }>(
              `/api/admin/animals/${animalId}/media/upload/chunk`,
              chunk,
              {
                headers: {
                  "Content-Type": "application/octet-stream",
                  "x-upload-chunk-index": String(chunkIndex),
                  "x-upload-session-id": uploadSession.sessionId,
                  "x-upload-storage-key": uploadSession.storageKey,
                },
              },
            );

            if (chunkUploadError) {
              uploadFailed = true;
              setUploadError(chunkUploadError);
              return;
            }
          }

          const { error } = await apiPost<{ ok: boolean }>(`/api/admin/animals/${animalId}/media`, {
            contentType: uploadSession.contentType,
            fileName: uploadSession.fileName,
            sessionId: uploadSession.sessionId,
            storageKey: uploadSession.storageKey,
            totalChunks: uploadSession.totalChunks,
          } satisfies RegisteredAnimalMediaUploadInput);

          if (error) {
            uploadFailed = true;
            setUploadError(error);
            return;
          }
        } finally {
          if (uploadFailed) {
            await apiPost<{ ok: boolean }>(`/api/admin/animals/${animalId}/media/upload/abort`, {
              sessionId: uploadSession.sessionId,
              storageKey: uploadSession.storageKey,
              totalChunks: uploadSession.totalChunks,
            });
          }
        }
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
          <p className="text-sm text-[#b9afa2]">
            Associe fotos e videos ao animal selecionado. Limite por arquivo: {maxAnimalMediaUploadSizeLabel}. O envio acontece em blocos de ate {animalMediaUploadChunkSizeLabel}.
          </p>
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
