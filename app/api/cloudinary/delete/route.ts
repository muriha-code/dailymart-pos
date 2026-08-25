import { NextRequest, NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';

// Cloudinary Configuration
cloudinary.config({
  cloud_name:
    process.env.CLOUDINARY_CLOUD_NAME ||
    process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ||
    'dailymart-pos',
  api_key: process.env.CLOUDINARY_API_KEY || '123456789012345',
  api_secret: process.env.CLOUDINARY_API_SECRET || 'secret',
  secure: true,
});

/**
 * Helper untuk mengekstrak public_id dari imageUrl jika public_id tidak disediakan secara langsung
 */
function extractPublicIdFromUrl(imageUrl?: string): string | null {
  if (!imageUrl || !imageUrl.includes('res.cloudinary.com')) return null;
  try {
    const parts = imageUrl.split('/upload/');
    if (parts.length > 1) {
      let pathAfterUpload = parts[1];
      // Hapus penanda versi (v123456789/) jika ada
      pathAfterUpload = pathAfterUpload.replace(/^v\d+\//, '');
      // Hapus ekstensi file (.jpg, .png, .webp, dll)
      const dotIndex = pathAfterUpload.lastIndexOf('.');
      if (dotIndex !== -1) {
        return pathAfterUpload.substring(0, dotIndex);
      }
      return pathAfterUpload;
    }
  } catch (_) {}
  return null;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const publicId = (body.public_id || body.publicId || body.photoPublicId || '').toString().trim();
    const photoURL = (body.photoURL || body.imageUrl || '').toString().trim();

    const targetPublicId = publicId || extractPublicIdFromUrl(photoURL);

    if (!targetPublicId) {
      return NextResponse.json(
        { success: false, message: 'public_id atau photoURL Cloudinary wajib disediakan.' },
        { status: 400 }
      );
    }

    const result = await cloudinary.uploader.destroy(targetPublicId, { invalidate: true });

    return NextResponse.json({
      success: true,
      message: `Aset Cloudinary (${targetPublicId}) berhasil dihapus.`,
      result,
    });
  } catch (error: any) {
    console.error('[API /api/cloudinary/delete POST Error]:', error);
    return NextResponse.json(
      { success: false, message: error?.message || 'Gagal menghapus aset dari Cloudinary.' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  return POST(req);
}
