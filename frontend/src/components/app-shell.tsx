"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  GraduationCap,
  LogOut,
  Plus,
  RotateCcw,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
import { AuthGate } from "@/components/auth/auth-gate";
import { Button } from "@/components/ui/button";
import { authApi } from "@/lib/api";
import { isPublicPath } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { clearContext } from "@/lib/vocabulary-context";
import type { User } from "@/types/api";

interface PrimaryAction {
  href: string;
  label: string;
  icon: LucideIcon;
}

// Ba hành động quan trọng nhất của app (CLAUDE.md §1): luôn tới được trong một lần bấm.
const PRIMARY_ACTIONS: PrimaryAction[] = [
  { href: "/vocabulary/new", label: "Thêm từ", icon: Plus },
  { href: "/study", label: "Học", icon: GraduationCap },
  { href: "/study/session?source=due", label: "Ôn tập", icon: RotateCcw },
];

const NAV_LINKS = [
  { href: "/languages", label: "Ngôn ngữ" },
  { href: "/vocabulary", label: "Từ vựng" },
];

function ActionLink({
  action,
  className,
}: {
  action: PrimaryAction;
  className?: string;
}) {
  const Icon = action.icon;
  return (
    <Link href={action.href} className={className}>
      <Icon className="size-4 shrink-0" aria-hidden />
      <span>{action.label}</span>
    </Link>
  );
}

function Brand() {
  return (
    <Link
      href="/"
      className="rounded-md px-1 font-semibold transition-colors hover:text-muted-foreground"
    >
      Vocabulary
    </Link>
  );
}

function UserMenu({ user }: { user: User }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const logout = useMutation({
    mutationFn: authApi.logout,
    onSuccess: () => {
      // Xóa mọi dữ liệu đang nhớ trong trình duyệt: người đăng nhập kế tiếp trên máy này
      // không được thấy thoáng qua từ vựng của người trước.
      queryClient.clear();
      clearContext();
      router.replace("/login");
    },
    onError: (error) => toast.error(error.message),
  });
  const name = user.displayName || user.email;

  return (
    <div className="flex min-w-0 items-center gap-1">
      <span
        className="hidden max-w-40 truncate text-sm text-muted-foreground lg:inline"
        title={user.email}
      >
        {name}
      </span>
      <Button
        variant="ghost"
        size="icon-lg"
        aria-label={`Đăng xuất (${name})`}
        title={`Đăng xuất — ${name}`}
        disabled={logout.isPending}
        onClick={() => logout.mutate()}
      >
        <LogOut aria-hidden />
      </Button>
    </div>
  );
}

/** Trang đăng nhập/đăng ký: chỉ có tên app, không có điều hướng tới những trang chưa vào được. */
function PublicShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header className="border-b">
        <div className="mx-auto flex h-14 w-full max-w-5xl items-center px-4">
          <span className="font-semibold">Vocabulary</span>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pt-6 pb-10">
        {children}
      </main>
    </>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  if (isPublicPath(pathname)) return <PublicShell>{children}</PublicShell>;

  return (
    <AuthGate>
      {(user) => (
        <>
          <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
            <div className="mx-auto flex h-14 w-full max-w-5xl items-center gap-2 px-4 sm:gap-4">
              <Brand />
              <nav className="flex flex-1 items-center gap-1 text-sm">
                {NAV_LINKS.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={cn(
                      "rounded-md px-2.5 py-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
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
                      "pressable inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm font-medium",
                      // Nền gần đen: làm tối thêm không nhìn ra, nên hover phải làm SÁNG lên.
                      i === 0
                        ? "bg-primary text-primary-foreground hover:bg-primary/80"
                        : "border bg-background hover:bg-muted",
                    )}
                  />
                ))}
              </div>
              <UserMenu user={user} />
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
                className="flex h-14 flex-col items-center justify-center gap-0.5 text-xs font-medium transition-colors hover:bg-muted active:bg-muted"
              />
            ))}
          </nav>
        </>
      )}
    </AuthGate>
  );
}
