
import { ParsedDocument, DocumentType, PageData } from "../types";
import { saveParsedDocument } from "./storageService";
import { transformTextToSemanticHtml, generateDocumentOutline } from "./geminiService";

export interface PageContent {
    pageNumber: number;
    text: string;
}

// Helper to get the raw PDF Proxy for visual rendering
export const getPDFProxy = async (file: File): Promise<any> => {
    const mod = await import('pdfjs-dist');
    const pdfjsLib = mod.getDocument ? mod : (mod.default || mod);

    if (pdfjsLib.GlobalWorkerOptions && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
       pdfjsLib.GlobalWorkerOptions.workerSrc = "https://unpkg.com/pdfjs-dist@5.4.449/build/pdf.worker.min.mjs";
    }

    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    return loadingTask.promise;
};

// Helper to extract text from a single PDF page
const extractTextFromPDFPage = async (pdf: any, pageNumber: number): Promise<string> => {
    const page = await pdf.getPage(pageNumber);
    const textContent = await page.getTextContent();
    return textContent.items.map((item: any) => item.str).join(" ");
};

// Function to handle background processing and AI enhancement
const processRemainingPages = async (pdf: any, totalPages: number, initialDoc: ParsedDocument, startPage: number) => {
    let fullRawText = initialDoc.rawText;
    // Create a shallow copy of the pages array to mutate
    let newPages: PageData[] = [...initialDoc.pages];
    let docMetadata = initialDoc.metadata;
    
    // Process remaining pages
    for (let i = startPage + 1; i <= totalPages; i++) {
        try {
            const pageText = await extractTextFromPDFPage(pdf, i);
            fullRawText += pageText + ' ';
            
            // This is where you run the heavy AI-based semantic transformation
            // Note: In production, you might want to batch this or rate-limit
            const semanticHtml = await transformTextToSemanticHtml(pageText); 

            // Ensure the array index matches the page number (0-based index vs 1-based page)
            newPages[i-1] = { pageNumber: i, text: pageText, semanticHtml };
            
            // OPTIONAL: Update storage every 5 pages for robustness/checkpoints
            if (i % 5 === 0) {
                await saveParsedDocument({ 
                    ...initialDoc, 
                    pages: newPages, 
                    rawText: fullRawText,
                    metadata: { ...docMetadata, isFullyProcessed: false }
                }, docMetadata.name);
            }
        } catch (e) {
            console.warn(`Failed to process page ${i}`, e);
        }
    }

    // --- Final AI Analysis (TOC, etc) ---
    // Generate Outline only if we have substantial text
    let tableOfContents = [];
    if (fullRawText.length > 1000) {
        const outlineStrings = await generateDocumentOutline(fullRawText.substring(0, 30000));
        // Simple mapping for TOC - ideally would link to pages, here we just list them
        tableOfContents = outlineStrings.map((t, idx) => ({ title: t, page: 1 }));
    }
    
    // Final save of the complete, processed document
    const finalDoc: ParsedDocument = {
        metadata: {
            ...docMetadata,
            isFullyProcessed: true,
            tableOfContents: tableOfContents,
        },
        pages: newPages,
        rawText: fullRawText,
    };
    
    await saveParsedDocument(finalDoc, finalDoc.metadata.name);
};

// Exported function to resume processing if interrupted
export const resumePDFProcessing = async (file: File, partialDoc: ParsedDocument): Promise<void> => {
    const proxy = await getPDFProxy(file);
    const startPage = partialDoc.pages.filter(p => p && p.text).length; // Count actually processed pages
    if (startPage < partialDoc.metadata.pageCount) {
        processRemainingPages(proxy, partialDoc.metadata.pageCount, partialDoc, startPage);
    }
};

