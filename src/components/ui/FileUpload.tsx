import { useRef, useState, type DragEvent } from 'react';
import { FileText, Paperclip, Trash2, Upload } from 'lucide-react';
import type { ExpenseAttachment } from '@/types';
import { cn } from '@/lib/cn';
import { formatFileSize } from '@/utils/format';
import { Button } from './Button';

export interface FileUploadProps {
  attachments: ExpenseAttachment[];
  onChange: (attachments: ExpenseAttachment[]) => void;
  accept?: string;
  maxSizeBytes?: number;
  disabled?: boolean;
}

let attachmentCounter = 0;

export function FileUpload({
  attachments,
  onChange,
  accept = 'application/pdf,image/png,image/jpeg',
  maxSizeBytes = 5 * 1024 * 1024,
  disabled = false,
}: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const accept_files = (files: FileList | null): void => {
    if (!files?.length) return;
    const next: ExpenseAttachment[] = [];
    for (const file of Array.from(files)) {
      if (file.size > maxSizeBytes) {
        setError(`Berkas ${file.name} melebihi batas ${formatFileSize(maxSizeBytes)}`);
        continue;
      }
      attachmentCounter += 1;
      next.push({
        id: `att-local-${attachmentCounter}`,
        fileName: file.name,
        sizeBytes: file.size,
        mimeType: file.type || 'application/octet-stream',
        uploadedAt: new Date().toISOString(),
      });
    }
    if (next.length) {
      setError(null);
      onChange([...attachments, ...next]);
    }
  };

  const onDrop = (event: DragEvent<HTMLDivElement>): void => {
    event.preventDefault();
    setDragging(false);
    if (!disabled) accept_files(event.dataTransfer.files);
  };

  return (
    <div className="space-y-2.5">
      <div
        onDragOver={(event) => {
          event.preventDefault();
          if (!disabled) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={cn(
          'flex flex-col items-center justify-center rounded-md border border-dashed px-4 py-6 text-center transition-colors',
          dragging ? 'border-brand-600 bg-brand-50' : 'border-ink-300 bg-ink-50',
          disabled && 'opacity-60',
        )}
      >
        <Upload className="size-5 text-ink-400" aria-hidden />
        <p className="mt-2 text-[13px] font-medium text-ink-700">Tarik berkas ke area ini</p>
        <p className="mt-0.5 text-xs text-ink-500">
          PDF, PNG, atau JPG hingga {formatFileSize(maxSizeBytes)}
        </p>
        <Button
          className="mt-3"
          variant="outline"
          size="sm"
          disabled={disabled}
          leadingIcon={<Paperclip className="size-3.5" />}
          onClick={() => inputRef.current?.click()}
        >
          Pilih berkas
        </Button>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={accept}
          className="hidden"
          onChange={(event) => {
            accept_files(event.target.files);
            event.target.value = '';
          }}
        />
      </div>

      {error ? <p className="text-xs text-negative-600">{error}</p> : null}

      {attachments.length ? (
        <ul className="divide-y divide-ink-100 rounded-md border border-ink-200">
          {attachments.map((attachment) => (
            <li key={attachment.id} className="flex items-center gap-3 px-3 py-2.5">
              <FileText className="size-4 shrink-0 text-ink-400" aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-medium text-ink-800">{attachment.fileName}</p>
                <p className="text-xs text-ink-500">{formatFileSize(attachment.sizeBytes)}</p>
              </div>
              {!disabled ? (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Hapus ${attachment.fileName}`}
                  onClick={() => onChange(attachments.filter((entry) => entry.id !== attachment.id))}
                >
                  <Trash2 className="size-3.5 text-ink-400" />
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
