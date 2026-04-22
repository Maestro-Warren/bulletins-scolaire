"use client";

import { useState, useCallback, useMemo } from "react";
import html2canvas from "html2canvas";
import { toggleBulletinPrinted, markBulletinsPrinted } from "@/lib/actions";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  buildLogoImageHtml,
  getLogoPngDataUrl,
  SCHOOL_NAME,
} from "@/lib/reportBranding";

type Grade = { id: string; value: number; studentId: string; subjectId: string };
type Student = { id: string; name: string; classId: string; bulletinPrinted: boolean; grades: Grade[] };
type Subject = { id: string; name: string; coefficient: number; classId: string };
type TableauMode = "filled" | "blank";
type PageOrientation = "portrait" | "landscape";

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

function sanitizeFileName(value: string) {
  return value.trim().replace(/\s+/g, "_");
}

function buildHeaderLogoBlockHTML(logoMarkup: string) {
  return '<div style="flex-shrink:0">' + logoMarkup + '</div>';
}

function buildBulletinHTML(
  student: Student, subjects: Subject[], className: string, totalStudents: number,
  rankMap: Record<string, number>, classAvgBest: number | null, classAvgWorst: number | null, fontSize: number,
  headerLogoMarkup: string
) {
  const schoolYear = `${new Date().getFullYear() - 1}–${new Date().getFullYear()}`;
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

  return '<div class="bulletin" style="page-break-inside:avoid;background:#ffffff;">'
    + '<div style="border:1.5px solid #555;border-radius:8px;padding:18px 18px 14px;background:#ffffff">'
    + '<div style="padding:0 0 12px;border-bottom:1px solid #999">'
    + '<div style="display:flex;align-items:center;justify-content:center;gap:14px;text-align:center">'
    + buildHeaderLogoBlockHTML(headerLogoMarkup)
    + '<div>'
    + '<div style="font-size:' + (fontSize - 2) + 'px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#000">' + SCHOOL_NAME + '</div>'
    + '<div style="font-size:' + (fontSize + 6) + 'px;font-weight:900;letter-spacing:1px;text-transform:uppercase;color:#000">Bulletin Scolaire</div>'
    + '<div style="font-size:' + (fontSize - 1) + 'px;color:#000;margin-top:2px">Ann\u00e9e scolaire ' + schoolYear + '</div>'
    + '</div>'
    + '</div>'
    + '</div>'
    + '<div style="display:flex;gap:0;margin:12px 0;border:1px solid #999;border-radius:6px;overflow:hidden">'
    + '<div style="flex:1;padding:8px 10px;border-right:1px solid #999"><div style="font-size:' + (fontSize - 3) + 'px;font-weight:700;text-transform:uppercase;color:#000">\u00c9l\u00e8ve</div><div style="font-size:' + (fontSize + 1) + 'px;font-weight:700;color:#000">' + student.name + '</div></div>'
    + '<div style="flex:1;padding:8px 10px;border-right:1px solid #999"><div style="font-size:' + (fontSize - 3) + 'px;font-weight:700;text-transform:uppercase;color:#000">Classe</div><div style="font-size:' + (fontSize + 1) + 'px;font-weight:700;color:#000">' + className + '</div></div>'
    + '<div style="flex:1;padding:8px 10px"><div style="font-size:' + (fontSize - 3) + 'px;font-weight:700;text-transform:uppercase;color:#000">Effectif</div><div style="font-size:' + (fontSize + 1) + 'px;font-weight:700;color:#000">' + totalStudents + ' \u00e9l\u00e8ve(s)</div></div>'
    + '</div>'
    + '<div><table style="width:100%;border-collapse:collapse;font-size:' + fontSize + 'px">'
    + '<thead><tr style="background:#ffffff;color:#000">'
    + '<th style="padding:6px 8px;text-align:left;font-weight:700;border:1px solid #666">Mati\u00e8re</th>'
    + '<th style="padding:6px 8px;text-align:center;font-weight:700;border:1px solid #666">Note /20</th>'
    + '<th style="padding:6px 8px;text-align:center;font-weight:700;border:1px solid #666">Coef.</th>'
    + '<th style="padding:6px 8px;text-align:center;font-weight:700;border:1px solid #666">Note \u00d7 Coef.</th>'
    + '</tr></thead>'
    + '<tbody>' + rows + '</tbody>'
    + '<tfoot><tr style="background:#ffffff;font-weight:700;color:#000">'
    + '<td style="padding:6px 8px;border:1px solid #666">TOTAUX</td>'
    + '<td style="padding:6px 8px;border:1px solid #666;text-align:center">' + totalNotes.toFixed(2) + '</td>'
    + '<td style="padding:6px 8px;border:1px solid #666;text-align:center">' + totalCoef + '</td>'
    + '<td style="padding:6px 8px;border:1px solid #666;text-align:center">' + totalNxC.toFixed(2) + '</td>'
    + '</tr></tfoot></table></div>'
    + '<div style="display:flex;gap:0;font-size:' + fontSize + 'px;margin-top:12px;border:1px solid #999;border-radius:6px;overflow:hidden">'
    + '<div style="flex:1;padding:8px 6px;text-align:center;border-right:1px solid #999"><div style="font-size:' + (fontSize - 3) + 'px;font-weight:700;text-transform:uppercase;color:#000">Moyenne</div><div style="font-size:' + (fontSize + 8) + 'px;font-weight:900;color:#000">' + (avg !== null ? avg.toFixed(2) : '\u2014') + '</div><div style="font-size:' + (fontSize - 3) + 'px;color:#000">/20</div></div>'
    + '<div style="flex:1;padding:8px 6px;text-align:center;border-right:1px solid #999"><div style="font-size:' + (fontSize - 3) + 'px;font-weight:700;text-transform:uppercase;color:#000">Rang</div><div style="font-size:' + (fontSize + 8) + 'px;font-weight:900;color:#000">' + (rank > 0 ? rank + (rank === 1 ? 'er' : '\u00e8me') : '\u2014') + '</div><div style="font-size:' + (fontSize - 3) + 'px;color:#000">/ ' + totalStudents + '</div></div>'
    + '<div style="flex:1;padding:8px 6px;text-align:center;border-right:1px solid #999"><div style="font-size:' + (fontSize - 3) + 'px;font-weight:700;text-transform:uppercase;color:#000">D\u00e9cision</div><div style="font-size:' + (fontSize + 5) + 'px;font-weight:900;color:#000;margin-top:4px;' + (decision === 'ADMIS' ? 'text-decoration:underline' : '') + '">' + (decision ?? '\u2014') + '</div></div>'
    + '<div style="flex:1;padding:8px 6px;text-align:center"><div style="font-size:' + (fontSize - 3) + 'px;font-weight:700;text-transform:uppercase;color:#000">Moy. classe</div><div style="font-size:' + (fontSize - 1) + 'px;font-weight:600;color:#000;margin-top:4px">Max: ' + (classAvgBest !== null ? classAvgBest.toFixed(2) : '\u2014') + '</div><div style="font-size:' + (fontSize - 1) + 'px;font-weight:600;color:#000;margin-top:2px">Min: ' + (classAvgWorst !== null ? classAvgWorst.toFixed(2) : '\u2014') + '</div></div>'
    + '</div>'
    + '<div style="display:flex;justify-content:space-between;align-items:flex-end;padding-top:12px;border-top:1px solid #999;margin-top:12px">'
    + '<div style="font-size:' + (fontSize - 3) + 'px;color:#000">' + SCHOOL_NAME + ' \u2014 ' + new Date().toLocaleDateString('fr-FR') + '</div>'
    + '<div style="text-align:center"><div style="width:120px;border-bottom:1px solid #000;margin-bottom:3px"></div><div style="font-size:' + (fontSize - 3) + 'px;color:#000">Signature du Promoteur</div></div>'
    + '</div></div></div>';
}

