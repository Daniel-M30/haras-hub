import { LoadingState } from "@/src/components/loading-state";

export default function Loading() {
  return (
    <div className="flex flex-1 items-center justify-center p-8">
      <LoadingState label="Carregando painel..." />
    </div>
  );
}
