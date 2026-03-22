'use client';

import { useState, useRef } from 'react';
import { getSupabaseClient } from '@/lib/supabase';
import { UploadCloud, Loader2, X } from 'lucide-react';

interface ImageUploaderProps {
  bucket?: string;
  folder?: string;
  onUploadSuccess: (url: string) => void;
  currentImageUrl?: string;
}

export default function ImageUploader({
  bucket = 'assets',
  folder = 'images',
  onUploadSuccess,
  currentImageUrl
}: ImageUploaderProps) {
  const supabase = getSupabaseClient();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Generate unique id to avoid conflicts when multiple ImageUploaders are on the same page
  const inputId = useRef(`img-upload-${Math.random().toString(36).substring(7)}`).current;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate type and size (e.g., max 5MB)
    if (!file.type.startsWith('image/')) {
      setError('請選擇圖片檔案 (JPEG, PNG, GIF, WebP)');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('圖片大小不得超過 5MB');
      return;
    }

    setUploading(true);
    setError('');

    try {
      // Create a unique file name
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${folder}/${fileName}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(filePath);

      onUploadSuccess(publicUrl);
    } catch (err: unknown) {
      console.error('Upload Error:', err);
      const errorMessage = err instanceof Error ? err.message : '圖片上傳失敗，請檢查儲存桶 (Bucket) 與權限設定。';
      setError(errorMessage);
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = ''; // Reset input
      }
    }
  };

  return (
    <div style={{ marginBottom: 16 }}>
      {currentImageUrl && (
        <div style={{ position: 'relative', marginBottom: 12, display: 'inline-block' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img 
            src={currentImageUrl} 
            alt="預覽圖片" 
            style={{ maxWidth: '200px', maxHeight: '150px', borderRadius: 8, border: '1px solid var(--color-border)' }} 
          />
          <button
            type="button"
            onClick={() => onUploadSuccess('')}
            style={{
              position: 'absolute',
              top: -8,
              right: -8,
              background: 'var(--color-danger)',
              color: 'white',
              borderRadius: '50%',
              width: 24,
              height: 24,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
            }}
          >
            <X size={14} />
          </button>
        </div>
      )}

      <div>
        <input
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          disabled={uploading}
          ref={fileInputRef}
          style={{ display: 'none' }}
          id={inputId}
        />
        <label
          htmlFor={inputId}
          className="btn btn-outline"
          style={{ cursor: uploading ? 'not-allowed' : 'pointer', opacity: uploading ? 0.7 : 1 }}
        >
          {uploading ? <Loader2 size={16} className="spin" /> : <UploadCloud size={16} />}
          {uploading ? '上傳中...' : (currentImageUrl ? '更換圖片' : '上傳圖片')}
        </label>
      </div>

      {error && <div style={{ color: 'var(--color-danger)', fontSize: 13, marginTop: 8 }}>{error}</div>}
      <div style={{ color: 'var(--color-text-muted)', fontSize: 12, marginTop: 4 }}>
        支援 JPG, PNG, GIF, WebP，最大 5MB
      </div>
      
      <style dangerouslySetInnerHTML={{__html: `
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { 100% { transform: rotate(360deg); } }
      `}} />
    </div>
  );
}
