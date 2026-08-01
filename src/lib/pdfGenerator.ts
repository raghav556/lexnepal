import html2canvas from "html2canvas";
import jsPDF from "jspdf";

export async function generatePdfFromHtml(htmlContent: string, filename: string = "document.pdf"): Promise<File> {
  // 1. Create an off-screen wrapper for the HTML
  const container = document.createElement("div");
  // Set dimensions similar to A4 page width (e.g. 794px at 96 DPI)
  container.style.width = "794px";
  container.style.padding = "40px";
  container.style.backgroundColor = "white";
  container.style.color = "black";
  container.style.position = "absolute";
  container.style.top = "-9999px"; // hide it
  container.style.left = "-9999px";
  container.style.fontFamily = "sans-serif"; // fallback
  // Make sure prose styles are applied if you have a wrapper class
  container.className = "prose prose-sm"; 
  container.innerHTML = htmlContent;
  
  document.body.appendChild(container);

  try {
    // 2. Render to canvas using html2canvas
    // html2canvas accurately renders complex unicode like Devanagari if the browser can render it.
    const canvas = await html2canvas(container, {
      scale: 2, // higher scale for better resolution
      useCORS: true,
      logging: false,
    });

    // 3. Convert Canvas to jsPDF
    const imgData = canvas.toDataURL("image/png");
    
    // A4 dimensions in mm: 210 x 297
    const pdf = new jsPDF("p", "mm", "a4");
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    
    let position = 0;
    const pageHeight = pdf.internal.pageSize.getHeight();
    let heightLeft = pdfHeight;
    
    pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
    heightLeft -= pageHeight;
    
    while (heightLeft > 0) {
      position = heightLeft - pdfHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
      heightLeft -= pageHeight;
    }

    // 4. Return as File object
    const blob = pdf.output("blob");
    return new File([blob], filename, { type: "application/pdf" });
  } finally {
    // Cleanup
    if (document.body.contains(container)) {
      document.body.removeChild(container);
    }
  }
}
