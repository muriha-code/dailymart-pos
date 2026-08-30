/**
 * Helper utility to upload temporary image DataURLs to Cloudinary in bulk upon form submission.
 */
export async function uploadDeferredImages(
  images: string[],
  folderType: "returns" | "audits" | string
): Promise<string[]> {
  if (!images || images.length === 0) return [];

  const finalUrls: string[] = [];

  for (let index = 0; index < images.length; index++) {
    const imgItem = images[index];

    // If it's already an uploaded Cloudinary / HTTP URL, keep it
    if (imgItem.startsWith("http://") || imgItem.startsWith("https://")) {
      finalUrls.push(imgItem);
      continue;
    }

    // If it's a Data URL (data:image/...) or Blob URL, convert to File & upload to /api/upload
    try {
      let fileToUpload: File | Blob;

      if (imgItem.startsWith("data:")) {
        const arr = imgItem.split(",");
        const mimeMatch = arr[0].match(/:(.*?);/);
        const mime = mimeMatch ? mimeMatch[1] : "image/jpeg";
        const bstr = atob(arr[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
          u8arr[n] = bstr.charCodeAt(n);
        }
        const ext = mime.includes("png") ? "png" : "jpg";
        fileToUpload = new File([u8arr], `evidence_${Date.now()}_${index}.${ext}`, { type: mime });
      } else if (imgItem.startsWith("blob:")) {
        const response = await fetch(imgItem);
        const blob = await response.blob();
        fileToUpload = new File([blob], `evidence_${Date.now()}_${index}.jpg`, { type: blob.type || "image/jpeg" });
      } else {
        finalUrls.push(imgItem);
        continue;
      }

      const formData = new FormData();
      formData.append("file", fileToUpload);
      formData.append("folderType", folderType);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (res.ok && data.success && data.imageUrl) {
        finalUrls.push(data.imageUrl);
      } else {
        throw new Error(data.message || `Gagal mengunggah foto ke Cloudinary (${folderType})`);
      }
    } catch (err: any) {
      console.error(`[uploadDeferredImages] Error uploading image #${index + 1}:`, err);
      throw new Error(`Gagal mengunggah foto bukti #${index + 1}: ${err?.message || "Kesalahan server"}`);
    }
  }

  return finalUrls;
}
