import { Suspense } from "react";
import { AuthForm } from "@/components/auth/auth-form";

export const metadata = { title: "Đăng nhập · Vocabulary" };

export default function LoginPage() {
  return (
    // AuthForm đọc ?next= bằng useSearchParams → phải nằm trong Suspense.
    <Suspense>
      <AuthForm mode="login" />
    </Suspense>
  );
}
