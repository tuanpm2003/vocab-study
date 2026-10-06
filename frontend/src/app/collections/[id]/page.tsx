import { CollectionDetail } from "@/components/collections/collection-detail";

export default async function CollectionDetailPage({
  params,
}: PageProps<"/collections/[id]">) {
  const { id } = await params;
  return <CollectionDetail id={id} />;
}
