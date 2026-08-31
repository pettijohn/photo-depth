import type { OutputFormat } from '../state/types';

export interface ExportOptions {
  readonly format: OutputFormat;
  readonly jpegQuality: number;
  readonly sourceBaseName: string;
}

export interface ExportResult {
  readonly blob: Blob;
  readonly mimeType: 'image/jpeg' | 'image/png';
  readonly fileName: string;
}

export interface DownloadAdapter {
  createObjectURL(blob: Blob): string;
  revokeObjectURL(url: string): void;
  click(url: string, fileName: string): void;
  defer(callback: () => void): void;
}

export function buildDownloadName(baseName: string, format: OutputFormat): string {
  const safeBase = baseName.trim().replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-+|-+$/g, '') || 'photo';
  return `${safeBase}-bokeh.${format === 'jpeg' ? 'jpg' : 'png'}`;
}

const browserAdapter: DownloadAdapter = {
  createObjectURL: (blob) => URL.createObjectURL(blob),
  revokeObjectURL: (url) => URL.revokeObjectURL(url),
  click: (url, fileName) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
  },
  defer: (callback) => window.setTimeout(callback, 0),
};

export function startDownload(result: ExportResult, adapter: DownloadAdapter = browserAdapter): void {
  const url = adapter.createObjectURL(result.blob);
  adapter.click(url, result.fileName);
  adapter.defer(() => adapter.revokeObjectURL(url));
}