export const parsePDF = async (file: File): Promise<ParsedDocument> => {
  // Dynamic import setup
  const mod = await import('pdfjs-dist');
  const pdfjsLib = mod.getDocument ? mod : (mod.default || mod);

  if (pdfjsLib.GlobalWorkerOptions && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
       pdfjsLib.GlobalWorkerOptions.workerSrc = "https://unpkg.com/pdfjs-dist@5.4.449/build/pdf.worker.min.mjs";
  }

  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;

  const pageCount = pdf.numPages;
  let rawText = '';

  // --- STAGE 1: Immediate Pre-load (First 3 pages or total pages if less) ---
  const pages: PageData[] = [];
  const pagesToPreload = Math.min(pageCount, 3);
  
  for (let i = 1; i <= pagesToPreload; i++) {
      const pageText = await extractTextFromPDFPage(pdf, i);
      
      // Use a simplified/cached semantic HTML for pre-load if needed, 
      // or calling AI if it's fast enough. Using AI here for better UX on first page.
      const semanticHtml = await transformTextToSemanticHtml(pageText); 

      pages.push({ pageNumber: i, text: pageText, semanticHtml });
      rawText += pageText + ' ';
  }
  
  const initialDoc: ParsedDocument = {
      metadata: {
          name: file.name,
          type: DocumentType.PDF,
          size: file.size,
          lastOpened: Date.now(),
          pageCount: pageCount,
          lastReadDate: Date.now(),
          isFullyProcessed: pagesToPreload === pageCount, // If small doc, it's done
          tableOfContents: [] 
      },
      pages, // Only contains the preloaded pages
      rawText,
  };

  // Store the initial document immediately
  await saveParsedDocument(initialDoc, file.name);

  // --- STAGE 2: Background Full Processing (The remaining pages) ---
  if (pagesToPreload < pageCount) {
      // Run this in a non-blocking way (no await)
      processRemainingPages(pdf, pageCount, initialDoc, pagesToPreload);
  }

  return initialDoc;
};

// --- DOCX, EXCEL, TXT ---
// For now, these are kept synchronous or fast enough to not need chunking, 
// but saving `isFullyProcessed: true` is important for consistency.

export const parseDocx = async (file: File): Promise<ParsedDocument> => {
    const mod = await import('mammoth');
    const mammoth = mod.extractRawText ? mod : (mod.default || mod);

    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    const fullText = result.value;

    const CHARS_PER_PAGE = 1500;
    const pages: PageData[] = [];
    let currentPage = 1;

    for (let i = 0; i < fullText.length; i += CHARS_PER_PAGE) {
        let end = i + CHARS_PER_PAGE;
        if (end < fullText.length) {
            const nextSpace = fullText.indexOf(' ', end);
            const nextNewline = fullText.indexOf('\n', end);
            if (nextNewline !== -1 && nextNewline - end < 100) end = nextNewline + 1;
            else if (nextSpace !== -1 && nextSpace - end < 50) end = nextSpace + 1;
        }
        const pageText = fullText.substring(i, Math.min(end, fullText.length));
        pages.push({ pageNumber: currentPage++, text: pageText.trim() });
        if (end > i + CHARS_PER_PAGE) i = end - CHARS_PER_PAGE; 
    }

    if (pages.length === 0) pages.push({ pageNumber: 1, text: "Empty Document" });

    const doc: ParsedDocument = {
        metadata: {
            name: file.name,
            type: DocumentType.DOCX,
            pageCount: pages.length,
            lastReadDate: Date.now(),
            isFullyProcessed: true // Treated as instant for now
        },
        pages,
        rawText: fullText
    };
    
    await saveParsedDocument(doc, file.name);
    return doc;
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

            let html = `<h2>${sheetName}</h2><table role="grid" aria-rowcount="${rowCount}" aria-colcount="${colCount}"><thead>`;
            if (rows[0]) html += '<tr>' + rows[0].map((cell: any) => `<th scope="col">${cell !== undefined ? cell : ''}</th>`).join('') + '</tr>';
            html += '</thead><tbody>';
            for (let i = 1; i < rows.length; i++) {
                html += '<tr>' + rows[i].map((cell: any, colIndex: number) => {
                    const content = cell !== undefined ? cell : '';
                    if (colIndex === 0) return `<td scope="row">${content}</td>`;
                    return `<td>${content}</td>`;
                }).join('') + '</tr>';
            }
            html += '</tbody></table>';

            const csv = XLSX.utils.sheet_to_csv(sheet);
            const plainText = `Sheet: ${sheetName}\n\n${csv}`;

            pages.push({ pageNumber: index + 1, text: plainText, semanticHtml: html });
            fullRawText += plainText + "\n\n";
        }
    });

    if (pages.length === 0) pages.push({ pageNumber: 1, text: "Empty Spreadsheet" });

    const doc: ParsedDocument = {
        metadata: {
            name: file.name,
            type: DocumentType.XLSX,
            pageCount: pages.length,
            lastReadDate: Date.now(),
            isFullyProcessed: true
        },
        pages,
        rawText: fullRawText
    };
    
    await saveParsedDocument(doc, file.name);
    return doc;
};

export const parseTextFile = async (file: File): Promise<ParsedDocument> => {
    const text = await file.text();
    const doc: ParsedDocument = {
        metadata: {
            name: file.name,
            type: DocumentType.TXT,
            pageCount: 1,
            lastReadDate: Date.now(),
            isFullyProcessed: true
        },
        pages: [{ pageNumber: 1, text }],
        rawText: text
    };
    await saveParsedDocument(doc, file.name);
    return doc;
}
