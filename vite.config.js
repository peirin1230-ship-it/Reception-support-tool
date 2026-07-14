import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// GitHub Pages のプロジェクトサイト（https://<user>.github.io/<repo>/）配下でも
// 資産・データを正しく解決できるよう、相対パス（"./"）を base にする。
// これによりリポジトリ名（大文字/小文字を含む）に依存せず動作する。
export default defineConfig({
  plugins: [react()],
  base: "./",
});
