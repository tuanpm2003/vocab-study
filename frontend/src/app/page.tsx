import { HealthStatus } from "@/components/health-status";

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-xl flex-1 px-4 py-12">
      <h1 className="text-2xl font-semibold">Vocabulary</h1>
      <p className="mt-1 mb-6 text-muted-foreground">
        Walking skeleton — trình duyệt → Next.js → NestJS → PostgreSQL
      </p>
      <HealthStatus />
    </main>
  );
}
