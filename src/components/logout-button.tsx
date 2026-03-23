"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/src/components/ui/button";
import { LoadingState } from "@/src/components/loading-state";
import { apiPost } from "@/src/lib/api-client";

export function LogoutButton() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleLogout() {
    setError(null);
    setIsLoading(true);

    try {
      const { error } = await apiPost<{ success: boolean }>("/api/auth/logout");

      if (error) {
        setError(error);
        return;
      }

      router.replace("/admin/login");
      router.refresh();
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <Button onClick={handleLogout} type="button" variant="outline" disabled={isLoading}>
        {isLoading ? "Saindo..." : "Sair"}
      </Button>
      {isLoading ? <LoadingState inline label="Carregando saida..." /> : null}
      {error ? <p className="text-sm text-[#ff9b93]">{error}</p> : null}
    </div>
  );
}
