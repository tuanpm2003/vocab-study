"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { NativeSelect } from "@/components/native-select";
import { ErrorState } from "@/components/states";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { collectionsApi, languagesApi, toQueryString } from "@/lib/api";
import { qk } from "@/lib/query-keys";
import { cn } from "@/lib/utils";
import type { StudyMode } from "@/types/api";

const SIZES = [10, 20, 30, 50];

const MODES: { value: StudyMode; label: string; hint: string }[] = [
  {
    value: "flashcard",
    label: "Flashcard",
    hint: "Lật thẻ, tự chấm mức độ nhớ",
  },
];

export function StudySetup() {
  const router = useRouter();
  const [languageId, setLanguageId] = useState("");
  const [levelId, setLevelId] = useState("");
  const [collectionId, setCollectionId] = useState("");
  const [mode, setMode] = useState<StudyMode>("flashcard");
  const [limit, setLimit] = useState(20);

  const languages = useQuery({
    queryKey: qk.languages,
    queryFn: languagesApi.list,
  });
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

  function start() {
    router.push(
      `/study/session?${toQueryString({ mode, languageId, levelId, collectionId, limit })}`,
    );
  }

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
      className="mx-auto grid max-w-xl gap-5"
      onSubmit={(e) => {
        e.preventDefault();
        start();
      }}
    >
      <fieldset className="grid gap-2">
        <legend className="mb-2 text-sm font-medium">Chế độ</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {MODES.map((option) => (
            <label
              key={option.value}
              className={cn(
                "cursor-pointer rounded-xl border p-3 has-focus-visible:ring-3 has-focus-visible:ring-ring/50",
                mode === option.value && "border-primary bg-muted/50",
              )}
            >
              <input
                type="radio"
                name="mode"
                className="sr-only"
                value={option.value}
                checked={mode === option.value}
                onChange={() => setMode(option.value)}
              />
              <span className="block font-medium">{option.label}</span>
              <span className="text-sm text-muted-foreground">
                {option.hint}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="grid gap-2">
          <Label htmlFor="study-language">Ngôn ngữ</Label>
          <NativeSelect
            id="study-language"
            value={languageId}
            onChange={(e) => {
              setLanguageId(e.target.value);
              setLevelId("");
              setCollectionId("");
            }}
          >
            <option value="">Tất cả</option>
            {languages.data?.items.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name} ({l.vocabularyCount})
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="study-level">Level</Label>
          <NativeSelect
            id="study-level"
            value={levelId}
            disabled={languageId === ""}
            onChange={(e) => setLevelId(e.target.value)}
          >
            <option value="">Tất cả</option>
            {language.data?.levelSystems.map((system) => (
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
        <div className="grid gap-2">
          <Label htmlFor="study-collection">Bài học</Label>
          <NativeSelect
            id="study-collection"
            value={collectionId}
            disabled={languageId === ""}
            onChange={(e) => setCollectionId(e.target.value)}
          >
            <option value="">Tất cả</option>
            {collections.data?.items.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.vocabularyCount})
              </option>
            ))}
          </NativeSelect>
        </div>
      </div>

      <fieldset>
        <legend className="mb-2 text-sm font-medium">Số từ</legend>
        <div className="flex flex-wrap gap-2">
          {SIZES.map((size) => (
            <button
              key={size}
              type="button"
              aria-pressed={limit === size}
              onClick={() => setLimit(size)}
              className={cn(
                "h-10 min-w-14 rounded-lg border px-3 text-sm font-medium outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                limit === size
                  ? "border-primary bg-primary text-primary-foreground"
                  : "bg-background hover:bg-muted",
              )}
            >
              {size}
            </button>
          ))}
        </div>
      </fieldset>

      {/* autoFocus: vào trang là Enter được ngay → "Học" rồi "Bắt đầu" = hai lần bấm. */}
      <Button type="submit" className="h-12 text-base" autoFocus>
        Bắt đầu
      </Button>
    </form>
  );
}
