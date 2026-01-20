import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from './ui/button';

export default function ImageUpload({ value, onChange, label = 'Upload Image' }) {
  const [preview, setPreview] = useState(value || null);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef(null);

  const compressImage = (file, maxWidth = 400, maxHeight = 400, quality = 0.8) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        const img = new Image();

        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          // Calculate new dimensions while maintaining aspect ratio
          if (width > height) {
            if (width > maxWidth) {
              height = (height * maxWidth) / width;
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width = (width * maxHeight) / height;
              height = maxHeight;
            }
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          // Convert to base64 with compression
          const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
          resolve(compressedBase64);
        };

        img.onerror = reject;
        img.src = e.target.result;
      };

      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    // Validate file size (10MB max before compression)
    if (file.size > 10 * 1024 * 1024) {
      alert('Image size must be less than 10MB');
      return;
    }

    setIsLoading(true);

    try {
      const compressedImage = await compressImage(file);
      setPreview(compressedImage);
      onChange(compressedImage);
    } catch (error) {
      console.error('Error compressing image:', error);
      alert('Failed to process image. Please try another file.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemove = () => {
    setPreview(null);
    onChange('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-3">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      <AnimatePresence mode="wait">
        {preview ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="space-y-3"
          >
            <div className="relative w-32 h-32 mx-auto">
              <img
                src={preview}
                alt="Avatar preview"
                className="w-full h-full rounded-full object-cover border-4 border-primary/20"
              />
            </div>
            <div className="flex gap-2 justify-center">
              <Button
                type="button"
                onClick={handleClick}
                variant="outline"
                size="sm"
                disabled={isLoading}
              >
                Change Image
              </Button>
              <Button
                type="button"
                onClick={handleRemove}
                variant="outline"
                size="sm"
                disabled={isLoading}
              >
                Remove
              </Button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="space-y-3"
          >
            <div
              onClick={handleClick}
              className="w-32 h-32 mx-auto rounded-full border-2 border-dashed border-muted-foreground/30 flex items-center justify-center cursor-pointer hover:border-primary/50 transition-colors bg-muted/20"
            >
              <div className="text-center">
                <div className="text-3xl mb-1">📷</div>
                <div className="text-xs text-muted-foreground">
                  {isLoading ? 'Processing...' : 'Upload'}
                </div>
              </div>
            </div>
            <div className="text-center">
              <Button
                type="button"
                onClick={handleClick}
                variant="outline"
                size="sm"
                disabled={isLoading}
              >
                {label}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <p className="text-xs text-muted-foreground text-center">
        JPG, PNG, or GIF. Max 10MB. Image will be compressed.
      </p>
    </div>
  );
}
