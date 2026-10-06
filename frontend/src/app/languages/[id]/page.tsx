import { LanguageDetail } from "@/components/languages/language-detail";

export default async function LanguageDetailPage({
  params,
}: PageProps<"/languages/[id]">) {
  const { id } = await params;
  return <LanguageDetail id={id} />;
}
