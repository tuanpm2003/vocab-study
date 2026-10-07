"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { NativeSelect } from "@/components/native-select";
import { ErrorState } from "@/components/states";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { collectionsApi, languagesApi, vocabulariesApi } from "@/lib/api";
import { fieldLabels } from "@/lib/language-labels";
import { qk } from "@/lib/query-keys";
import { cn } from "@/lib/utils";
import {
  EMPTY_CONTEXT,
  saveContext,
  type VocabularyContext,
} from "@/lib/vocabulary-context";
import type { CreatedVocabulary, Vocabulary } from "@/types/api";

const optionalText = (max: number, label: string) =>
  z.string().trim().max(max, `${label} dài tối đa ${max} ký tự`);

// Giới hạn khớp CreateVocabularyDto của backend.
const schema = z.object({
  languageId: z.string().min(1, "Chọn ngôn ngữ trước"),
  levelId: z.string(),
  collectionIds: z.array(z.string()),
  term: z
    .string()
    .trim()
    .min(1, "Từ không được để trống")
    .max(200, "Từ dài tối đa 200 ký tự"),
  meaning: z
    .string()
    .trim()
    .min(1, "Nghĩa không được để trống")
    .max(1000, "Nghĩa dài tối đa 1000 ký tự"),
  reading: optionalText(200, "Cách đọc"),
  romanization: optionalText(200, "Phiên âm"),
  exampleSentence: optionalText(1000, "Câu ví dụ"),
  exampleTranslation: optionalText(1000, "Bản dịch"),
  notes: optionalText(2000, "Ghi chú"),
});

type FormValues = z.infer<typeof schema>;

// Những ô bị XÓA sau mỗi lần lưu. Ngữ cảnh (language/level/collection) thì được giữ.
const EMPTY_WORD = {
  term: "",
  meaning: "",
  reading: "",
  romanization: "",
  exampleSentence: "",
  exampleTranslation: "",
  notes: "",
};

function toDefaults(
  vocabulary: Vocabulary | undefined,
  context: VocabularyContext,
): FormValues {
  if (!vocabulary) return { ...context, ...EMPTY_WORD };
  return {
    languageId: vocabulary.language.id,
    levelId: vocabulary.level?.id ?? "",
    collectionIds: vocabulary.collections.map((c) => c.id),
    term: vocabulary.term,
    meaning: vocabulary.meaning,
    reading: vocabulary.reading ?? "",
    romanization: vocabulary.romanization ?? "",
    exampleSentence: vocabulary.exampleSentence ?? "",
    exampleTranslation: vocabulary.exampleTranslation ?? "",
    notes: vocabulary.notes ?? "",
  };
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="text-sm text-destructive">
      {message}
    </p>
  );
}

