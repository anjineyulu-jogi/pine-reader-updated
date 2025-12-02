import { ParsedDocument, DocumentType } from "../types";

export interface PageContent {
    pageNumber: number;
    text: string;
    // We can add viewport/rendering info here later if we want to mix canvas + HTML
}

export const parsePDF = async (file: File): Promise<ParsedDocument> => {
  const arrayBuffer = await file.arrayBuffer();
  
  // Load the document using the global pdfjsLib
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;

  const pages: PageContent[] = [];
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