// @ts-ignore
import * as pdfjsLib from 'pdfjs-dist';
// @ts-ignore
import mammoth from 'mammoth';
import Tesseract from 'tesseract.js';

// Setup PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

export async function extractTextFromFile(file: File): Promise<string> {
  const fileType = file.type;

  try {
    if (fileType === 'application/pdf') {
      return await extractTextFromPDF(file);
    } else if (
      fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || 
      fileType === 'application/msword'
    ) {
      return await extractTextFromDOCX(file);
    } else if (fileType.startsWith('image/')) {
      return await extractTextFromImage(file);
    } else if (fileType === 'text/plain') {
      return await file.text();
    }
  } catch (error) {
    console.error("Error extracting text from file:", file.name, error);
    return ""; // Soft fail: if extraction fails, return empty string so upload can proceed
  }

  return "";
}

async function extractTextFromPDF(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;
  
  let fullText = "";
  // Extract up to first 20 pages to avoid performance issues on massive PDFs
  const maxPages = Math.min(pdf.numPages, 20);
  
  for (let i = 1; i <= maxPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items.map((item: any) => item.str).join(" ");
    fullText += pageText + "\n";
  }
  
  return fullText;
}

async function extractTextFromDOCX(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  return result.value;
}

async function extractTextFromImage(file: File): Promise<string> {
  // Use Tesseract.js for OCR
  const result = await Tesseract.recognize(file, 'eng');
  return result.data.text;
}
