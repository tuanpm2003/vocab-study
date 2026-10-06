import { Suspense } from "react";
import { LoadingState } from "@/components/states";
import { StudySession } from "@/components/study/study-session";

export const metadata = { title: "Phiên học · Vocabulary" };

export default function StudySessionPage() {
  return (
    <Suspense fallback={<LoadingState rows={3} />}>
      <StudySession />
    </Suspense>
  );
}
