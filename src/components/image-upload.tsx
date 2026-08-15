"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { Upload, X, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface ImageUploadProps {
  value?: string | null;
  onChange: (url: string | null) => void;
}

export function ImageUpload({ value, onChange }: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Image must be under 10MB");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      if (!res.ok) throw new Error("Upload failed");
      const { url } = await res.json();
      onChange(url);
      toast.success("Image uploaded");
    } catch {
      toast.error("Failed to upload image");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-2">
      {value ? (
        <div className="relative w-full h-48 rounded-xl border border-[#E8EDE9] overflow-hidden bg-[#FAFAF8]">
          <Image src={value} alt="Product" fill className="object-contain p-2" />
          <Button
            type="button"
            variant="destructive"
            size="icon"
            className="absolute top-2 right-2 h-7 w-7"
            onClick={() => onChange(null)}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      ) : (
        <div
          onClick={() => inputRef.current?.click()}
          className="w-full h-48 rounded-xl border-2 border-dashed border-[#E8EDE9] flex flex-col items-center justify-center gap-3 cursor-pointer hover:border-[#5A8A6E] hover:bg-[#5A8A6E]/5 transition-all duration-200"
        >
          {uploading ? (
            <div className="flex flex-col items-center gap-2">
              <div className="h-6 w-6 border-2 border-[#5A8A6E] border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-[#8A9A8E]">Uploading...</p>
            </div>
          ) : (
            <>
              <div className="p-3 rounded-xl bg-[#5A8A6E]/10">
                <ImageIcon className="h-6 w-6 text-[#5A8A6E]" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-[#2D3B35]">Upload image</p>
                <p className="text-xs text-[#8A9A8E]">PNG, JPG up to 10MB</p>
              </div>
              <Button type="button" variant="outline" size="sm">
                <Upload className="h-3.5 w-3.5" />
                Choose file
              </Button>
            </>
          )}
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />
    </div>
  );
}
