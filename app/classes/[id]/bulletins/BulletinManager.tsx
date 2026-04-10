"use client";

import { useState, useCallback, useMemo } from "react";
import { toggleBulletinPrinted, markBulletinsPrinted } from "@/lib/actions";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

type Grade = { id: string; value: number; studentId: string; subjectId: string };
type Student = { id: string; name: string; classId: string; bulletinPrinted: boolean; grades: Grade[] };
type Subject = { id: string; name: string; coefficient: number; classId: string };

function computeAvg(student: Student, subjects: Subject[]) {
  let tw = 0, tc = 0;
  for (const sub of subjects) {
    const g = student.grades.find((gr) => gr.subjectId === sub.id);
    if (g) { tw += g.value * sub.coefficient; tc += sub.coefficient; }
  }
  return tc > 0 ? tw / tc : null;
}

function computeRanks(students: Student[], subjects: Subject[]) {
  const avgs = students.map((s) => ({ id: s.id, avg: computeAvg(s, subjects) }));
  const ranked = avgs.filter((a) => a.avg !== null).sort((a, b) => b.avg! - a.avg!);
  const map: Record<string, number> = {};
  ranked.forEach((r, i) => { map[r.id] = i + 1; });
  return { map, ranked };
}

function buildBulletinHTML(
  student: Student, subjects: Subject[], className: string, totalStudents: number,
  rankMap: Record<string, number>, classAvgBest: number | null, classAvgWorst: number | null, fontSize: number
) {
  const avg = computeAvg(student, subjects);
  const rank = rankMap[student.id] || 0;
  const decision = avg !== null ? (avg >= 10 ? "ADMIS" : "REFUS\u00c9") : null;
  let totalNotes = 0, totalCoef = 0, totalNxC = 0;
  const rows = subjects.map((sub, i) => {
    const g = student.grades.find((gr) => gr.subjectId === sub.id);
    const val = g ? g.value : null;
    const nxc = val !== null ? val * sub.coefficient : null;
    if (val !== null) { totalNotes += val; totalCoef += sub.coefficient; totalNxC += nxc!; }
    return '<tr style="background:' + (i % 2 === 0 ? '#fff' : '#f9f9f9') + '">'
      + '<td style="padding:4px 8px;border:1px solid #999;font-weight:500">' + sub.name + '</td>'
      + '<td style="padding:4px 8px;border:1px solid #999;text-align:center;font-weight:600">' + (val !== null ? val.toFixed(2) : '\u2014') + '</td>'
      + '<td style="padding:4px 8px;border:1px solid #999;text-align:center">' + sub.coefficient + '</td>'
      + '<td style="padding:4px 8px;border:1px solid #999;text-align:center;font-weight:500">' + (nxc !== null ? nxc.toFixed(2) : '\u2014') + '</td>'
      + '</tr>';
  }).join("");

  return '<div class="bulletin" style="page-break-inside:avoid;border:2px solid #333;border-radius:4px;overflow:hidden">'
    + '<div style="border-bottom:2px solid #333;padding:12px 20px;text-align:center">'
    + '<div style="font-size:' + (fontSize + 6) + 'px;font-weight:900;letter-spacing:2px;text-transform:uppercase">Bulletin Scolaire</div>'
    + '<div style="font-size:' + (fontSize - 1) + 'px;color:#555;margin-top:2px">Ann\u00e9e scolaire ' + (new Date().getFullYear() - 1) + '\u2013' + new Date().getFullYear() + '</div>'
    + '</div>'
    + '<div style="display:flex;gap:0;border-bottom:1px solid #999">'
    + '<div style="flex:1;padding:8px 12px;border-right:1px solid #999"><div style="font-size:' + (fontSize - 3) + 'px;font-weight:700;text-transform:uppercase;color:#555">\u00c9l\u00e8ve</div><div style="font-size:' + (fontSize + 1) + 'px;font-weight:700">' + student.name + '</div></div>'
    + '<div style="flex:1;padding:8px 12px;border-right:1px solid #999"><div style="font-size:' + (fontSize - 3) + 'px;font-weight:700;text-transform:uppercase;color:#555">Classe</div><div style="font-size:' + (fontSize + 1) + 'px;font-weight:700">' + className + '</div></div>'
    + '<div style="flex:1;padding:8px 12px"><div style="font-size:' + (fontSize - 3) + 'px;font-weight:700;text-transform:uppercase;color:#555">Effectif</div><div style="font-size:' + (fontSize + 1) + 'px;font-weight:700">' + totalStudents + ' \u00e9l\u00e8ve(s)</div></div>'
    + '</div>'
    + '<div style="padding:8px 12px"><table style="width:100%;border-collapse:collapse;font-size:' + fontSize + 'px">'
    + '<thead><tr style="background:#333;color:#fff">'
    + '<th style="padding:6px 8px;text-align:left;font-weight:600;border:1px solid #333">Mati\u00e8re</th>'
    + '<th style="padding:6px 8px;text-align:center;font-weight:600;border:1px solid #333">Note /20</th>'
    + '<th style="padding:6px 8px;text-align:center;font-weight:600;border:1px solid #333">Coef.</th>'
    + '<th style="padding:6px 8px;text-align:center;font-weight:600;border:1px solid #333">Note \u00d7 Coef.</th>'
    + '</tr></thead>'
    + '<tbody>' + rows + '</tbody>'
    + '<tfoot><tr style="background:#e5e5e5;font-weight:700">'
    + '<td style="padding:6px 8px;border:1px solid #999">TOTAUX</td>'
    + '<td style="padding:6px 8px;border:1px solid #999;text-align:center">' + totalNotes.toFixed(2) + '</td>'
    + '<td style="padding:6px 8px;border:1px solid #999;text-align:center">' + totalCoef + '</td>'
    + '<td style="padding:6px 8px;border:1px solid #999;text-align:center">' + totalNxC.toFixed(2) + '</td>'
    + '</tr></tfoot></table></div>'
    + '<div style="display:flex;border-top:2px solid #333;font-size:' + fontSize + 'px">'
    + '<div style="flex:1;padding:8px;text-align:center;border-right:1px solid #999"><div style="font-size:' + (fontSize - 3) + 'px;font-weight:700;text-transform:uppercase;color:#555">Moyenne</div><div style="font-size:' + (fontSize + 8) + 'px;font-weight:900">' + (avg !== null ? avg.toFixed(2) : '\u2014') + '</div><div style="font-size:' + (fontSize - 3) + 'px;color:#777">/20</div></div>'
    + '<div style="flex:1;padding:8px;text-align:center;border-right:1px solid #999"><div style="font-size:' + (fontSize - 3) + 'px;font-weight:700;text-transform:uppercase;color:#555">Rang</div><div style="font-size:' + (fontSize + 8) + 'px;font-weight:900">' + (rank > 0 ? rank + (rank === 1 ? 'er' : '\u00e8me') : '\u2014') + '</div><div style="font-size:' + (fontSize - 3) + 'px;color:#777">/ ' + totalStudents + '</div></div>'
    + '<div style="flex:1;padding:8px;text-align:center;border-right:1px solid #999"><div style="font-size:' + (fontSize - 3) + 'px;font-weight:700;text-transform:uppercase;color:#555">D\u00e9cision</div><div style="font-size:' + (fontSize + 5) + 'px;font-weight:900;margin-top:4px;' + (decision === 'ADMIS' ? 'text-decoration:underline' : '') + '">' + (decision ?? '\u2014') + '</div></div>'
    + '<div style="flex:1;padding:8px;text-align:center"><div style="font-size:' + (fontSize - 3) + 'px;font-weight:700;text-transform:uppercase;color:#555">Moy. classe</div><div style="font-size:' + (fontSize - 1) + 'px;font-weight:600;margin-top:4px">Max: ' + (classAvgBest !== null ? classAvgBest.toFixed(2) : '\u2014') + '</div><div style="font-size:' + (fontSize - 1) + 'px;font-weight:600;margin-top:2px">Min: ' + (classAvgWorst !== null ? classAvgWorst.toFixed(2) : '\u2014') + '</div></div>'
    + '</div>'
    + '<div style="display:flex;justify-content:space-between;align-items:flex-end;padding:10px 12px;border-top:1px solid #999">'
    + '<div style="font-size:' + (fontSize - 3) + 'px;color:#888">Groupe d\u2019\u00e9tude Les Leaders \u2014 ' + new Date().toLocaleDateString('fr-FR') + '</div>'
    + '<div style="text-align:center"><div style="width:120px;border-bottom:1px solid #555;margin-bottom:3px"></div><div style="font-size:' + (fontSize - 3) + 'px;color:#888">Signature du Directeur</div></div>'
    + '</div></div>';
}

