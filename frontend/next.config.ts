import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Không để `next dev` tự sinh AGENTS.md / CLAUDE.md trong frontend/.
  // Chỉ dẫn cho AI của dự án chỉ nằm ở CLAUDE.md gốc và .claude/skills/.
  agentRules: false,
  // Gom server + đúng những dependency cần chạy vào .next/standalone để Docker image nhỏ.
  // Không ảnh hưởng `next dev`.
  output: "standalone",
};

export default nextConfig;
