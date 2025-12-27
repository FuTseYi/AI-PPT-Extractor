import * as pdfjsLib from 'pdfjs-dist';

// Configure the worker to use the local file from node_modules.
// Using `new URL(..., import.meta.url)` lets Vite resolve the path correctly during build and dev.
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

export interface FileProcessResult {
  name: string;
  images: string[]; // Array of base64 images
}

const readFileAsBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

const renderPdfToImages = async (file: File): Promise<string[]> => {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const numPages = pdf.numPages;
  const images: string[] = [];

  for (let i = 1; i <= numPages; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: 2.0 }); // Scale up for better quality
    
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.height = viewport.height;
    canvas.width = viewport.width;

    if (context) {
        await page.render({
            canvasContext: context,
            viewport: viewport
        }).promise;
        images.push(canvas.toDataURL('image/png'));
    }
  }
  return images;
};

export const processUploadedFiles = async (files: FileList): Promise<FileProcessResult[]> => {
    const results: FileProcessResult[] = [];

    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        try {
            if (file.type === 'application/pdf') {
                const images = await renderPdfToImages(file);
                results.push({ name: file.name, images });
            } else if (file.type.startsWith('image/')) {
                const base64 = await readFileAsBase64(file);
                results.push({ name: file.name, images: [base64] });
            } else if (
                file.type === 'application/vnd.openxmlformats-officedocument.presentationml.presentation' || 
                file.name.endsWith('.pptx') || 
                file.name.endsWith('.ppt')
            ) {
                 // PPTX Client-side parsing to image is very hard/heavy. 
                 // For now, we alert user or handle it if we had a backend.
                 // In this pure-frontend demo, we might skip or warn. 
                 // However, the requirement asks to support it. 
                 // Strategy: We can't robustly render PPTX to image in simple frontend code without heavy libs.
                 // We will skip adding images but return a placeholder or throw a friendly error handled by UI.
                 console.warn("PPTX parsing requires backend or heavy WASM. Please convert to PDF.");
                 // We won't crash, just skip. The UI should show a specific warning.
                 throw new Error("请先将 PPT/PPTX 另存为 PDF 后上传，以获得最佳解析效果。");
            }
        } catch (e: any) {
            console.error(`Error processing file ${file.name}:`, e);
            throw e; // Re-throw to handle in UI
        }
    }
    return results;
};