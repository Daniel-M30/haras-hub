"use client";

import { Button } from "@/src/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/src/components/ui/field";
import { Input } from "@/src/components/ui/input";
import { LoadingState } from "@/src/components/loading-state";
import { apiPost } from "@/src/lib/api-client";
import { useRouter, useSearchParams } from "next/navigation";
import { SubmitEvent, useState } from "react";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const email = formData.get("email")?.toString() ?? "";
    const password = formData.get("password")?.toString() ?? "";

    setError(null);
    setIsLoading(true);

    try {
      const { error } = await apiPost<{ success: boolean }>("/api/auth/login", { email, password });

      if (error) {
        setError(error);
        return;
      }

      const nextPath = searchParams.get("next");
      const redirectPath = nextPath && nextPath.startsWith("/") ? nextPath : "/admin";

      router.replace(redirectPath);
      router.refresh();
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form
      className="h-max w-full max-w-sm rounded-3xl border border-white/8 bg-[#151311] p-6 shadow-[0_24px_60px_-34px_rgba(0,0,0,0.82)]"
      onSubmit={handleSubmit}
    >
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#f3ede5]">Admin</h1>
        <p className="mt-1 text-sm text-[#b9afa2]">Entre com suas credenciais para administrar o sistema.</p>
      </div>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="form-email">Email</FieldLabel>
          <Input id="form-email" name="email" type="email" placeholder="Email" required />
        </Field>
        <Field>
          <FieldLabel htmlFor="form-password">Senha</FieldLabel>
          <Input id="form-password" name="password" type="password" placeholder="Senha" required />
        </Field>
        <Field>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? "Entrando..." : "Entrar"}
          </Button>
        </Field>
        {isLoading ? <LoadingState inline label="Carregando autenticacao..." /> : null}
        {error ? <p className="text-sm text-[#ff9b93]">{error}</p> : null}
      </FieldGroup>
    </form>
  );
}
