import { HealthStatus } from "@/components/health-status";

export default function Home() {
  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-semibold">Vocabulary</h1>
      <p className="mt-1 mb-6 text-muted-foreground">
        Walking skeleton — trình duyệt → Next.js → NestJS → PostgreSQL
      </p>
      <HealthStatus />
    </div>
  );
}
