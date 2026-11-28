/** Renders each .rsec section of the report paper to an A4 PDF (keeps YouTube links clickable) and downloads it. */
export async function exportPdf(paper: HTMLElement, fileBase: string) {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import("html2canvas"), import("jspdf")]);
  const pdf = new jsPDF({ unit: "mm", format: "a4" });
  const M = 12, W = 210 - 2 * M, H = 297 - 2 * M;
  let y = M;
  for (const sec of paper.querySelectorAll<HTMLElement>(".rsec")) {
    const cv = await html2canvas(sec, { scale: 2, backgroundColor: "#ffffff", logging: false, useCORS: true });
    const h = (cv.height * W) / cv.width;
    if (y + h > M + H && y > M) { pdf.addPage(); y = M; }
    if (h <= H) {
      pdf.addImage(cv, "JPEG", M, y, W, h, undefined, "FAST");
      const sr = sec.getBoundingClientRect(), k = W / sr.width;
      sec.querySelectorAll<HTMLAnchorElement>("a[href^='https://']").forEach((a) => {
        const r = a.getBoundingClientRect();
        pdf.link(M + (r.left - sr.left) * k, y + (r.top - sr.top) * k, r.width * k, r.height * k, { url: a.href });
      });
      y += h + 3;
      continue;
    }
    const pagePx = Math.floor((cv.width * H) / W);           // section taller than a page: slice it
    for (let top = 0; top < cv.height; top += pagePx) {
      const part = document.createElement("canvas");
      part.width = cv.width; part.height = Math.min(pagePx, cv.height - top);
      part.getContext("2d")!.drawImage(cv, 0, top, cv.width, part.height, 0, 0, cv.width, part.height);
      if (top > 0) { pdf.addPage(); y = M; }
      pdf.addImage(part, "JPEG", M, y, W, (part.height * W) / cv.width, undefined, "FAST");
      y += (part.height * W) / cv.width + 3;
    }
  }
  pdf.save(`ReachRadar_${fileBase.replace(/[\\/:*?"<>|]+/g, "").slice(0, 40)}.pdf`);
}
