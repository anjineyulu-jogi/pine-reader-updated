import { ParsedDocument, DocumentType, PageData } from "../types";
import mammoth from "mammoth";
import * as XLSX from 'xlsx';

export interface PageContent {
    pageNumber: number;
    text: string;
}

export const parsePDF = async (file: File): Promise<ParsedDocument> => {
  const arrayBuffer = await file.arrayBuffer();
  
  // Load the document using the global pdfjsLib
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
    const arrayBuffer = await file.arrayBuffer();
    // Extract raw text using mammoth
    const result = await mammoth.extractRawText({ arrayBuffer });
    const fullText = result.value;

    // Simulate paging for DOCX (approx 1500 chars per page)
    const CHARS_PER_PAGE = 1500;
    const pages: PageData[] = [];
    let currentPage = 1;

    for (let i = 0; i < fullText.length; i += CHARS_PER_PAGE) {
        // Find a natural break point (newline or space) near the limit to avoid cutting words
        let end = i + CHARS_PER_PAGE;
        if (end < fullText.length) {
            const nextSpace = fullText.indexOf(' ', end);
            const nextNewline = fullText.indexOf('\n', end);
            
            // Prefer newline if close, otherwise space
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

        // Adjust loop index if we extended to find a break
        if (end > i + CHARS_PER_PAGE) {
            i = end - CHARS_PER_PAGE; 
        }
    }

    // Handle empty docs
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
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer);
    const pages: PageData[] = [];
    let fullRawText = "";

    workbook.SheetNames.forEach((sheetName, index) => {
        const sheet = workbook.Sheets[sheetName];
        
        // Convert to array of arrays for clean control
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
        
        if (rows && rows.length > 0) {
            // 1. Build Semantic HTML Table
            let html = `<h2>${sheetName}</h2>`;
            html += '<table><thead>';
            
            // Header Row (First row)
            if (rows[0]) {
                html += '<tr>' + rows[0].map((cell: any) => `<th scope="col">${cell !== undefined ? cell : ''}</th>`).join('') + '</tr>';
            }
            html += '</thead><tbody>';
            
            // Data Rows
            for (let i = 1; i < rows.length; i++) {
                html += '<tr>' + rows[i].map((cell: any) => `<td>${cell !== undefined ? cell : ''}</td>`).join('') + '</tr>';
            }
            html += '</tbody></table>';

            // 2. Build Plain Text (CSV style) for AI context
            const csv = XLSX.utils.sheet_to_csv(sheet);
            const plainText = `Sheet: ${sheetName}\n\n${csv}`;

            pages.push({
                pageNumber: index + 1,
                text: plainText,
                semanticHtml: html // Pre-set semantic HTML so Reader renders it immediately without Gemini
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
    // Treat the whole text file as one page for simplicity, or split by generic page length
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