function buildTableauHTML(students: Student[], subjects: Subject[], className: string, rankMap: Record<string, number>, fontSize: number) {
  const rows = students.map((s, i) => {
    const avg = computeAvg(s, subjects);
    const rank = rankMap[s.id] || 0;
    const dec = avg !== null ? (avg >= 10 ? "ADMIS" : "REFUS\u00c9") : "\u2014";
    return '<tr style="background:' + (i % 2 === 0 ? '#fff' : '#f5f5f5') + '">'
      + '<td style="padding:5px 8px;border:1px solid #999;font-weight:500;text-align:left">' + s.name + '</td>'
      + subjects.map((sub) => {
        const g = s.grades.find((gr) => gr.subjectId === sub.id);
        return '<td style="padding:5px 8px;border:1px solid #999;text-align:center">' + (g ? g.value.toFixed(2) : '\u2014') + '</td>';
      }).join("")
      + '<td style="padding:5px 8px;border:1px solid #999;text-align:center;font-weight:800">' + (avg !== null ? avg.toFixed(2) : '\u2014') + '</td>'
      + '<td style="padding:5px 8px;border:1px solid #999;text-align:center;font-weight:600">' + (rank > 0 ? rank + (rank === 1 ? 'er' : '\u00e8me') : '\u2014') + '</td>'
      + '<td style="padding:5px 8px;border:1px solid #999;text-align:center;font-weight:700;' + (dec === 'ADMIS' ? 'text-decoration:underline' : '') + '">' + dec + '</td>'
      + '</tr>';
  }).join("");

  return '<div style="text-align:center;margin-bottom:16px">'
    + '<div style="font-size:' + (fontSize + 6) + 'px;font-weight:900;letter-spacing:2px;text-transform:uppercase;border-bottom:3px double #333;display:inline-block;padding-bottom:4px">Tableau G\u00e9n\u00e9ral des Notes</div>'
    + '<div style="font-size:' + fontSize + 'px;color:#555;margin-top:4px">' + className + ' \u2014 Ann\u00e9e scolaire ' + (new Date().getFullYear() - 1) + '\u2013' + new Date().getFullYear() + '</div>'
    + '</div>'
    + '<table style="width:100%;border-collapse:collapse;font-size:' + fontSize + 'px">'
    + '<thead><tr style="background:#333;color:#fff">'
    + '<th style="padding:6px 8px;text-align:left;border:1px solid #333">\u00c9l\u00e8ve</th>'
    + subjects.map((s) => '<th style="padding:6px 8px;text-align:center;border:1px solid #333">' + s.name + '<br><span style="font-weight:400;font-size:' + (fontSize - 2) + 'px">Coef. ' + s.coefficient + '</span></th>').join("")
    + '<th style="padding:6px 8px;text-align:center;border:1px solid #333">Moyenne</th>'
    + '<th style="padding:6px 8px;text-align:center;border:1px solid #333">Rang</th>'
    + '<th style="padding:6px 8px;text-align:center;border:1px solid #333">D\u00e9cision</th>'
    + '</tr></thead>'
    + '<tbody>' + rows + '</tbody></table>'
    + '<div style="text-align:right;font-size:' + (fontSize - 2) + 'px;color:#888;margin-top:12px">Groupe d\u2019\u00e9tude Les Leaders \u2014 ' + new Date().toLocaleDateString('fr-FR') + '</div>';
}

