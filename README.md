# 医科・DPC レセプト請求支援ツール

医事課向けの静的Webアプリです。以下の2機能を提供します。

1. **エラーコード検索・一覧** — 受付・事務点検ASP結果に出るエラーコード（例 `L4428`）を検索・絞り込みし、区分（L1〜L4／L48／L7）・対応区分（再請求要否）・対象点数表（医科／DPC）・原因・対応の目安を表示します。
2. **増減点連絡書 分析** — 審査結果（減点）の傾向を、診療科別・医師別・事由別（A〜F）・区分別・月次推移で可視化します。自院CSVの読み込みに対応します。

> ⚠️ このツールは**気づきと管理を支援**するものです。査定可否・算定可否の**最終判断は担当者（人）**が行うことを前提としています。

## 個人情報・セキュリティ

- アプリが配信するのは**コード（HTML/JS/CSS）だけ**で、読み込んだデータは**すべてブラウザ内で処理**され、サーバーへ送信・保存されません。ページを閉じれば消えます。
- **実データCSV・累積ファイルはリポジトリに絶対にコミットしない**（`.gitignore` で `*.csv` / `*.xlsx` / `assessment-cumulative*.json` を除外）。
- 増減点分析の入力は**非識別化・集計済み**を前提とし、取込は指定列のみ読み込みます。患者氏名・レセプト番号・被保険者記号番号などの個人識別情報は扱いません。医師名は可能な限りコード化を推奨します。
- 詳細は `CLAUDE.md`（設計・引継ぎ資料）の「6. 個人情報・セキュリティ」を参照してください。

## 技術構成

Vite + React 18 + Tailwind CSS + Recharts + PapaParse（lucide-react）。Node は 20 系を想定。

エラーコードマスタは `public/data/error-codes.json` に分離しており、実行時に `fetch` で読み込みます。改定対応はこのJSONの差し替えで完結します（マスタは公開情報でPIIなし）。

## 開発

```bash
npm install     # 依存関係のインストール
npm run dev     # 開発サーバ（http://localhost:5173）
npm run build   # 本番ビルド（dist/ に出力）
npm run preview # ビルド結果のローカル確認
```

## デプロイ（GitHub Pages）

`main` ブランチへの push で、`.github/workflows/deploy.yml`（GitHub Actions）が自動でビルドし GitHub Pages に公開します。

- リポジトリの **Settings → Pages → Source** が **GitHub Actions** であること（ワークフローの `configure-pages` で自動有効化を試みます）。
- `vite.config.js` の `base` は相対パス（`"./"`）としており、プロジェクトサイト（`https://<user>.github.io/<repo>/`）配下でも資産・データを正しく解決します。

## ディレクトリ構成

```
├─ .github/workflows/deploy.yml     # GitHub Pages 自動デプロイ
├─ public/data/error-codes.json     # エラーコードマスタ（fetchで読込・PIIなし）
├─ src/
│  ├─ main.jsx / App.jsx / index.css
│  ├─ features/
│  │  ├─ errors/ErrorSearch.jsx     # 機能① エラーコード検索・一覧
│  │  └─ assessment/Assessment.jsx  # 機能② 増減点連絡書 分析
│  ├─ lib/                          # levels / reasons / sample / csv / utils / constants
│  └─ components/                   # LevelBadge / Kpi / Panel
├─ vite.config.js / tailwind.config.js / postcss.config.js
├─ CLAUDE.md                        # 設計・引継ぎ資料
└─ README.md
```

## マスタ更新（診療報酬改定）

改定・版更新のたびに、支払基金の医科版・DPC版チェック一覧から `public/data/error-codes.json` を再生成します。`level` / `must`（●）/ `targets` / `cat` の付与を必ず見直してください。詳細は `CLAUDE.md` の「8. マスタ更新の運用」を参照。