export function VocabularyForm({
  initialContext = EMPTY_CONTEXT,
  vocabulary,
  onSaved,
}: {
  /** Chỉ dùng khi tạo mới. */
  initialContext?: VocabularyContext;
  /** Có → chế độ sửa. */
  vocabulary?: Vocabulary;
  /** Chế độ sửa: gọi sau khi lưu xong. */
  onSaved?: (saved: Vocabulary) => void;
}) {
  const isEdit = vocabulary !== undefined;
  const queryClient = useQueryClient();
  const [savedCount, setSavedCount] = useState(0);
  const termRef = useRef<HTMLInputElement | null>(null);
  const submitting = useRef(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: toDefaults(vocabulary, initialContext),
  });
  const { control, setValue, getValues } = form;
  const languageId = useWatch({ control, name: "languageId" });
  const levelId = useWatch({ control, name: "levelId" });
  const collectionIds = useWatch({ control, name: "collectionIds" });

  const languages = useQuery({
    queryKey: qk.languages,
    queryFn: languagesApi.list,
  });
  // enabled: không có languageId thì KHÔNG gọi — tránh request /languages/undefined.
  const language = useQuery({
    queryKey: qk.language(languageId),
    queryFn: () => languagesApi.get(languageId),
    enabled: languageId !== "",
  });
  const collections = useQuery({
    queryKey: qk.collectionsByLanguage(languageId),
    queryFn: () => collectionsApi.listByLanguage(languageId),
    enabled: languageId !== "",
  });

  // Ngữ cảnh nhớ từ lần trước có thể trỏ tới thứ đã bị xóa. Dọn khi dữ liệu thật về tới.
  useEffect(() => {
    if (isEdit || !languages.data || languageId === "") return;
    if (!languages.data.items.some((l) => l.id === languageId)) {
      setValue("languageId", "");
      setValue("levelId", "");
      setValue("collectionIds", []);
    }
  }, [isEdit, languages.data, languageId, setValue]);

  useEffect(() => {
    if (!language.data || levelId === "") return;
    const exists = language.data.levelSystems.some((system) =>
      system.levels.some((level) => level.id === levelId),
    );
    if (!exists) setValue("levelId", "");
  }, [language.data, levelId, setValue]);

  useEffect(() => {
    if (!collections.data) return;
    // Danh sách bị cắt ở 100 bài học. Khi chưa có đủ, một id "không thấy" có thể vẫn tồn tại
    // — dọn nó đi sẽ âm thầm gỡ từ khỏi bài học thứ 101 trở đi khi người dùng bấm Lưu.
    if (collections.data.total > collections.data.items.length) return;
    const known = new Set(collections.data.items.map((c) => c.id));
    const kept = collectionIds.filter((id) => known.has(id));
    if (kept.length !== collectionIds.length) setValue("collectionIds", kept);
  }, [collections.data, collectionIds, setValue]);

  // Nhớ ngữ cảnh ngay khi nó đổi, không đợi tới lúc lưu: đóng trang giữa chừng vẫn giữ được.
  useEffect(() => {
    if (isEdit || languageId === "") return;
    saveContext({ languageId, levelId, collectionIds });
  }, [isEdit, languageId, levelId, collectionIds]);

  function currentContext(): VocabularyContext {
    const [id, level, ids] = getValues([
      "languageId",
      "levelId",
      "collectionIds",
    ]);
    return { languageId: id, levelId: level, collectionIds: ids };
  }

  function changeLanguage(next: string) {
    // Level và collection thuộc về MỘT ngôn ngữ: đổi ngôn ngữ thì chúng hết nghĩa.
    setValue("languageId", next, { shouldValidate: true });
    setValue("levelId", "");
    setValue("collectionIds", []);
  }

  function toggleCollection(id: string) {
    // getValues, không dùng biến `collectionIds` của lần render này: hai lần bấm liên tiếp
    // trước khi React kịp render lại sẽ cùng tính trên một danh sách cũ và mất một lựa chọn.
    const current = getValues("collectionIds");
    const next = current.includes(id)
      ? current.filter((existing) => existing !== id)
      : [...current, id];
    setValue("collectionIds", next);
  }

  const mutation = useMutation({
    mutationFn: (values: FormValues): Promise<CreatedVocabulary> => {
      const body = {
        levelId: values.levelId || null,
        collectionIds: values.collectionIds,
        term: values.term,
        meaning: values.meaning,
        reading: values.reading || null,
        romanization: values.romanization || null,
        exampleSentence: values.exampleSentence || null,
        exampleTranslation: values.exampleTranslation || null,
        notes: values.notes || null,
      };
      return vocabulary
        ? vocabulariesApi.update(vocabulary.id, body)
        : vocabulariesApi.create({ languageId: values.languageId, ...body });
    },
    onSuccess: (saved) => {
      // Không await: làm mới danh sách là việc nền, không được giữ chân người đang gõ từ tiếp theo.
      void queryClient.invalidateQueries({ queryKey: qk.vocabularies });
      void queryClient.invalidateQueries({ queryKey: qk.languages });
      void queryClient.invalidateQueries({ queryKey: qk.collections });

      if (isEdit) {
        toast.success(`Đã cập nhật ${saved.term}`);
        onSaved?.(saved);
        return;
      }

      const context = currentContext();
      form.reset({ ...context, ...EMPTY_WORD });
      // KHÔNG dùng form.setFocus: reset() vừa xóa sổ đăng ký field của React Hook Form,
      // nên setFocus gọi ngay sau đó không tìm thấy ô nào. Ref riêng thì luôn còn.
      termRef.current?.focus();
      setSavedCount((count) => count + 1);
      toast.success(`Đã lưu ${saved.term}`);

      const duplicate = saved.warnings?.find(
        (w) => w.code === "POSSIBLE_DUPLICATE",
      );
      const existingId = duplicate?.existingIds[0];
      if (duplicate && existingId) {
        // Cảnh báo, KHÔNG chặn: từ đồng tự khác nghĩa là hợp lệ, và form đã sẵn sàng cho từ kế tiếp.
        toast.warning(duplicate.message, {
          duration: 10_000,
          description: (
            <Link href={`/vocabulary/${existingId}/edit`} className="underline">
              Xem từ đã có
            </Link>
          ),
        });
      }
    },
    onError: (error) => form.setError("root", { message: error.message }),
  });

  // handleSubmit được gọi BÊN TRONG hàm xử lý sự kiện (không phải lúc render) vì nó đọc ref.
  function submit(event?: React.BaseSyntheticEvent) {
    return form.handleSubmit((values) => {
      // Ref, không phải mutation.isPending: hai lần Ctrl+Enter liền nhau chạy trong cùng một
      // lần render nên cùng thấy isPending = false, và sẽ tạo hai từ trùng nhau.
      if (submitting.current) return;
      submitting.current = true;
      mutation.mutate(values, {
        onSettled: () => {
          submitting.current = false;
        },
      });
    })(event);
  }
  const termField = form.register("term");
  const { errors } = form.formState;

  const selectedLanguage = languages.data?.items.find(
    (l) => l.id === languageId,
  );
  const languageCode = isEdit
    ? vocabulary.language.code
    : selectedLanguage?.code;
  const labels = fieldLabels(languageCode);
  const levelSystems = language.data?.levelSystems ?? [];
  // Chọn level thì chỉ hiện bài học của level đó + các chủ đề xuyên level.
  // Cái đang được chọn luôn hiện, để bỏ chọn được.
  const visibleCollections = (collections.data?.items ?? []).filter(
    (c) =>
      levelId === "" ||
      c.levelId === levelId ||
      c.levelId === null ||
      collectionIds.includes(c.id),
  );

  if (languages.error) {
    return (
      <ErrorState
        error={languages.error}
        onRetry={() => void languages.refetch()}
      />
    );
  }

  return (
    <form
      onSubmit={(e) => void submit(e)}
      onKeyDown={(e) => {
        // Ctrl+Enter (Cmd+Enter trên Mac) lưu từ bất kỳ ô nào, kể cả textarea.
        if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
          e.preventDefault();
          void submit();
        }
      }}
      className="grid gap-5"
      noValidate
    >
      <fieldset className="grid gap-3 rounded-xl border bg-muted/30 p-3 sm:grid-cols-2">
        <legend className="sr-only">Ngữ cảnh</legend>
        <div className="grid gap-2">
          <Label htmlFor="vocab-language">Ngôn ngữ</Label>
          <NativeSelect
            id="vocab-language"
            value={languageId}
            disabled={isEdit}
            aria-invalid={!!errors.languageId}
            onChange={(e) => changeLanguage(e.target.value)}
          >
            <option value="">— Chọn ngôn ngữ —</option>
            {isEdit && (
              <option value={vocabulary.language.id}>
                {vocabulary.language.name}
              </option>
            )}
            {!isEdit &&
              languages.data?.items.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
          </NativeSelect>
          <FieldError message={errors.languageId?.message} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="vocab-level">Level</Label>
          <NativeSelect
            id="vocab-level"
            value={levelId}
            disabled={languageId === ""}
            onChange={(e) => setValue("levelId", e.target.value)}
          >
            <option value="">Không chọn</option>
            {levelSystems.map((system) => (
              <optgroup key={system.id} label={system.name}>
                {system.levels.map((level) => (
                  <option key={level.id} value={level.id}>
                    {level.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </NativeSelect>
        </div>
        <div className="grid gap-2 sm:col-span-2">
          <span id="vocab-collections-label" className="text-sm font-medium">
            Bài học / chủ đề{" "}
            <span className="font-normal text-muted-foreground">
              (chọn nhiều được)
            </span>
          </span>
          <div
            role="group"
            aria-labelledby="vocab-collections-label"
            className="flex flex-wrap gap-2"
          >
            {languageId === "" && (
              <span className="text-sm text-muted-foreground">
                Chọn ngôn ngữ để thấy bài học.
              </span>
            )}
            {languageId !== "" &&
              collections.data &&
              visibleCollections.length === 0 && (
                <span className="text-sm text-muted-foreground">
                  Chưa có bài học nào —{" "}
                  <Link href={`/languages/${languageId}`} className="underline">
                    tạo ở trang ngôn ngữ
                  </Link>
                  .
                </span>
              )}
            {visibleCollections.map((c) => {
              const selected = collectionIds.includes(c.id);
              return (
                <button
                  key={c.id}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => toggleCollection(c.id)}
                  className={cn(
                    "min-h-9 rounded-full border px-3 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                    selected
                      ? "border-primary bg-primary text-primary-foreground hover:bg-primary/80"
                      : "bg-background hover:border-foreground/40 hover:bg-muted",
                  )}
                >
                  {c.name}
                </button>
              );
            })}
          </div>
        </div>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="vocab-term">Từ</Label>
          <Input
            id="vocab-term"
            lang={languageCode ?? undefined}
            autoFocus={isEdit || initialContext.languageId !== ""}
            autoComplete="off"
            className="h-12 text-2xl md:text-2xl"
            aria-invalid={!!errors.term}
            {...termField}
            ref={(element) => {
              termField.ref(element);
              termRef.current = element;
            }}
          />
          <FieldError message={errors.term?.message} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="vocab-meaning">Nghĩa</Label>
          <Input
            id="vocab-meaning"
            autoComplete="off"
            className="h-12 text-lg md:text-lg"
            aria-invalid={!!errors.meaning}
            {...form.register("meaning")}
          />
          <FieldError message={errors.meaning?.message} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="vocab-reading">{labels.reading}</Label>
          <Input
            id="vocab-reading"
            lang={languageCode ?? undefined}
            autoComplete="off"
            aria-invalid={!!errors.reading}
            {...form.register("reading")}
          />
          <FieldError message={errors.reading?.message} />
        </div>
        {labels.romanization && (
          <div className="grid gap-2">
            <Label htmlFor="vocab-romanization">{labels.romanization}</Label>
            <Input
              id="vocab-romanization"
              autoComplete="off"
              aria-invalid={!!errors.romanization}
              {...form.register("romanization")}
            />
            <FieldError message={errors.romanization?.message} />
          </div>
        )}
        <div className="grid gap-2 sm:col-span-2">
          <Label htmlFor="vocab-example">Câu ví dụ</Label>
          <Textarea
            id="vocab-example"
            lang={languageCode ?? undefined}
            rows={2}
            aria-invalid={!!errors.exampleSentence}
            {...form.register("exampleSentence")}
          />
          <FieldError message={errors.exampleSentence?.message} />
        </div>
        <div className="grid gap-2 sm:col-span-2">
          <Label htmlFor="vocab-example-translation">Dịch câu ví dụ</Label>
          <Textarea
            id="vocab-example-translation"
            rows={2}
            aria-invalid={!!errors.exampleTranslation}
            {...form.register("exampleTranslation")}
          />
          <FieldError message={errors.exampleTranslation?.message} />
        </div>
        <div className="grid gap-2 sm:col-span-2">
          <Label htmlFor="vocab-notes">Ghi chú</Label>
          <Textarea
            id="vocab-notes"
            rows={2}
            aria-invalid={!!errors.notes}
            {...form.register("notes")}
          />
          <FieldError message={errors.notes?.message} />
        </div>
      </div>

      <FieldError message={errors.root?.message} />

      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="submit"
          className="h-11 px-5"
          disabled={mutation.isPending}
        >
          {mutation.isPending ? "Đang lưu…" : isEdit ? "Lưu thay đổi" : "Lưu"}
        </Button>
        <span className="text-sm text-muted-foreground">
          <kbd className="rounded border px-1.5 py-0.5 text-xs">Ctrl</kbd> +{" "}
          <kbd className="rounded border px-1.5 py-0.5 text-xs">Enter</kbd> để
          lưu
        </span>
        {savedCount > 0 && (
          <span className="text-sm text-muted-foreground" role="status">
            Đã thêm {savedCount} từ trong lượt này
          </span>
        )}
      </div>
    </form>
  );
}
