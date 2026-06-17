"use client";

import { useState, useCallback, useRef, useEffect } from "react";

type Props = {
  onPredict: (file: File) => void;
  isLoading: boolean;
};

export default function UploadCard({ onPredict, isLoading }: Props) {
  const [preview, setPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const previewRef = useRef<string | null>(null);

  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) {
      setFileError("That doesn't look like an image — please choose a JPG, PNG, or WEBP.");
      return;
    }
    setFileError(null);
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    const url = URL.createObjectURL(file);
    previewRef.current = url;
    setSelectedFile(file);
    setPreview(url);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const reset = useCallback(() => {
    if (previewRef.current) {
      URL.revokeObjectURL(previewRef.current);
      previewRef.current = null;
    }
    setPreview(null);
    setSelectedFile(null);
    setFileError(null);
    if (inputRef.current) inputRef.current.value = "";
  }, []);

  /* Revoke the object URL on unmount (e.g. switching to camera mode). */
  useEffect(() => {
    return () => {
      if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    };
  }, []);

  return (
    <div className="bg-white rounded-3xl p-6 shadow-card border border-cream-dark transition-transform duration-300 hover:-translate-y-1">
      {/* Header */}
      <div className="flex items-center gap-2 mb-5">
        <span className="text-xl" aria-hidden="true">📸</span>
        <h2 className="text-paw-900 font-bold text-lg">Upload Your Pup</h2>
      </div>

      {/* Drop zone */}
      <div
        role="button"
        tabIndex={0}
        aria-label="Upload a dog photo — click or drop image here"
        onDrop={handleDrop}
        onDragOver={(e) => {
          e.preventDefault();
          if (!isLoading) setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onClick={() => !isLoading && inputRef.current?.click()}
        onKeyDown={(e) => {
          if ((e.key === "Enter" || e.key === " ") && !isLoading)
            inputRef.current?.click();
        }}
        className={`relative rounded-2xl border-2 border-dashed overflow-hidden flex flex-col items-center justify-center min-h-52 transition-all duration-200 ${
          isLoading
            ? "cursor-not-allowed opacity-60 border-cream-dark"
            : isDragging
            ? "cursor-copy border-caramel-500 bg-caramel-100 scale-[1.01]"
            : "cursor-pointer border-cream-dark hover:border-caramel-400 hover:bg-warm-white"
        }`}
      >
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={preview}
            alt="Selected dog photo"
            className="w-full object-cover max-h-72"
          />
        ) : (
          <div className="text-center px-6 py-10 select-none">
            <span className="text-5xl mb-4 block" aria-hidden="true">🐾</span>
            <p className="text-paw-700 font-semibold text-sm sm:text-base">
              Who&apos;s this good pup?
            </p>
            <p className="text-warm-gray text-sm mt-1.5">
              Drop a photo here or{" "}
              <span className="text-caramel-500 font-medium underline decoration-dotted underline-offset-2">
                click to browse
              </span>
            </p>
            <p className="text-warm-gray-light text-xs mt-3 tracking-wide">
              JPG · PNG · WEBP
            </p>
          </div>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleChange}
          disabled={isLoading}
          aria-hidden="true"
        />
      </div>

      {/* Inline file-type error */}
      {fileError && (
        <p
          role="alert"
          className="mt-3 text-xs font-medium text-orange-700 bg-orange-50 border border-orange-200 rounded-xl px-3 py-2 text-center"
        >
          ⚠️ {fileError}
        </p>
      )}

      {/* Actions */}
      {selectedFile ? (
        <div className="mt-4 flex gap-3">
          <button
            onClick={reset}
            disabled={isLoading}
            className="px-4 py-3 rounded-2xl border border-cream-dark text-warm-gray text-sm font-medium hover:bg-cream hover:text-paw-700 active:scale-[0.97] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Clear
          </button>
          <button
            onClick={() => onPredict(selectedFile)}
            disabled={isLoading}
            className="flex-1 bg-paw-700 text-white rounded-2xl py-3 font-bold text-sm flex items-center justify-center gap-2 hover:bg-paw-800 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm shadow-paw-700/20"
          >
            <span aria-hidden="true">🐾</span>
            Dogtify!
          </button>
        </div>
      ) : (
        <p className="mt-4 text-center text-xs text-warm-gray-light">
          Supports any clear photo of your dog
        </p>
      )}
    </div>
  );
}
