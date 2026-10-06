import { VocabularyEdit } from "@/components/vocabulary/vocabulary-edit";

export const metadata = { title: "Sửa từ · Vocabulary" };

export default async function EditVocabularyPage({
  params,
}: PageProps<"/vocabulary/[id]/edit">) {
  const { id } = await params;
  return (
    <div className="mx-auto max-w-2xl">
      <VocabularyEdit id={id} />
    </div>
  );
}