function buildTableauHTML(
  students: Student[],
  subjects: Subject[],
  className: string,
  rankMap: Record<string, number>,
  fontSize: number,
  mode: TableauMode,
  headerLogoMarkup: string
) {
  const schoolYear = `${new Date().getFullYear() - 1}–${new Date().getFullYear()}`;
  const showResults = mode === "filled";
  const rows = students.map((student, index) => {
    const avg = computeAvg(student, subjects);
    const rank = rankMap[student.id] || 0;
    const decision = avg !== null ? (avg >= 10 ? "ADMIS" : "REFUS\u00c9") : "\u2014";
    const subjectCells = subjects.map((subject) => {
      const grade = student.grades.find((currentGrade) => currentGrade.subjectId === subject.id);
      const cellValue = showResults ? (grade ? grade.value.toFixed(2) : "\u2014") : "&nbsp;";
      return '<td style="padding:7px 8px;border:1px solid #999;text-align:center;height:28px">' + cellValue + '</td>';
    }).join("");

    return '<tr style="background:' + (index % 2 === 0 ? '#fff' : '#f5f5f5') + '">'
      + '<td style="padding:7px 8px;border:1px solid #999;font-weight:500;text-align:left">' + student.name + '</td>'
      + subjectCells
      + (showResults
        ? '<td style="padding:7px 8px;border:1px solid #999;text-align:center;font-weight:800">' + (avg !== null ? avg.toFixed(2) : '\u2014') + '</td>'
          + '<td style="padding:7px 8px;border:1px solid #999;text-align:center;font-weight:600">' + (rank > 0 ? rank + (rank === 1 ? 'er' : '\u00e8me') : '\u2014') + '</td>'
          + '<td style="padding:7px 8px;border:1px solid #999;text-align:center;font-weight:700;' + (decision === 'ADMIS' ? 'text-decoration:underline' : '') + '">' + decision + '</td>'
        : '')
      + '</tr>';
  }).join("");

  const title = showResults ? "Tableau General des Notes" : "Tableau Vierge des Notes";
  const resultColumns = showResults
    ? '<th style="padding:6px 8px;text-align:center;border:1px solid #333">Moyenne</th>'
      + '<th style="padding:6px 8px;text-align:center;border:1px solid #333">Rang</th>'
      + '<th style="padding:6px 8px;text-align:center;border:1px solid #333">Decision</th>'
    : '';

  return '<div class="tableau-sheet" style="background:#ffffff;border:3px solid #000;border-radius:28px;padding:12px">'
    + '<div style="border:1.5px solid #555;border-radius:20px;padding:18px;background:#ffffff">'
    + '<div style="display:flex;align-items:center;justify-content:center;gap:16px;text-align:center;margin-bottom:16px;padding-bottom:12px;border-bottom:1px solid #999">'
    + buildHeaderLogoBlockHTML(headerLogoMarkup)
    + '<div>'
    + '<div style="font-size:' + (fontSize - 2) + 'px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#000">' + SCHOOL_NAME + '</div>'
    + '<div style="font-size:' + (fontSize + 6) + 'px;font-weight:900;letter-spacing:1px;text-transform:uppercase;color:#000">' + title + '</div>'
    + '<div style="font-size:' + fontSize + 'px;color:#000;margin-top:4px">' + className + ' \u2014 Ann\u00e9e scolaire ' + schoolYear + (showResults ? '' : ' \u2014 Version a remplir') + '</div>'
    + '</div>'
    + '</div>'
    + '<table style="width:100%;border-collapse:collapse;font-size:' + fontSize + 'px">'
    + '<thead><tr style="background:#ffffff;color:#000">'
    + '<th style="padding:6px 8px;text-align:left;border:1px solid #666">\u00c9l\u00e8ve</th>'
    + subjects.map((subject) => '<th style="padding:6px 8px;text-align:center;border:1px solid #666">' + subject.name + '<br><span style="font-weight:500;font-size:' + (fontSize - 2) + 'px;color:#000">Coef. ' + subject.coefficient + '</span></th>').join("")
    + resultColumns
    + '</tr></thead>'
    + '<tbody>' + rows + '</tbody></table>'
    + '<div style="text-align:right;font-size:' + (fontSize - 2) + 'px;color:#000;margin-top:12px;padding-top:12px;border-top:1px solid #999">' + SCHOOL_NAME + ' \u2014 ' + new Date().toLocaleDateString('fr-FR') + '</div>'
    + '</div></div>';
}

