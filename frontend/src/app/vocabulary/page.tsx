import { Plus } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { LoadingState } from "@/components/states";
import { buttonVariants } from "@/components/ui/button";
import { VocabularyBrowser } from "@/components/vocabulary/vocabulary-browser";
import { cn } from "@/lib/utils";

export const metadata = { title: "Từ vựng · Vocabulary" };

export default function VocabularyPage() {
  return (
    <>
      <div className="mb-4 flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Từ vựng</h1>
        <Link
          href="/vocabulary/new"
          className={cn(buttonVariants(), "h-9 px-3")}
        >
          <Plus aria-hidden /> Thêm từ
        </Link>
      </div>
      {/* useSearchParams buộc phải nằm trong Suspense để Next prerender được phần vỏ trang. */}
      <Suspense fallback={<LoadingState rows={5} />}>
        <VocabularyBrowser />
      </Suspense>
    </>
  );
}
