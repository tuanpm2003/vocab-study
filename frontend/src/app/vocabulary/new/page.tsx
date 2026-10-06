import { VocabularyNewLoader } from "@/components/vocabulary/vocabulary-new-loader";

export const metadata = { title: "Thêm từ · Vocabulary" };

export default function NewVocabularyPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-4 text-2xl font-semibold">Thêm từ</h1>
      <VocabularyNewLoader />
    </div>
  );
}