function chunkItems<T>(items: T[], size: number) {
  const chunks: T[][] = [];

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }

  return chunks;
}

function buildBulletinPageHTML(pageBulletins: string[]) {
  const isSingle = pageBulletins.length === 1;
  const cardWidth = isSingle ? "100%" : "49%";
  const cards = pageBulletins
    .map((bulletin) => '<div style="width:' + cardWidth + ';flex:0 0 ' + cardWidth + '">' + bulletin + '</div>')
    .join("");

  return '<div class="bulletin-page" style="width:100%;display:flex;gap:'
    + (isSingle ? '0' : '2%')
    + ';justify-content:center;align-items:flex-start">'
    + cards
    + '</div>';
}

function buildBulletinPageMarkupList(bulletins: string[]) {
  if (bulletins.length === 0) {
    return [] as string[];
  }

  return chunkItems(bulletins, 2).map((pageBulletins) => buildBulletinPageHTML(pageBulletins));
}

function buildBulletinPagesHTML(bulletins: string[]) {
  const pages = buildBulletinPageMarkupList(bulletins);

  return pages
    .map((pageMarkup, pageIndex) => '<div style="margin-bottom:'
      + (pageIndex < pages.length - 1 ? '20px' : '0')
      + ';page-break-after:'
      + (pageIndex < pages.length - 1 ? 'always' : 'auto')
      + '">' + pageMarkup + '</div>')
    .join("");
}

