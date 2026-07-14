import Papa from "papaparse";

/* ---------- 増減点連絡書CSVの取込（PapaParse ラッパ） ---------- */
// 方針（個人情報保護）: 指定した列のみを読み、患者氏名・レセプト番号・
// 被保険者記号番号・受給者番号などの個人識別列は読み込まない。
// すべてブラウザ内で処理し、外部送信・保存は行わない。

// 想定列（UTF-8）: 診療年月 / 診療科 / 医師 / 事由 / 区分 / 項目名 / 増減点数
export function parseAssessmentCsv(file) {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (res) => {
        const recs = [];
        for (const row of res.data) {
          const col = (keys) => {
            for (const k of keys) if (row[k] != null && row[k] !== "") return String(row[k]).trim();
            return "";
          };
          const ymV = col(["診療年月", "診療月", "ym"]).replace(/[./]/g, "-").slice(0, 7);
          const deptV = col(["診療科", "科", "dept"]);
          const tenRaw = col(["増減点数", "減点点数", "点数", "ten"]).replace(/[^0-9-]/g, "");
          const tenV = Math.abs(parseInt(tenRaw, 10) || 0);
          if (!deptV || !tenV) continue;
          recs.push({
            ym: ymV || "不明",
            dept: deptV,
            doctor: col(["医師", "医師コード", "担当医", "doctor"]) || "不明",
            reason: (col(["事由", "増減点事由", "reason"]) || "F").charAt(0).toUpperCase(),
            kubun: col(["区分", "診療区分", "kubun"]) || "その他",
            item: col(["項目名", "診療行為", "項目", "item"]) || "不明",
            ten: tenV,
          });
        }
        resolve(recs);
      },
      error: (err) => reject(err),
    });
  });
}

// 累積データの CSV 書き出し（Excel等で開けるよう BOM 付き UTF-8）
export function exportAssessmentCsv(records, filename = "assessment-cumulative.csv") {
  const esc = (v) => {
    const s = String(v);
    return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  const header = ["診療年月", "診療科", "医師", "事由", "区分", "項目名", "増減点数"];
  const lines = [header.join(",")];
  for (const r of records) lines.push([r.ym, r.dept, r.doctor, r.reason, r.kubun, r.item, r.ten].map(esc).join(","));
  const blob = new Blob(["\uFEFF" + lines.join("\r\n")], { type: "text/csv;charset=utf-8;" });
  downloadBlob(blob, filename);
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
