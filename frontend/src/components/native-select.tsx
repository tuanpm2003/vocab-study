import { cn } from "@/lib/utils";

// <select> gốc của trình duyệt thay vì dropdown tự vẽ: bàn phím và bộ chọn của điện thoại
// hoạt động sẵn — đúng thứ form nhập liệu nhanh cần.
export function NativeSelect({
  className,
  ...props
}: React.ComponentProps<"select">) {
  return (
    <select
      className={cn(
        "h-9 w-full min-w-0 rounded-lg border border-input bg-background px-2 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive md:text-sm",
        className,
      )}
      {...props}
    />
  );
}
