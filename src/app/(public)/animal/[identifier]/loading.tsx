import { LoadingState } from "@/src/components/loading-state";

export default function Loading() {
  return (
    <div className="flex min-h-[calc(100vh-230px)] items-center justify-center p-8">
      <LoadingState label="Carregando animal..." />
    </div>
  );
}