async function waitForImages(container: HTMLElement) {
  const images = Array.from(container.querySelectorAll("img"));

  await Promise.all(images.map((image) => {
    if (image.complete) {
      return Promise.resolve();
    }

    return new Promise<void>((resolve) => {
      image.addEventListener("load", () => resolve(), { once: true });
      image.addEventListener("error", () => resolve(), { once: true });
    });
  }));
}

async function renderBulletinPageToCanvas(
  pageMarkup: string,
  fontSize: number,
  orientation: PageOrientation
) {
  const container = document.createElement("div");
  const pageWidth = orientation === "landscape" ? "277mm" : "190mm";
  const pageMinHeight = orientation === "landscape" ? "190mm" : "277mm";

  container.style.position = "fixed";
  container.style.left = "-10000px";
  container.style.top = "0";
  container.style.width = pageWidth;
  container.style.minHeight = pageMinHeight;
  container.style.padding = "0";
  container.style.background = "#ffffff";
  container.style.color = "#000000";
  container.style.fontFamily = "'Segoe UI', Arial, sans-serif";
  container.style.fontSize = `${fontSize}px`;
  container.style.boxSizing = "border-box";
  container.innerHTML = pageMarkup;

  document.body.appendChild(container);

  try {
    await waitForImages(container);

    return await html2canvas(container, {
      backgroundColor: "#ffffff",
      scale: 2,
      useCORS: true,
      logging: false,
    });
  } finally {
    document.body.removeChild(container);
  }
}

function waitForNextFrame() {
  return new Promise<void>((resolve) => {
    window.requestAnimationFrame(() => resolve());
  });
}

