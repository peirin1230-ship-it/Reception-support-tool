import { useState } from "react";
import { FONT } from "./lib/constants.js";
import ErrorSearch from "./features/errors/ErrorSearch.jsx";
import Assessment from "./features/assessment/Assessment.jsx";

/* ================= アプリ ================= */
export default function App() {
  const [tab, setTab] = useState("errors");
  const tabs = [
    { id: "errors", label: "エラーコード検索・一覧" },
    { id: "assess", label: "増減点連絡書 分析" },
  ];
  return (
    <div style={{ fontFamily: FONT }} className="min-h-screen bg-slate-50 text-slate-800">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 pt-4">
          <div className="flex items-baseline justify-between">
            <h1 className="text-base font-semibold text-slate-800">医科・DPC レセプト請求支援ツール</h1>
            <span className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-500">試作版</span>
          </div>
          <p className="mt-0.5 text-xs text-slate-500">医科・DPC対応。受付・事務点検ASPエラーの検索と、増減点連絡書の傾向分析</p>
          <nav className="-mb-px mt-3 flex gap-1">
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`rounded-t-md border-b-2 px-3 py-2 text-sm font-medium transition ${
                  tab === t.id ? "border-teal-600 text-teal-700" : "border-transparent text-slate-500 hover:text-slate-700"
                }`}
              >
                {t.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        {tab === "errors" ? <ErrorSearch /> : <Assessment />}
      </main>

      <footer className="mx-auto max-w-6xl px-4 pb-8 text-xs leading-relaxed text-slate-400">
        エラーコードは支払基金「受付・事務点検ASPに係るチェック一覧」の医科版・DPC版からの抜粋で、各コードに対象（医科／DPC／共通）を付与しています。コード番号は点数表（医科／DPC）で一部異なるため、本試作では共通概念として集約しており、本番では各公式一覧の正式コードでマスタ管理します（医科は約570件、DPCは約930件、いずれも診療報酬改定ごとに更新）。増減点連絡書の分析は初期表示がサンプルデータで、自院のCSV（列：診療年月／診療科／医師／事由／区分／項目名／増減点数、UTF-8）を読み込むと自院の傾向を表示します。アップロードしたデータはブラウザ内でのみ処理され、外部へ送信されません。査定可否の最終判断は担当者が行う前提の、気づきと管理を支援するツールです。
      </footer>
    </div>
  );
}
