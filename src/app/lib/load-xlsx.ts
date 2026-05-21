/** Tipos mínimos do SheetJS — carregado via CDN (index.html), sem pacote npm. */
export interface XlsxWorkSheet {
  [cell: string]: unknown;
}

export interface XlsxWorkBook {
  SheetNames: string[];
  Sheets: Record<string, XlsxWorkSheet>;
}

export interface XlsxUtils {
  sheet_to_json: <T>(ws: XlsxWorkSheet, opts?: Record<string, unknown>) => T[];
  aoa_to_sheet: (data: unknown[][]) => XlsxWorkSheet;
}

export interface XlsxModule {
  read: (data: ArrayBuffer | Uint8Array, opts?: { type?: string }) => XlsxWorkBook;
  utils: XlsxUtils;
  write: (wb: XlsxWorkBook, opts?: { bookType?: string; type?: string }) => Uint8Array;
}

declare global {
  interface Window {
    XLSX?: XlsxModule;
  }
}

const CDN_URL = 'https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js';

let loadPromise: Promise<XlsxModule> | null = null;

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[data-xlsx-loader="${src}"]`);
    if (existing) {
      if (window.XLSX) {
        resolve();
        return;
      }
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('Falha ao carregar leitor de planilhas.')));
      return;
    }
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.dataset.xlsxLoader = src;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Falha ao carregar leitor de planilhas (CDN).'));
    document.head.appendChild(script);
  });
}

/** SheetJS via script global — evita `import('xlsx')` que quebra o Vite sem npm install. */
export async function loadXlsx(): Promise<XlsxModule> {
  if (!loadPromise) {
    loadPromise = (async () => {
      if (typeof window === 'undefined') {
        throw new Error('Leitor de planilhas disponível apenas no navegador.');
      }
      if (window.XLSX) {
        return window.XLSX;
      }
      await loadScript(CDN_URL);
      if (!window.XLSX) {
        throw new Error(
          'Leitor de planilhas não carregou. Verifique acesso à internet ou adicione o script SheetJS no index.html.',
        );
      }
      return window.XLSX;
    })();
  }
  return loadPromise;
}