export function BulletinManager({ classId, className, students, subjects }: { classId: string; className: string; students: Student[]; subjects: Subject[] }) {
  const [tab, setTab] = useState<"bulletins" | "tableau">("bulletins");
  const [selected, setSelected] = useState<string[]>([]);
  const [orientation, setOrientation] = useState<"portrait" | "landscape">("portrait");
  const [fontSize, setFontSize] = useState(11);
  const [showPreview, setShowPreview] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadLabel, setDownloadLabel] = useState<string | null>(null);
  const [tableauMode, setTableauMode] = useState<TableauMode>("filled");
  const [printStatuses, setPrintStatuses] = useState<Record<string, boolean>>(Object.fromEntries(students.map((s) => [s.id, s.bulletinPrinted])));
  const [toast, setToast] = useState<string | null>(null);

  const { map: rankMap, ranked } = computeRanks(students, subjects);
  const classAvgBest = ranked.length > 0 ? ranked[0].avg : null;
  const classAvgWorst = ranked.length > 0 ? ranked[ranked.length - 1].avg : null;

  const toggleSelect = (id: string) => {
    setSelected((prev) =>
      prev.includes(id)
        ? prev.filter((currentId) => currentId !== id)
        : [...prev, id]
    );
  };

  const selectAllStudents = () => {
    setSelected(students.map((student) => student.id));
  };

  const clearSelectionFilter = () => {
    setSelected([]);
  };

  const handleTogglePrinted = useCallback(async (studentId: string) => {
    const newVal = !printStatuses[studentId];
    setPrintStatuses((p) => ({ ...p, [studentId]: newVal }));
    await toggleBulletinPrinted(studentId, classId, newVal);
  }, [printStatuses, classId]);

  const showToastMsg = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }, []);

  const previewHTML = useMemo(() => {
    const headerLogoMarkup = buildLogoImageHtml(84, 1);

    if (tab === "tableau") {
      return buildTableauHTML(students, subjects, className, rankMap, fontSize, tableauMode, headerLogoMarkup);
    }

    const activeStudents = selected.length > 0
      ? students.filter((student) => selected.includes(student.id))
      : students;

    if (activeStudents.length === 0) return null;

    const bulletins = activeStudents.map((student) =>
      buildBulletinHTML(
        student,
        subjects,
        className,
        students.length,
        rankMap,
        classAvgBest,
        classAvgWorst,
        fontSize,
        headerLogoMarkup
      )
    );

    return buildBulletinPagesHTML(bulletins);
  }, [tab, students, subjects, className, rankMap, classAvgBest, classAvgWorst, fontSize, selected, tableauMode]);

  const handlePrint = useCallback(() => {
    const headerLogoMarkup = buildLogoImageHtml(84, 1);
    const activeStudents = selected.length > 0
      ? students.filter((student) => selected.includes(student.id))
      : students;
    const shouldPrintTwoPerPage = tab === "bulletins" && activeStudents.length > 1;
    let html: string;
    if (tab === "tableau") {
      html = buildTableauHTML(students, subjects, className, rankMap, fontSize, tableauMode, headerLogoMarkup);
    } else {
      if (activeStudents.length === 0) return;
      const bulletins = activeStudents.map((student) =>
        buildBulletinHTML(
          student,
          subjects,
          className,
          students.length,
          rankMap,
          classAvgBest,
          classAvgWorst,
          fontSize,
          headerLogoMarkup
        )
      );
      html = buildBulletinPagesHTML(bulletins);
    }
    const printOrientation = shouldPrintTwoPerPage ? "landscape" : orientation;
    const isL = printOrientation === "landscape";
    const title = tab === "tableau"
      ? tableauMode === "filled"
        ? "Tableau avec notes"
        : "Tableau vierge"
      : "Bulletins";
    const css = '* { box-sizing:border-box; margin:0; padding:0; -webkit-print-color-adjust:exact; print-color-adjust:exact; } body { font-family: Segoe UI, Arial, sans-serif; font-size:' + fontSize + 'px; color:#000; background:#fff; -webkit-print-color-adjust:exact; print-color-adjust:exact; } img { max-width:100%; } table, th, td { border-color:inherit; } .bulletin-page { width:100%; } @media print { body { background:#fff !important; } } @page { size:' + (isL ? 'landscape' : 'A4') + '; margin:10mm; }';
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write('<!DOCTYPE html><html><head><meta charset="utf-8"><title>' + title + '</title><style>' + css + '</style></head><body>' + html + '</body></html>');
    win.document.close();
    setTimeout(() => {
      win.print();
      if (tab === "bulletins" && activeStudents.length > 0) {
        const activeIds = activeStudents.map((student) => student.id);
        markBulletinsPrinted(activeIds, classId).then(() => {
          setPrintStatuses((p) => { const c = { ...p }; for (const id of activeIds) c[id] = true; return c; });
          showToastMsg("Bulletins marqu\u00e9s comme imprim\u00e9s \u2713");
        });
      }
    }, 400);
  }, [tab, selected, orientation, fontSize, students, subjects, rankMap, classAvgBest, classAvgWorst, classId, className, tableauMode, showToastMsg]);

  const handleDownloadPDF = useCallback(async () => {
    setIsDownloading(true);

    try {
      const updateProgress = async (value: number, label: string) => {
        setDownloadProgress(Math.max(0, Math.min(100, Math.round(value))));
        setDownloadLabel(label);
        await waitForNextFrame();
      };

      await updateProgress(8, tab === "bulletins" ? "Préparation des bulletins..." : "Préparation du tableau...");
      const logoDataUrl = await getLogoPngDataUrl(256).catch(() => "");
      await updateProgress(18, "Chargement du document...");

      if (tab === "tableau") {
        const isL = orientation === "landscape";
        const doc = new jsPDF({ orientation: isL ? "landscape" : "portrait" });
        const pw = isL ? 297 : 210;
        const title = tableauMode === "filled" ? "TABLEAU GENERAL DES NOTES" : "TABLEAU VIERGE DES NOTES";
        if (logoDataUrl) {
          doc.addImage(logoDataUrl, "PNG", 14, 8, 18, 18);
        }
        await updateProgress(42, "Construction de l'en-tête...");
        doc.setFontSize(9); doc.setFont("helvetica", "bold"); doc.setTextColor(97, 114, 243); doc.text(SCHOOL_NAME, 38, 15);
        doc.setFontSize(16); doc.setFont("helvetica", "bold"); doc.setTextColor(0); doc.text(title, pw / 2, 16, { align: "center" });
        doc.setFontSize(10); doc.setFont("helvetica", "normal"); doc.setTextColor(90); doc.text(className + " \u2014 Ann\u00e9e scolaire " + (new Date().getFullYear() - 1) + "\u2013" + new Date().getFullYear() + (tableauMode === "blank" ? " \u2014 Version a remplir" : ""), pw / 2, 23, { align: "center" });
        const head = tableauMode === "filled"
          ? [["\u00c9l\u00e8ve", ...subjects.map((subject) => subject.name + " (" + subject.coefficient + ")"), "Moyenne", "Rang", "Decision"]]
          : [["\u00c9l\u00e8ve", ...subjects.map((subject) => subject.name + " (" + subject.coefficient + ")")]];
        const body = students.map((student) => {
          if (tableauMode === "blank") {
            return [student.name, ...subjects.map(() => " ")];
          }

          const avg = computeAvg(student, subjects);
          const rank = rankMap[student.id] || 0;
          const decision = avg !== null ? (avg >= 10 ? "ADMIS" : "REFUS\u00c9") : "\u2014";

          return [
            student.name,
            ...subjects.map((subject) => {
              const grade = student.grades.find((currentGrade) => currentGrade.subjectId === subject.id);
              return grade ? grade.value.toFixed(2) : "\u2014";
            }),
            avg !== null ? avg.toFixed(2) : "\u2014",
            rank > 0 ? rank + (rank === 1 ? "er" : "\u00e8me") + "/" + students.length : "\u2014",
            decision,
          ];
        });
        await updateProgress(70, "Remplissage du tableau...");
        autoTable(doc, { startY: 28, head, body, theme: "grid", headStyles: { fillColor: [51, 51, 51], textColor: 255, fontStyle: "bold", halign: "center", fontSize: 7 }, styles: { fontSize: 7, cellPadding: 3, textColor: [0, 0, 0], lineColor: [153, 153, 153] }, columnStyles: { 0: { halign: "left" } }, alternateRowStyles: { fillColor: [245, 245, 245] } });
        await updateProgress(92, "Finalisation du PDF...");
        doc.setFontSize(8); doc.setTextColor(150); doc.text(SCHOOL_NAME + " \u2014 " + new Date().toLocaleDateString("fr-FR"), 14, (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10);
        doc.save((tableauMode === "filled" ? "tableau_general_" : "tableau_vierge_") + sanitizeFileName(className) + ".pdf");
        setDownloadProgress(100);
        setDownloadLabel("Téléchargement du PDF...");
        showToastMsg("PDF du tableau t\u00e9l\u00e9charg\u00e9 \u2713");
        return;
      }

      const activeStudents = selected.length > 0
        ? students.filter((student) => selected.includes(student.id))
        : students;
      if (activeStudents.length === 0) return;
      const shouldRenderTwoPerPage = activeStudents.length > 1;
      const pdfOrientation: PageOrientation = shouldRenderTwoPerPage ? "landscape" : orientation;
      const doc = new jsPDF({ orientation: pdfOrientation });
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const headerLogoMarkup = buildLogoImageHtml(84, 1, logoDataUrl || undefined);
      const bulletins = activeStudents.map((student) =>
        buildBulletinHTML(
          student,
          subjects,
          className,
          students.length,
          rankMap,
          classAvgBest,
          classAvgWorst,
          fontSize,
          headerLogoMarkup
        )
      );
      const pages = buildBulletinPageMarkupList(bulletins);
      await updateProgress(28, pages.length > 1 ? `Préparation de ${pages.length} pages...` : "Préparation de la page...");

      for (const [pageIndex, pageMarkup] of pages.entries()) {
        if (pageIndex > 0) {
          doc.addPage();
        }

        const currentPage = pageIndex + 1;
        const pageStartProgress = 28 + (pageIndex / pages.length) * 58;
        const pageEndProgress = 28 + (currentPage / pages.length) * 58;

        await updateProgress(pageStartProgress, `Rendu de la page ${currentPage} sur ${pages.length}...`);
        const canvas = await renderBulletinPageToCanvas(pageMarkup, fontSize, pdfOrientation);
        const imageData = canvas.toDataURL("image/png", 1);
        const contentWidth = pageWidth - 20;
        const contentHeight = pageHeight - 20;

        doc.addImage(imageData, "PNG", 10, 10, contentWidth, contentHeight, undefined, "FAST");
        await updateProgress(pageEndProgress, `Page ${currentPage} sur ${pages.length} ajoutée...`);
      }

      await updateProgress(94, "Finalisation du PDF...");
      doc.save("bulletins_" + sanitizeFileName(className) + ".pdf");
      setDownloadProgress(100);
      setDownloadLabel("Téléchargement du PDF...");
      showToastMsg("PDF des bulletins t\u00e9l\u00e9charg\u00e9 \u2713");
    } catch (error) {
      console.error("Bulletin PDF download failed", error);
      showToastMsg(tab === "bulletins" ? "\u00c9chec du t\u00e9l\u00e9chargement du PDF des bulletins" : "\u00c9chec du t\u00e9l\u00e9chargement du PDF");
    } finally {
      setIsDownloading(false);
      setDownloadProgress(0);
      setDownloadLabel(null);
    }
  }, [tab, selected, orientation, students, subjects, rankMap, classAvgBest, classAvgWorst, className, tableauMode, fontSize, showToastMsg]);

  const printedCount = Object.values(printStatuses).filter(Boolean).length;
  const scopeLabel = selected.length > 0 ? `${selected.length} sélectionné(s)` : "Toute la classe";
  const canAct = tab === "tableau"
    ? students.length > 0 && subjects.length > 0
    : students.length > 0;

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
          {tab === "tableau" && (
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Version</label>
              <div className="flex rounded-full border border-gray-200 bg-white/70 p-1 shadow-sm backdrop-blur-sm">
                <button onClick={() => setTableauMode("filled")} className={"px-4 py-2 text-sm font-medium rounded-full transition cursor-pointer " + (tableauMode === "filled" ? "bg-gray-900 text-white" : "text-gray-600 hover:bg-gray-100")}>
                  Avec notes
                </button>
                <button onClick={() => setTableauMode("blank")} className={"px-4 py-2 text-sm font-medium rounded-full transition cursor-pointer " + (tableauMode === "blank" ? "bg-gray-900 text-white" : "text-gray-600 hover:bg-gray-100")}>
                  Sans notes
                </button>
              </div>
            </div>
          )}
          {tab === "bulletins" && (
            <div className="flex flex-wrap items-center gap-3">
              <div className="rounded-full border border-slate-200/80 bg-white/65 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500 shadow-sm backdrop-blur-sm">
                Export : <span className="ml-1 text-slate-700">{scopeLabel}</span>
              </div>
              <div className="text-sm text-gray-500"><span className="font-bold text-green-600">{printedCount}</span>/{students.length} imprimé(s)</div>
              <div className="flex items-center gap-2">
                <button onClick={selectAllStudents} className="px-3 py-1.5 rounded-full border border-gray-200 bg-white text-xs font-semibold text-gray-600 shadow-sm transition hover:border-gray-300 hover:text-gray-800 cursor-pointer">
                  Tout cocher
                </button>
                <button onClick={clearSelectionFilter} disabled={selected.length === 0} className="px-3 py-1.5 rounded-full border border-gray-200 bg-white text-xs font-semibold text-gray-500 shadow-sm transition hover:border-gray-300 hover:text-gray-700 cursor-pointer disabled:cursor-not-allowed disabled:text-gray-300">
                  Effacer le filtre
                </button>
              </div>
            </div>
          )}
          <div className="ml-auto flex items-center gap-3">
            <button onClick={() => setShowPreview((p) => !p)} disabled={!canAct} className={"px-5 py-2.5 font-semibold rounded-xl border-2 transition cursor-pointer text-sm " + (canAct ? (showPreview ? "border-gray-900 bg-gray-900 text-white" : "border-gray-300 bg-white text-gray-700 hover:border-gray-400") : "border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed")}>
              {"\uD83D\uDC41\uFE0F"} Aperçu
            </button>
            <button onClick={handleDownloadPDF} disabled={!canAct || isDownloading} className={"px-5 py-2.5 font-semibold rounded-xl transition cursor-pointer text-sm " + (canAct && !isDownloading ? "bg-gray-700 text-white hover:bg-gray-800" : "bg-gray-200 text-gray-400 cursor-not-allowed")}>
              {isDownloading ? "Génération..." : "\uD83D\uDCE5 PDF"}
            </button>
            <button onClick={handlePrint} disabled={!canAct} className={"px-5 py-2.5 font-semibold rounded-xl transition cursor-pointer text-sm " + (canAct ? "bg-gray-900 text-white hover:bg-black" : "bg-gray-200 text-gray-400 cursor-not-allowed")}>
              {"\uD83D\uDDA8\uFE0F"} Imprimer
            </button>
          </div>
        </div>
        {isDownloading && (
          <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
            <div className="mb-2 flex items-center justify-between gap-4 text-sm">
              <span className="font-medium text-gray-700">{downloadLabel ?? "Génération du PDF..."}</span>
              <span className="min-w-12 text-right font-semibold tabular-nums text-gray-500">{downloadProgress}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-gray-200">
              <div className="h-full rounded-full bg-gray-900 transition-[width] duration-300 ease-out" style={{ width: `${downloadProgress}%` }} />
            </div>
          </div>
        )}
      </div>

      {showPreview && previewHTML && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 overflow-auto">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-gray-700">Aperçu avant impression</h3>
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
