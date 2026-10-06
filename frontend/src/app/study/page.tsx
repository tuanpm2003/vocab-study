import { StudySetup } from "@/components/study/study-setup";

export const metadata = { title: "Học · Vocabulary" };

export default function StudyPage() {
  return (
    <>
      <h1 className="mb-6 text-center text-2xl font-semibold">Học</h1>
      <StudySetup />
    </>
  );
}
