
import { ParsedDocument, DocumentType, PageData } from "../types";

export interface PageContent {
    pageNumber: number;
    text: string;
}

// Helper to get the raw PDF Proxy for visual rendering
export const getPDFProxy = async (file: File): Promise<any> => {
    const mod = await import('pdfjs-dist');
    const pdfjsLib = mod.getDocument ? mod : (mod.default || mod);

    // CRITICAL: Use the mjs worker that matches the v5.x version from importmap
    if (pdfjsLib.GlobalWorkerOptions && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
       pdfjsLib.GlobalWorkerOptions.workerSrc = "https://unpkg.com/pdfjs-dist@5.4.449/build/pdf.worker.min.mjs";
    }

    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    return loadingTask.promise;
};

export const parsePDF = async (file: File): Promise<ParsedDocument> => {
  // Dynamic import
  const mod = await import('pdfjs-dist');
  
  // Robustly find the library object whether it's a named export or default export
  const pdfjsLib = mod.getDocument ? mod : (mod.default || mod);

  // CRITICAL: Use the mjs worker that matches the v5.x version from importmap
  if (pdfjsLib.GlobalWorkerOptions && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
       pdfjsLib.GlobalWorkerOptions.workerSrc = "https://unpkg.com/pdfjs-dist@5.4.449/build/pdf.worker.min.mjs";
  }

  const arrayBuffer = await file.arrayBuffer();
  
  // Load the document
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;

  const pages: PageData[] = [];
  let fullRawText = "";

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    
    // Extract text items
    const textItems = textContent.items.map((item: any) => item.str).join(" ");
    
    pages.push({
        pageNumber: i,
        text: textItems
    });
    
    fullRawText += textItems + "\n\n";
  }

  return {
    metadata: {
      name: file.name,
      type: DocumentType.PDF,
      pageCount: pdf.numPages,
      lastReadDate: Date.now()
    },
    pages,
    rawText: fullRawText
  };
};

export const parseDocx = async (file: File): Promise<ParsedDocument> => {
    const mod = await import('mammoth');
    const mammoth = mod.extractRawText ? mod : (mod.default || mod);

    const arrayBuffer = await file.arrayBuffer();
    // Extract raw text using mammoth
    const result = await mammoth.extractRawText({ arrayBuffer });
    const fullText = result.value;

    // Simulate paging for DOCX (approx 1500 chars per page)
    const CHARS_PER_PAGE = 1500;
    const pages: PageData[] = [];
    let currentPage = 1;

    for (let i = 0; i < fullText.length; i += CHARS_PER_PAGE) {
        // Find a natural break point
        let end = i + CHARS_PER_PAGE;
        if (end < fullText.length) {
            const nextSpace = fullText.indexOf(' ', end);
            const nextNewline = fullText.indexOf('\n', end);
            
            if (nextNewline !== -1 && nextNewline - end < 100) {
                end = nextNewline + 1;
            } else if (nextSpace !== -1 && nextSpace - end < 50) {
                end = nextSpace + 1;
            }
        }

        const pageText = fullText.substring(i, Math.min(end, fullText.length));
        
        pages.push({
            pageNumber: currentPage++,
            text: pageText.trim()
        });

        if (end > i + CHARS_PER_PAGE) {
            i = end - CHARS_PER_PAGE; 
        }
    }

    if (pages.length === 0) {
        pages.push({ pageNumber: 1, text: "Empty Document" });
    }

    return {
        metadata: {
            name: file.name,
            type: DocumentType.DOCX,
            pageCount: pages.length,
            lastReadDate: Date.now()
        },
        pages,
        rawText: fullText
    };
};

export const parseExcel = async (file: File): Promise<ParsedDocument> => {
    const mod = await import('xlsx');
    const XLSX = mod.read ? mod : (mod.default || mod);

    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer);
    const pages: PageData[] = [];
    let fullRawText = "";

    workbook.SheetNames.forEach((sheetName: string, index: number) => {
        const sheet = workbook.Sheets[sheetName];
        
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
        
        if (rows && rows.length > 0) {
            const rowCount = rows.length;
            const colCount = rows[0] ? rows[0].length : 0;

            let html = `<h2>${sheetName}</h2>`;
            // Accessibility Upgrade 1: Add role="grid", aria-rowcount, aria-colcount
            html += `<table role="grid" aria-rowcount="${rowCount}" aria-colcount="${colCount}"><thead>`;
            
            if (rows[0]) {
                html += '<tr>' + rows[0].map((cell: any) => `<th scope="col">${cell !== undefined ? cell : ''}</th>`).join('') + '</tr>';
            }
            html += '</thead><tbody>';
            
            for (let i = 1; i < rows.length; i++) {
                html += '<tr>' + rows[i].map((cell: any, colIndex: number) => {
                    const content = cell !== undefined ? cell : '';
                    // Accessibility Upgrade 2: Add scope="row" to the first cell of each data row
                    if (colIndex === 0) {
                        return `<td scope="row">${content}</td>`;
                    }
                    return `<td>${content}</td>`;
                }).join('') + '</tr>';
            }
            html += '</tbody></table>';

            const csv = XLSX.utils.sheet_to_csv(sheet);
            const plainText = `Sheet: ${sheetName}\n\n${csv}`;

            pages.push({
                pageNumber: index + 1,
                text: plainText,
                semanticHtml: html 
            });
            
            fullRawText += plainText + "\n\n";
        }
    });

    if (pages.length === 0) {
        pages.push({ pageNumber: 1, text: "Empty Spreadsheet" });
    }

    return {
        metadata: {
            name: file.name,
            type: DocumentType.XLSX,
            pageCount: pages.length,
            lastReadDate: Date.now()
        },
        pages,
        rawText: fullRawText
    };
};

export const parseTextFile = async (file: File): Promise<ParsedDocument> => {
    const text = await file.text();
    return {
        metadata: {
            name: file.name,
            type: DocumentType.TXT,
            pageCount: 1,
            lastReadDate: Date.now()
        },
        pages: [{ pageNumber: 1, text }],
        rawText: text
    };
}