export function BulletinManager({ classId, className, students, subjects }: { classId: string; className: string; students: Student[]; subjects: Subject[] }) {
  const [tab, setTab] = useState<"bulletins" | "tableau">("bulletins");
  const [selected, setSelected] = useState<string[]>([]);
  const [orientation, setOrientation] = useState<"portrait" | "landscape">("portrait");
  const [fontSize, setFontSize] = useState(11);
  const [showPreview, setShowPreview] = useState(false);
  const [printStatuses, setPrintStatuses] = useState<Record<string, boolean>>(Object.fromEntries(students.map((s) => [s.id, s.bulletinPrinted])));
  const [toast, setToast] = useState<string | null>(null);

  const { map: rankMap, ranked } = computeRanks(students, subjects);
  const classAvgBest = ranked.length > 0 ? ranked[0].avg : null;
  const classAvgWorst = ranked.length > 0 ? ranked[ranked.length - 1].avg : null;

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 2) return prev;
      return [...prev, id];
    });
  };

  const handleTogglePrinted = useCallback(async (studentId: string) => {
    const newVal = !printStatuses[studentId];
    setPrintStatuses((p) => ({ ...p, [studentId]: newVal }));
    await toggleBulletinPrinted(studentId, classId, newVal);
  }, [printStatuses, classId]);

  const showToastMsg = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 2500); };

  const previewHTML = useMemo(() => {
    if (tab === "tableau") return buildTableauHTML(students, subjects, className, rankMap, fontSize);
    const sel = students.filter((s) => selected.includes(s.id));
    if (sel.length === 0) return null;
    const buls = sel.map((s) => buildBulletinHTML(s, subjects, className, students.length, rankMap, classAvgBest, classAvgWorst, fontSize));
    if (sel.length === 2 && orientation === "landscape") {
      return '<div style="display:flex;gap:2%;justify-content:center">' + buls.map((b) => '<div style="width:49%">' + b + '</div>').join("") + '</div>';
    }
    return buls.join('<div style="height:20px"></div>');
  }, [tab, students, subjects, className, rankMap, classAvgBest, classAvgWorst, fontSize, selected, orientation]);

  const handlePrint = useCallback(() => {
    let html: string;
    if (tab === "tableau") {
      html = buildTableauHTML(students, subjects, className, rankMap, fontSize);
    } else {
      if (selected.length === 0) return;
      const sel = students.filter((s) => selected.includes(s.id));
      const buls = sel.map((s) => buildBulletinHTML(s, subjects, className, students.length, rankMap, classAvgBest, classAvgWorst, fontSize));
      if (sel.length === 2 && orientation === "landscape") {
        html = '<div style="display:flex;gap:2%;justify-content:center">' + buls.map((b) => '<div style="width:49%">' + b + '</div>').join("") + '</div>';
      } else {
        html = buls.join('<div style="page-break-before:always"></div>');
      }
    }
    const isL = orientation === "landscape";
    const css = '* { box-sizing:border-box; margin:0; padding:0; } body { font-family: Segoe UI, Arial, sans-serif; font-size:' + fontSize + 'px; color:#000; } @page { size:' + (isL ? 'landscape' : 'A4') + '; margin:10mm; }';
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write('<!DOCTYPE html><html><head><meta charset="utf-8"><title>' + (tab === "tableau" ? "Tableau" : "Bulletins") + '</title><style>' + css + '</style></head><body>' + html + '</body></html>');
    win.document.close();
    setTimeout(() => {
      win.print();
      if (tab === "bulletins" && selected.length > 0) {
        markBulletinsPrinted(selected, classId).then(() => {
          setPrintStatuses((p) => { const c = { ...p }; for (const id of selected) c[id] = true; return c; });
          showToastMsg("Bulletins marqu\u00e9s comme imprim\u00e9s \u2713");
        });
      }
    }, 400);
  }, [tab, selected, orientation, fontSize, students, subjects, rankMap, classAvgBest, classAvgWorst, classId, className]);

  const handleDownloadPDF = useCallback(() => {
    if (tab === "tableau") {
      const isL = orientation === "landscape";
      const doc = new jsPDF({ orientation: isL ? "landscape" : "portrait" });
      const pw = isL ? 297 : 210;
      doc.setFontSize(16); doc.setFont("helvetica", "bold"); doc.text("TABLEAU G\u00c9N\u00c9RAL DES NOTES", pw / 2, 16, { align: "center" });
      doc.setFontSize(10); doc.setFont("helvetica", "normal"); doc.text(className + " \u2014 Ann\u00e9e scolaire " + (new Date().getFullYear() - 1) + "\u2013" + new Date().getFullYear(), pw / 2, 23, { align: "center" });
      const head = [["\u00c9l\u00e8ve", ...subjects.map((s) => s.name + " (" + s.coefficient + ")"), "Moyenne", "Rang", "D\u00e9cision"]];
      const body = students.map((s) => {
        const avg = computeAvg(s, subjects); const rank = rankMap[s.id] || 0;
        const dec = avg !== null ? (avg >= 10 ? "ADMIS" : "REFUS\u00c9") : "\u2014";
        return [s.name, ...subjects.map((sub) => { const g = s.grades.find((gr) => gr.subjectId === sub.id); return g ? g.value.toFixed(2) : "\u2014"; }), avg !== null ? avg.toFixed(2) : "\u2014", rank > 0 ? rank + (rank === 1 ? "er" : "\u00e8me") + "/" + students.length : "\u2014", dec];
      });
      autoTable(doc, { startY: 28, head, body, theme: "grid", headStyles: { fillColor: [51, 51, 51], textColor: 255, fontStyle: "bold", halign: "center", fontSize: 7 }, styles: { fontSize: 7, cellPadding: 3, textColor: [0, 0, 0], lineColor: [153, 153, 153] }, columnStyles: { 0: { halign: "left" } }, alternateRowStyles: { fillColor: [245, 245, 245] } });
      doc.setFontSize(8); doc.setTextColor(150); doc.text("Groupe d'\u00e9tude Les Leaders \u2014 " + new Date().toLocaleDateString("fr-FR"), 14, (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10);
      doc.save("tableau_general_" + className.replace(/\s+/g, "_") + ".pdf");
    } else {
      if (selected.length === 0) return;
      const sel = students.filter((s) => selected.includes(s.id));
      const isL = orientation === "landscape";
      const doc = new jsPDF({ orientation: isL ? "landscape" : "portrait" });
      const pw = isL ? 297 : 210;
      sel.forEach((student, idx) => {
        if (idx > 0) doc.addPage();
        const avg = computeAvg(student, subjects); const rank = rankMap[student.id] || 0;
        const decision = avg !== null ? (avg >= 10 ? "ADMIS" : "REFUS\u00c9") : null;
        doc.setDrawColor(51); doc.setLineWidth(0.8); doc.rect(14, 10, pw - 28, 24);
        doc.setFontSize(18); doc.setFont("helvetica", "bold"); doc.setTextColor(0);
        doc.text("BULLETIN SCOLAIRE", pw / 2, 22, { align: "center" });
        doc.setFontSize(9); doc.setFont("helvetica", "normal"); doc.setTextColor(100);
        doc.text("Ann\u00e9e scolaire " + (new Date().getFullYear() - 1) + "\u2013" + new Date().getFullYear(), pw / 2, 30, { align: "center" });
        const iy = 40; doc.setDrawColor(150); doc.setLineWidth(0.3); doc.rect(14, iy, pw - 28, 16);
        const tw = (pw - 28) / 3; doc.line(14 + tw, iy, 14 + tw, iy + 16); doc.line(14 + tw * 2, iy, 14 + tw * 2, iy + 16);
        doc.setFontSize(7); doc.setTextColor(100); doc.setFont("helvetica", "bold");
        doc.text("\u00c9L\u00c8VE", 18, iy + 5); doc.text("CLASSE", 18 + tw, iy + 5); doc.text("EFFECTIF", 18 + tw * 2, iy + 5);
        doc.setFontSize(11); doc.setTextColor(0);
        doc.text(student.name, 18, iy + 13); doc.text(className, 18 + tw, iy + 13); doc.text(students.length + " \u00e9l\u00e8ve(s)", 18 + tw * 2, iy + 13);
        let tN = 0, tC = 0, tNxC = 0;
        const td = subjects.map((sub) => { const g = student.grades.find((gr) => gr.subjectId === sub.id); const v = g ? g.value : null; const n = v !== null ? v * sub.coefficient : null; if (v !== null) { tN += v; tC += sub.coefficient; tNxC += n!; } return [sub.name, v !== null ? v.toFixed(2) : "\u2014", sub.coefficient.toString(), n !== null ? n.toFixed(2) : "\u2014"]; });
        autoTable(doc, { startY: iy + 22, head: [["Mati\u00e8re", "Note /20", "Coef.", "Note \u00d7 Coef."]], body: td, foot: [["TOTAUX", tN.toFixed(2), tC.toString(), tNxC.toFixed(2)]], theme: "grid", headStyles: { fillColor: [51, 51, 51], textColor: 255, fontStyle: "bold", halign: "center", fontSize: 9 }, footStyles: { fillColor: [230, 230, 230], textColor: [0, 0, 0], fontStyle: "bold", halign: "center", fontSize: 9 }, styles: { fontSize: 9, cellPadding: 3.5, textColor: [0, 0, 0], lineColor: [153, 153, 153] }, columnStyles: { 0: { halign: "left", cellWidth: 60 }, 1: { halign: "center" }, 2: { halign: "center" }, 3: { halign: "center" } }, alternateRowStyles: { fillColor: [249, 249, 249] } });
        const tey = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6;
        const cw = (pw - 28 - 9) / 4; const ch = 24;
        for (let c = 0; c < 4; c++) {
          const x = 14 + c * (cw + 3); doc.setDrawColor(51); doc.setLineWidth(0.5); doc.rect(x, tey, cw, ch);
          doc.setFontSize(7); doc.setTextColor(100); doc.setFont("helvetica", "bold");
          doc.text(["MOYENNE", "RANG", "D\u00c9CISION", "MOY. CLASSE"][c], x + cw / 2, tey + 6, { align: "center" });
          doc.setTextColor(0);
          if (c === 0) { doc.setFontSize(16); doc.text(avg !== null ? avg.toFixed(2) : "\u2014", x + cw / 2, tey + 16, { align: "center" }); doc.setFontSize(7); doc.setTextColor(100); doc.text("/20", x + cw / 2, tey + 21, { align: "center" }); }
          else if (c === 1) { doc.setFontSize(16); doc.text(rank > 0 ? rank + (rank === 1 ? "er" : "\u00e8me") : "\u2014", x + cw / 2, tey + 16, { align: "center" }); doc.setFontSize(7); doc.setTextColor(100); doc.text("/ " + students.length, x + cw / 2, tey + 21, { align: "center" }); }
          else if (c === 2) { doc.setFontSize(14); doc.text(decision ?? "\u2014", x + cw / 2, tey + 17, { align: "center" }); }
          else { doc.setFontSize(9); doc.text("Max: " + (classAvgBest !== null ? classAvgBest.toFixed(2) : "\u2014"), x + cw / 2, tey + 14, { align: "center" }); doc.text("Min: " + (classAvgWorst !== null ? classAvgWorst.toFixed(2) : "\u2014"), x + cw / 2, tey + 21, { align: "center" }); }
        }
        const fy = tey + ch + 16; doc.setDrawColor(200); doc.line(14, fy, pw - 14, fy);
        doc.setFontSize(8); doc.setTextColor(150); doc.setFont("helvetica", "normal");
        doc.text("Groupe d'\u00e9tude Les Leaders \u2014 " + new Date().toLocaleDateString("fr-FR"), 14, fy + 8);
        doc.setDrawColor(150); doc.line(pw - 70, fy + 22, pw - 14, fy + 22);
        doc.setFontSize(8); doc.setTextColor(120); doc.text("Signature du Directeur", pw - 42, fy + 28, { align: "center" });
      });
      doc.save("bulletins_" + className.replace(/\s+/g, "_") + ".pdf");
    }
  }, [tab, selected, orientation, students, subjects, rankMap, classAvgBest, classAvgWorst, className]);

  const printedCount = Object.values(printStatuses).filter(Boolean).length;
  const canAct = tab === "tableau" || selected.length > 0;

  return (
    <div className="space-y-5">
      {toast && (<div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-5 py-3 bg-green-600 text-white font-medium rounded-xl shadow-lg animate-bounce">{"\u2713"} {toast}</div>)}

      <div className="flex rounded-xl overflow-hidden border border-gray-200 bg-white shadow-sm">
        <button onClick={() => { setTab("bulletins"); setShowPreview(false); }} className={"flex-1 px-6 py-3.5 text-sm font-semibold transition cursor-pointer " + (tab === "bulletins" ? "bg-gray-900 text-white" : "bg-white text-gray-600 hover:bg-gray-50")}>
          {"\uD83C\uDF93"} Bulletins individuels
        </button>
        <button onClick={() => { setTab("tableau"); setShowPreview(false); }} className={"flex-1 px-6 py-3.5 text-sm font-semibold transition cursor-pointer " + (tab === "tableau" ? "bg-gray-900 text-white" : "bg-white text-gray-600 hover:bg-gray-50")}>
          {"\uD83D\uDCCA"} Tableau G{"é"}n{"é"}ral des Notes
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
        <div className="flex flex-wrap items-center gap-5">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Orientation</label>
            <div className="flex rounded-lg overflow-hidden border border-gray-300">
              <button onClick={() => setOrientation("portrait")} className={"px-4 py-2 text-sm font-medium transition cursor-pointer " + (orientation === "portrait" ? "bg-gray-900 text-white" : "bg-white text-gray-600 hover:bg-gray-50")}>Portrait</button>
              <button onClick={() => setOrientation("landscape")} className={"px-4 py-2 text-sm font-medium transition cursor-pointer " + (orientation === "landscape" ? "bg-gray-900 text-white" : "bg-white text-gray-600 hover:bg-gray-50")}>Paysage</button>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Taille</label>
            <div className="flex items-center gap-2">
              <button onClick={() => setFontSize((s) => Math.max(7, s - 1))} className="w-8 h-8 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-100 cursor-pointer font-bold">{"\u2212"}</button>
              <span className="w-10 text-center font-semibold text-gray-700">{fontSize}px</span>
              <button onClick={() => setFontSize((s) => Math.min(16, s + 1))} className="w-8 h-8 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-100 cursor-pointer font-bold">+</button>
            </div>
          </div>
          {tab === "bulletins" && (
            <div className="flex items-center gap-4">
              <div className="text-sm text-gray-500"><span className="font-bold text-gray-800">{selected.length}</span>/2 sélectionné(s)</div>
              <div className="text-sm text-gray-500"><span className="font-bold text-green-600">{printedCount}</span>/{students.length} imprimé(s)</div>
            </div>
          )}
          <div className="ml-auto flex items-center gap-3">
            <button onClick={() => setShowPreview((p) => !p)} disabled={!canAct} className={"px-5 py-2.5 font-semibold rounded-xl border-2 transition cursor-pointer text-sm " + (canAct ? (showPreview ? "border-gray-900 bg-gray-900 text-white" : "border-gray-300 bg-white text-gray-700 hover:border-gray-400") : "border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed")}>
              {"\uD83D\uDC41\uFE0F"} Aperçu
            </button>
            <button onClick={handleDownloadPDF} disabled={!canAct} className={"px-5 py-2.5 font-semibold rounded-xl transition cursor-pointer text-sm " + (canAct ? "bg-gray-700 text-white hover:bg-gray-800" : "bg-gray-200 text-gray-400 cursor-not-allowed")}>
              {"\uD83D\uDCE5"} PDF
            </button>
            <button onClick={handlePrint} disabled={!canAct} className={"px-5 py-2.5 font-semibold rounded-xl transition cursor-pointer text-sm " + (canAct ? "bg-gray-900 text-white hover:bg-black" : "bg-gray-200 text-gray-400 cursor-not-allowed")}>
              {"\uD83D\uDDA8\uFE0F"} Imprimer
            </button>
          </div>
        </div>
      </div>

      {showPreview && previewHTML && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 overflow-auto">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-gray-700">Aperçu avant impression (noir & blanc)</h3>
            <button onClick={() => setShowPreview(false)} className="text-gray-400 hover:text-gray-600 cursor-pointer text-xl">{"\u2715"}</button>
          </div>
          <div className="border border-gray-300 rounded-lg p-6 bg-white" style={{ fontFamily: "'Segoe UI', Arial, sans-serif", fontSize: fontSize + "px", color: "#000" }} dangerouslySetInnerHTML={{ __html: previewHTML }} />
        </div>
      )}

      {tab === "bulletins" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {students.map((student) => {
            const avg = computeAvg(student, subjects);
            const rank = rankMap[student.id] || 0;
            const decision = avg !== null ? (avg >= 10 ? "ADMIS" : "REFUSÉ") : null;
            const isSelected = selected.includes(student.id);
            const isPrinted = printStatuses[student.id];
            return (
              <div key={student.id} onClick={() => toggleSelect(student.id)} className={"relative rounded-xl border-2 p-4 cursor-pointer transition-all duration-200 " + (isSelected ? "border-gray-900 bg-gray-50 shadow-lg ring-2 ring-gray-300 scale-[1.02]" : "border-gray-200 bg-white hover:border-gray-400 hover:shadow-md")}>
                {isSelected && (<div className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-gray-900 text-white flex items-center justify-center text-xs font-bold shadow">{selected.indexOf(student.id) + 1}</div>)}
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-gray-800 text-base truncate pr-2">{student.name}</h3>
                  <button onClick={(e) => { e.stopPropagation(); handleTogglePrinted(student.id); }} title={isPrinted ? "Marquer comme non imprimé" : "Marquer comme imprimé"} className={"flex-shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold transition cursor-pointer " + (isPrinted ? "bg-green-100 text-green-700 hover:bg-green-200" : "bg-gray-100 text-gray-500 hover:bg-gray-200")}>
                    {isPrinted ? "✅ Imprimé" : "⬜ Non imprimé"}
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-gray-50 rounded-lg p-2 border border-gray-100">
                    <div className="text-[10px] text-gray-400 font-semibold uppercase">Moy.</div>
                    <div className="text-lg font-bold text-gray-800">{avg !== null ? avg.toFixed(1) : "—"}</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-2 border border-gray-100">
                    <div className="text-[10px] text-gray-400 font-semibold uppercase">Rang</div>
                    <div className="text-lg font-bold text-gray-800">{rank > 0 ? `${rank}${rank === 1 ? "er" : "e"}` : "—"}</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-2 border border-gray-100">
                    <div className="text-[10px] text-gray-400 font-semibold uppercase">Décision</div>
                    <div className={"text-sm font-bold mt-0.5 " + (decision === "ADMIS" ? "underline" : "")}>{decision ?? "—"}</div>
                  </div>
                </div>
                <div className="mt-2 text-xs text-gray-400 text-center">{student.grades.length}/{subjects.length} matière(s) notée(s)</div>
              </div>
            );
          })}
        </div>
      )}

      {tab === "tableau" && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 overflow-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-gray-900 text-white">
                <th className="py-2.5 px-3 text-left font-semibold border border-gray-700">Élève</th>
                {subjects.map((s) => (<th key={s.id} className="py-2.5 px-2 text-center font-semibold border border-gray-700"><div>{s.name}</div><div className="text-xs font-normal opacity-70">Coef. {s.coefficient}</div></th>))}
                <th className="py-2.5 px-2 text-center font-semibold border border-gray-700">Moy.</th>
                <th className="py-2.5 px-2 text-center font-semibold border border-gray-700">Rang</th>
                <th className="py-2.5 px-2 text-center font-semibold border border-gray-700">Décision</th>
              </tr>
            </thead>
            <tbody>
              {students.map((s, i) => {
                const avg = computeAvg(s, subjects);
                const rank = rankMap[s.id] || 0;
                const dec = avg !== null ? (avg >= 10 ? "ADMIS" : "REFUSÉ") : "—";
                return (
                  <tr key={s.id} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                    <td className="py-2 px-3 font-medium text-gray-800 border border-gray-200">{s.name}</td>
                    {subjects.map((sub) => { const g = s.grades.find((gr) => gr.subjectId === sub.id); return <td key={sub.id} className="py-2 px-2 text-center border border-gray-200">{g ? g.value.toFixed(2) : "—"}</td>; })}
                    <td className="py-2 px-2 text-center font-bold border border-gray-200">{avg !== null ? avg.toFixed(2) : "—"}</td>
                    <td className="py-2 px-2 text-center font-semibold border border-gray-200">{rank > 0 ? `${rank}${rank === 1 ? "er" : "ème"}` : "—"}</td>
                    <td className={"py-2 px-2 text-center font-bold border border-gray-200 " + (dec === "ADMIS" ? "underline" : "")}>{dec}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {students.length === 0 && (<div className="text-center py-12 text-gray-400">Aucun élève dans cette classe.</div>)}
    </div>
  );
}
