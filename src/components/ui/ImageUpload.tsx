'use client';

import React, { useState, useRef } from 'react';
import Image from 'next/image';

interface ImageUploadProps {
  images: string[];
  onChange: (images: string[]) => void;
  maxFiles?: number;
}

export function ImageUpload({ images, onChange, maxFiles = 5 }: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [manualUrl, setManualUrl] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (images.length + files.length > maxFiles) {
      setError(`Cannot exceed maximum of ${maxFiles} images per specimen.`);
      return;
    }

    setUploading(true);
    setError(null);

    const newUrls: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      // Quick client-side size check
      if (file.size > 5 * 1024 * 1024) {
        setError(`File "${file.name}" exceeds 5MB size limit.`);
        continue;
      }

      const formData = new FormData();
      formData.append('file', file);

      try {
        const res = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });
        const json = await res.json();
        if (json.success && json.data?.url) {
          newUrls.push(json.data.url);
        } else {
          setError(json.error || `Failed to upload "${file.name}"`);
        }
      } catch {
        setError(`Network error uploading "${file.name}".`);
      }
    }

    if (newUrls.length > 0) {
      onChange([...images, ...newUrls]);
    }

    setUploading(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemove = async (indexToRemove: number) => {
    const urlToRemove = images[indexToRemove];
    const updated = images.filter((_, idx) => idx !== indexToRemove);
    onChange(updated);

    // If local uploaded image, attempt physical disk unlink
    if (urlToRemove.startsWith('/uploads/products/')) {
      try {
        await fetch(`/api/upload?url=${encodeURIComponent(urlToRemove)}`, {
          method: 'DELETE',
        });
      } catch {
        // Non-blocking cleanup
      }
    }
  };

  const handleAddManualUrl = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = manualUrl.trim();
    if (!trimmed) return;

    if (images.length >= maxFiles) {
      setError(`Cannot exceed ${maxFiles} images.`);
      return;
    }

    onChange([...images, trimmed]);
    setManualUrl('');
    setError(null);
  };

  return (
    <div className="space-y-4">
      {/* Upload Zone */}
      <div className="hairline-all p-4 bg-[#EFE7DC] space-y-3">
        <div className="flex items-center justify-between">
          <label className="block text-xs font-bold uppercase tracking-wider text-[#F0301A]">
            SPECIMEN IMAGERY &amp; ATTACHMENTS ({images.length}/{maxFiles})
          </label>
          <span className="text-[10px] font-mono text-[#161412]/60">
            JPG, PNG, WEBP, GIF (MAX 5MB)
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            accept="image/jpeg,image/png,image/webp,image/gif"
            multiple
            className="hidden"
            id="specimen-image-file-input"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading || images.length >= maxFiles}
            className="px-4 py-2 bg-[#F0301A] text-[#EFE7DC] text-xs font-bold uppercase tracking-wider hover:opacity-90 disabled:opacity-50 transition-opacity flex items-center gap-2"
          >
            {uploading ? (
              <>
                <span className="animate-spin inline-block">↻</span>
                WRITING TO STORAGE DISK...
              </>
            ) : (
              <>
                <span>↑</span> CHOOSE LOCAL FILE
              </>
            )}
          </button>

          <span className="text-[10px] font-bold text-[#161412]/50 uppercase">OR PASTE URL:</span>

          <form onSubmit={handleAddManualUrl} className="flex items-center gap-2 flex-1 min-w-[200px]">
            <input
              type="url"
              placeholder="https://images.unsplash.com/..."
              value={manualUrl}
              onChange={(e) => setManualUrl(e.target.value)}
              className="flex-1 bg-transparent hairline-all px-2 py-1.5 text-xs font-mono text-[#161412] placeholder:text-[#161412]/30 focus:outline-none"
            />
            <button
              type="submit"
              disabled={!manualUrl.trim() || images.length >= maxFiles}
              className="px-3 py-1.5 hairline-all text-xs font-bold uppercase hover:bg-[#F0301A] hover:text-[#EFE7DC] disabled:opacity-50 transition-colors"
            >
              ADD
            </button>
          </form>
        </div>

        {error && (
          <div className="p-2 bg-red-700 text-white text-[10px] font-bold uppercase tracking-wider">
            ✕ {error}
          </div>
        )}
      </div>

      {/* Image Gallery Grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {images.map((url, idx) => (
            <div
              key={`${url}-${idx}`}
              className="group relative hairline-all bg-neutral-100 aspect-square overflow-hidden"
            >
              <Image
                src={url}
                alt={`Specimen asset ${idx + 1}`}
                fill
                className="object-cover"
                unoptimized={url.startsWith('/uploads/')}
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-2">
                <button
                  type="button"
                  onClick={() => handleRemove(idx)}
                  className="px-2 py-1 bg-red-600 text-white text-[10px] font-bold uppercase tracking-wider hover:bg-red-700 shadow"
                >
                  REMOVE ✕
                </button>
              </div>
              <div className="absolute bottom-1 left-1 bg-black/70 text-white px-1.5 py-0.5 text-[8px] font-mono uppercase">
                {idx === 0 ? 'PRIMARY COVER' : `#${idx + 1}`}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
