import { useState } from "react";
import { mediaApi } from "../api/media";

export function useMediaUpload() {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const upload = async (file: File): Promise<{ url: string; jenis: string; ukuran: number }> => {
    setUploading(true);
    setProgress(10);

    try {
      let processedFile = file;
      let jenis = "teks";

      if (file.type.startsWith("image/")) {
        jenis = "foto";
        // Kompres gambar client-side sebelum upload
        if (file.size > 500 * 1024) {
          processedFile = await mediaApi.compressImage(file);
        }
      } else if (file.type.startsWith("audio/")) {
        jenis = "suara";
      } else if (file.type.startsWith("video/")) {
        jenis = "video";
      }

      setProgress(30);
      const url = await mediaApi.uploadFile(processedFile, jenis);
      setProgress(100);

      return { url, jenis, ukuran: processedFile.size };
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  return { upload, uploading, progress };
}
