import React, { useState, useEffect, useRef } from 'react';
import {
  Upload, Camera, Image as ImageIcon, FileText, Trash2, Crop,
  Star, ArrowLeft, ArrowRight, AlertTriangle, Loader2, CheckCircle2
} from 'lucide-react';
import api from '../../services/api';
import ProductImageEditorModal from './ProductImageEditorModal';
import PdfImageExtractorModal from './PdfImageExtractorModal';

export default function ProductMediaUploader({ images = [], onChange, onError }) {
  const [rules, setRules] = useState({
    minImages: 1,
    maxImages: 8,
    maxFileSizeMb: 10,
    allowedFormats: ['jpg', 'jpeg', 'png', 'webp'],
    pdfAllowed: true,
    cameraAllowed: true,
    galleryAllowed: true,
    deviceFileAllowed: true
  });

  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [editingImageIndex, setEditingImageIndex] = useState(null);
  const [pdfFileToExtract, setPdfFileToExtract] = useState(null);

  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const pdfInputRef = useRef(null);

  useEffect(() => {
    fetchUploadRules();
  }, []);

  const fetchUploadRules = async () => {
    try {
      const res = await api.get('/items/upload-rules');
      if (res.data?.success && res.data?.rules) {
        setRules(res.data.rules);
      }
    } catch (err) {
      console.warn('[ProductMediaUploader] Using default upload rules:', err.message);
    }
  };

  const validateFile = (file) => {
    const ext = file.name.split('.').pop().toLowerCase();

    if (file.type === 'application/pdf') {
      if (!rules.pdfAllowed) {
        return 'PDF upload is currently disabled by admin.';
      }
      return null;
    }

    if (!rules.allowedFormats.includes(ext) && !file.type.startsWith('image/')) {
      return `Invalid format (.${ext}). Allowed: ${rules.allowedFormats.join(', ').toUpperCase()}`;
    }

    const maxBytes = rules.maxFileSizeMb * 1024 * 1024;
    if (file.size > maxBytes) {
      return `File size (${(file.size / (1024 * 1024)).toFixed(1)}MB) exceeds maximum limit of ${rules.maxFileSizeMb}MB.`;
    }

    return null;
  };

  const compressImageFile = (file, maxWidth = 1200, quality = 0.82) => {
    return new Promise((resolve) => {
      if (!file.type.startsWith('image/') || file.type === 'image/svg+xml') {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => resolve('');
        reader.readAsDataURL(file);
        return;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          let width = img.width;
          let height = img.height;
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', quality);
          resolve(dataUrl);
        };
        img.onerror = () => resolve(e.target.result);
        img.src = e.target.result;
      };
      reader.onerror = () => resolve('');
      reader.readAsDataURL(file);
    });
  };

  const uploadFileToServer = async (file) => {
    const formData = new FormData();
    formData.append('file', file);

    const res = await api.post('/items/upload-media', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });

    if (res.data?.success && res.data?.file?.url) {
      return res.data.file.url;
    }
    throw new Error(res.data?.message || 'File upload failed');
  };

  const handleFilesSelected = async (fileList) => {
    setUploadError(null);
    const selectedFiles = Array.from(fileList);

    if (images.length + selectedFiles.length > rules.maxImages) {
      const err = `Maximum allowed images is ${rules.maxImages}. You currently have ${images.length}.`;
      setUploadError(err);
      if (onError) onError(err);
      return;
    }

    setIsUploading(true);

    try {
      const newImages = [...images];

      for (const file of selectedFiles) {
        // PDF interception
        if (file.type === 'application/pdf') {
          setPdfFileToExtract(file);
          continue;
        }

        const errorMsg = validateFile(file);
        if (errorMsg) {
          setUploadError(errorMsg);
          if (onError) onError(errorMsg);
          continue;
        }

        // Upload to server storage immediately for permanent URL
        let serverUrl = '';
        try {
          serverUrl = await uploadFileToServer(file);
        } catch (serverErr) {
          console.warn('[MediaUploader] Server upload notice, generating optimized data URL:', serverErr.message);
          serverUrl = await compressImageFile(file);
        }

        const isFirst = newImages.length === 0;
        newImages.push({
          url: serverUrl,
          isPrimary: isFirst,
          caption: ''
        });
      }

      onChange(newImages);
    } catch (err) {
      console.error('Upload processing error:', err);
      setUploadError('Failed to process image files.');
    } finally {
      setIsUploading(false);
    }
  };

  const handlePdfImportedFiles = async (files) => {
    setPdfFileToExtract(null);
    if (!files || files.length === 0) return;
    await handleFilesSelected(files);
  };

  const handleSetPrimary = (index) => {
    const updated = images.map((img, i) => ({
      ...img,
      isPrimary: i === index
    }));
    onChange(updated);
  };

  const handleRemove = (index) => {
    const remaining = images.filter((_, i) => i !== index);
    if (remaining.length > 0 && !remaining.some((img) => img.isPrimary)) {
      remaining[0].isPrimary = true;
    }
    onChange(remaining);
  };

  const handleMove = (fromIndex, toIndex) => {
    if (toIndex < 0 || toIndex >= images.length) return;
    const copy = [...images];
    const item = copy.splice(fromIndex, 1)[0];
    copy.splice(toIndex, 0, item);

    // Keep primary image flag aligned
    const updated = copy.map((img, i) => ({
      ...img,
      isPrimary: i === 0
    }));
    onChange(updated);
  };

  const handleEditedImageSave = async ({ file, url }) => {
    if (editingImageIndex === null) return;
    setIsUploading(true);

    try {
      let finalUrl = url;
      try {
        finalUrl = await uploadFileToServer(file);
      } catch (err) {
        console.warn('Server save fallback to edited Blob URL');
      }

      const copy = [...images];
      copy[editingImageIndex] = {
        ...copy[editingImageIndex],
        url: finalUrl
      };
      onChange(copy);
    } catch (err) {
      console.error('Error saving edited image:', err);
    } finally {
      setIsUploading(false);
      setEditingImageIndex(null);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFilesSelected(e.dataTransfer.files);
    }
  };

  return (
    <div className="space-y-4">
      {/* Upload Rules Notice */}
      <div className="flex items-center justify-between text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-200">
        <div className="flex items-center gap-2">
          <ImageIcon className="w-4 h-4 text-emerald-600" />
          <span>
            Photos: <strong className="text-slate-900">{images.length}</strong> / {rules.maxImages} (Min: {rules.minImages})
          </span>
        </div>
        <span className="text-slate-500">Max size: {rules.maxFileSizeMb} MB per photo</span>
      </div>

      {/* Error Alert */}
      {uploadError && (
        <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs">
          <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
          <span>{uploadError}</span>
        </div>
      )}

      {/* Multi-Source Media Picker Buttons */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {rules.deviceFileAllowed && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex flex-col items-center justify-center p-4 rounded-xl border border-dashed border-slate-300 bg-white hover:bg-emerald-50/60 hover:border-emerald-500 text-slate-700 transition gap-2 group cursor-pointer shadow-sm"
          >
            <Upload className="w-5 h-5 text-emerald-600 group-hover:scale-110 transition" />
            <span className="text-xs font-medium">Upload Device Files</span>
          </button>
        )}

        {rules.cameraAllowed && (
          <button
            type="button"
            onClick={() => cameraInputRef.current?.click()}
            className="flex flex-col items-center justify-center p-4 rounded-xl border border-dashed border-slate-300 bg-white hover:bg-emerald-50/60 hover:border-emerald-500 text-slate-700 transition gap-2 group cursor-pointer shadow-sm"
          >
            <Camera className="w-5 h-5 text-emerald-600 group-hover:scale-110 transition" />
            <span className="text-xs font-medium">Take Photo (Camera)</span>
          </button>
        )}

        {rules.galleryAllowed && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex flex-col items-center justify-center p-4 rounded-xl border border-dashed border-slate-300 bg-white hover:bg-emerald-50/60 hover:border-emerald-500 text-slate-700 transition gap-2 group cursor-pointer shadow-sm"
          >
            <ImageIcon className="w-5 h-5 text-emerald-600 group-hover:scale-110 transition" />
            <span className="text-xs font-medium">Device Gallery</span>
          </button>
        )}

        {rules.pdfAllowed && (
          <button
            type="button"
            onClick={() => pdfInputRef.current?.click()}
            className="flex flex-col items-center justify-center p-4 rounded-xl border border-dashed border-slate-300 bg-white hover:bg-emerald-50/60 hover:border-emerald-500 text-slate-700 transition gap-2 group cursor-pointer shadow-sm"
          >
            <FileText className="w-5 h-5 text-emerald-600 group-hover:scale-110 transition" />
            <span className="text-xs font-medium">Import from PDF</span>
          </button>
        )}
      </div>

      {/* Hidden Native File Inputs */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/jpeg,image/jpg,image/png,image/webp"
        className="hidden"
        onChange={(e) => e.target.files && handleFilesSelected(e.target.files)}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => e.target.files && handleFilesSelected(e.target.files)}
      />
      <input
        ref={pdfInputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && setPdfFileToExtract(e.target.files[0])}
      />

      {/* Drag & Drop Target Zone */}
      <div
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className="border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-2xl p-6 text-center bg-slate-50/80 hover:bg-emerald-50/40 transition flex flex-col items-center justify-center gap-2 cursor-pointer shadow-inner"
        onClick={() => fileInputRef.current?.click()}
      >
        {isUploading ? (
          <div className="flex items-center gap-2 text-emerald-600 text-sm font-medium py-2">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Processing & Uploading Product Photos...</span>
          </div>
        ) : (
          <>
            <Upload className="w-8 h-8 text-slate-400" />
            <p className="text-sm font-medium text-slate-700">
              Drag & Drop product photos here or <span className="text-emerald-600 underline font-semibold">browse files</span>
            </p>
            <p className="text-xs text-slate-400">Supported: JPG, JPEG, PNG, WEBP, PDF</p>
          </>
        )}
      </div>

      {/* Product Image Gallery Grid */}
      {images.length > 0 && (
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>Product Gallery ({images.length})</span>
            <span className="text-emerald-600 font-medium">Click any photo to set as Cover / Primary Image</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {images.map((img, index) => {
              const isPrimary = img.isPrimary || index === 0;

              return (
                <div
                  key={index}
                  className={`group relative rounded-xl overflow-hidden border-2 transition-all bg-slate-100 ${
                    isPrimary
                      ? 'border-emerald-500 ring-2 ring-emerald-500/20 shadow-md'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {/* Photo Preview */}
                  <img
                    src={img.url}
                    alt={`Product photo ${index + 1}`}
                    className="w-full h-36 object-cover bg-slate-950 cursor-pointer"
                    onClick={() => handleSetPrimary(index)}
                  />

                  {/* Primary Badge */}
                  {isPrimary ? (
                    <div className="absolute top-2 left-2 px-2.5 py-1 rounded-md bg-emerald-500 text-slate-950 text-[10px] font-extrabold tracking-wider uppercase shadow-md flex items-center gap-1">
                      <Star className="w-3 h-3 fill-slate-950" />
                      PRIMARY COVER
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleSetPrimary(index)}
                      className="absolute top-2 left-2 px-2 py-0.5 rounded bg-slate-900/80 text-slate-400 opacity-0 group-hover:opacity-100 text-[10px] font-medium hover:text-emerald-400 transition"
                    >
                      Set Primary
                    </button>
                  )}

                  {/* Actions Overlay */}
                  <div className="absolute bottom-0 inset-x-0 p-2 bg-gradient-to-t from-slate-950/90 via-slate-950/60 to-transparent flex items-center justify-between opacity-90 sm:opacity-0 group-hover:opacity-100 transition">
                    <div className="flex items-center gap-1">
                      {index > 0 && (
                        <button
                          type="button"
                          onClick={() => handleMove(index, index - 1)}
                          className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition"
                          title="Move Left"
                        >
                          <ArrowLeft className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {index < images.length - 1 && (
                        <button
                          type="button"
                          onClick={() => handleMove(index, index + 1)}
                          className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition"
                          title="Move Right"
                        >
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setEditingImageIndex(index)}
                        className="p-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 transition"
                        title="Crop & Edit Image"
                      >
                        <Crop className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleRemove(index)}
                        className="p-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 transition"
                        title="Remove Photo"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Editor Modal */}
      {editingImageIndex !== null && (
        <ProductImageEditorModal
          isOpen={editingImageIndex !== null}
          imageSrc={images[editingImageIndex]?.url}
          onClose={() => setEditingImageIndex(null)}
          onSave={handleEditedImageSave}
        />
      )}

      {/* PDF Extractor Modal */}
      {pdfFileToExtract && (
        <PdfImageExtractorModal
          isOpen={Boolean(pdfFileToExtract)}
          pdfFile={pdfFileToExtract}
          onClose={() => setPdfFileToExtract(null)}
          onImportPages={handlePdfImportedFiles}
        />
      )}
    </div>
  );
}
