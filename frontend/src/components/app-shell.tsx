"use client";

import { GraduationCap, Plus, RotateCcw, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

interface PrimaryAction {
  href: string;
  label: string;
  icon: LucideIcon;
  /** false = tính năng chưa tồn tại; nút vẫn hiện để vị trí không đổi khi tính năng ra đời. */
  available: boolean;
}

// Ba hành động quan trọng nhất của app (CLAUDE.md §1): luôn tới được trong một lần bấm.
const PRIMARY_ACTIONS: PrimaryAction[] = [
  { href: "/vocabulary/new", label: "Thêm từ", icon: Plus, available: true },
  { href: "/study", label: "Học", icon: GraduationCap, available: false },
  {
    href: "/study/session?source=due",
    label: "Ôn tập",
    icon: RotateCcw,
    available: false,
  },
];

const NAV_LINKS = [{ href: "/languages", label: "Ngôn ngữ" }];

function ActionLink({
  action,
  className,
}: {
  action: PrimaryAction;
  className?: string;
}) {
  const Icon = action.icon;
  const content = (
    <>
      <Icon className="size-4 shrink-0" aria-hidden />
      <span>{action.label}</span>
    </>
  );
  if (!action.available) {
    return (
      <span
        aria-disabled="true"
        title="Sắp có"
        className={cn(className, "cursor-not-allowed opacity-45")}
      >
        {content}
      </span>
    );
  }
  return (
    <Link href={action.href} className={className}>
      {content}
    </Link>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <>
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-5xl items-center gap-4 px-4">
          <Link href="/" className="font-semibold">
            Vocabulary
          </Link>
          <nav className="flex flex-1 items-center gap-1 text-sm">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "rounded-md px-2.5 py-2 text-muted-foreground hover:text-foreground",
                  pathname.startsWith(link.href) &&
                    "bg-muted font-medium text-foreground",
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="hidden items-center gap-2 md:flex">
            {PRIMARY_ACTIONS.map((action, i) => (
              <ActionLink
                key={action.href}
                action={action}
                className={cn(
                  "inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm font-medium",
                  i === 0
                    ? "bg-primary text-primary-foreground"
                    : "border bg-background",
                )}
              />
            ))}
          </div>
        </div>
      </header>

      {/* pb-24 trên mobile: chừa chỗ cho thanh hành động cố định ở đáy. */}
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pt-6 pb-24 md:pb-10">
        {children}
      </main>

      <nav
        aria-label="Hành động chính"
        className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-3 border-t bg-background md:hidden"
      >
        {PRIMARY_ACTIONS.map((action) => (
          <ActionLink
            key={action.href}
            action={action}
            className="flex h-14 flex-col items-center justify-center gap-0.5 text-xs font-medium"
          />
        ))}
      </nav>
    </>
  );
}
