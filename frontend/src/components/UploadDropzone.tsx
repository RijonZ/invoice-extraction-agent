import { useCallback, useState } from "react";
import { uploadInvoice } from "../api/client";
import { useLanguage } from "../context/LanguageContext";

interface Props {
  onUploaded: () => void;
}

type FileStatus = "queued" | "uploading" | "done" | "error";

interface QueueItem {
  key: string;
  name: string;
  status: FileStatus;
  error?: string;
}

export function UploadDropzone({ onUploaded }: Props) {
  const { t } = useLanguage();
  const [isDragging, setIsDragging] = useState(false);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const isUploading = queue.some((item) => item.status === "queued" || item.status === "uploading");

  const handleFiles = useCallback(
    async (files: File[]) => {
      if (files.length === 0) return;

      const items: QueueItem[] = files.map((file, i) => ({
        key: `${Date.now()}-${i}-${file.name}`,
        name: file.name,
        status: "queued",
      }));
      setQueue(items);

      // Uploaded one at a time — each call runs extraction inline on the
      // backend, so parallel requests would just queue up behind the same
      // OpenAI rate limit while giving worse per-file progress feedback.
      for (let i = 0; i < files.length; i++) {
        setQueue((prev) =>
          prev.map((item) => (item.key === items[i].key ? { ...item, status: "uploading" } : item))
        );
        try {
          await uploadInvoice(files[i]);
          setQueue((prev) =>
            prev.map((item) => (item.key === items[i].key ? { ...item, status: "done" } : item))
          );
          onUploaded();
        } catch (err) {
          setQueue((prev) =>
            prev.map((item) =>
              item.key === items[i].key
                ? { ...item, status: "error", error: err instanceof Error ? err.message : String(err) }
                : item
            )
          );
        }
      }
    },
    [onUploaded]
  );

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files.length > 0) void handleFiles(Array.from(e.dataTransfer.files));
      }}
      className={`dropzone ${isDragging ? "dropzone-active" : ""}`}
    >
      <div className="dropzone-icon">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path
            d="M12 16V4M12 4L7 9M12 4l5 5M5 20h14"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      <p>{t("upload.dragHint")}</p>
      <label className="file-input-label">
        {t("upload.browseFiles")}
        <input
          type="file"
          multiple
          accept="application/pdf,image/png,image/jpeg,image/webp,image/gif"
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) {
              void handleFiles(Array.from(e.target.files));
            }
            e.target.value = "";
          }}
          hidden
        />
      </label>
      <p className="dropzone-hint" style={{ marginTop: "0.75rem" }}>
        {t("upload.formatHint")}
      </p>

      {queue.length > 0 && (
        <ul className="upload-queue">
          {queue.map((item) => (
            <li key={item.key} className={`upload-queue-item upload-queue-${item.status}`}>
              <span className="upload-queue-name" title={item.name}>
                {item.name}
              </span>
              <span className="upload-queue-status">
                {item.status === "queued" && t("upload.queued")}
                {item.status === "uploading" && t("upload.extracting")}
                {item.status === "done" && t("upload.done")}
                {item.status === "error" && (item.error ?? t("upload.failed"))}
              </span>
            </li>
          ))}
        </ul>
      )}
      {isUploading && <p className="dropzone-hint">{t("upload.processing", { count: queue.length })}</p>}
    </div>
  );
}
