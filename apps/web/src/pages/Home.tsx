import { useQuery } from "@tanstack/react-query";
import type { Health } from "@dating/shared";
import { api } from "@/lib/api";

export default function Home() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["health"],
    queryFn: () => api<Health>("/health"),
  });

  return (
    <main className="mx-auto max-w-2xl px-4 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">Agentic Dating</h1>
      <p className="mt-2 text-neutral-500">Agents that date on your behalf.</p>
      <section className="mt-8 rounded-lg border p-4 font-mono text-sm">
        {isLoading && "checking…"}
        {error && `api unreachable: ${(error as Error).message}`}
        {data && (
          <ul>
            <li>db: {data.db}</li>
            <li>llm: {data.llm}</li>
          </ul>
        )}
      </section>
    </main>
  );
}
