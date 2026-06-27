import { api } from "./client";

export interface UploadResult {
  upload_url: string;
  file_url: string;
  key: string;
  expires_in: number;
}

export const mediaApi = {
  getUploadUrl: (jenis: string) =>
    api.post<UploadResult>("/api/media/upload", { jenis }),

  uploadFile: async (file: File, jenis: string): Promise<string> => {
    const { upload_url, file_url } = await mediaApi.getUploadUrl(jenis);

    // Upload langsung ke R2 via presigned URL
    const res = await fetch(upload_url, {
      method: "PUT",
      body: file,
      headers: { "Content-Type": file.type },
    });

    if (!res.ok) throw new Error("Upload ke R2 gagal");
    return file_url;
  },

  compressImage: async (file: File, maxWidth = 1200, quality = 0.75): Promise<File> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let { width, height } = img;
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (!blob) return reject(new Error("Kompresi gagal"));
            resolve(new File([blob], file.name.replace(/\.\w+$/, ".webp"), { type: "image/webp" }));
          },
          "image/webp",
          quality
        );
      };
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  },
};
