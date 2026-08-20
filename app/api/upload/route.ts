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

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { success: false, message: 'Tidak ada file yang diunggah.' },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Upload stream to Cloudinary
    const uploadResult = await new Promise<any>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'dailymart-pos/products',
          resource_type: 'image',
        },
        (error, result) => {
          if (error || !result) {
            return reject(error || new Error('Gagal mengunggah gambar ke Cloudinary'));
          }
          resolve(result);
        }
      );
      uploadStream.end(buffer);
    });

    return NextResponse.json({
      success: true,
      imageUrl: uploadResult.secure_url,
      publicId: uploadResult.public_id,
    });
  } catch (error: any) {
    console.error('[API /api/upload POST Error]:', error);

    // Fallback: If Cloudinary fails or credentials missing, generate Data URI fallback
    try {
      const reqClone = req.clone();
      const formData = await reqClone.formData();
      const file = formData.get('file') as File | null;
      if (file) {
        const bytes = await file.arrayBuffer();
        const base64 = Buffer.from(bytes).toString('base64');
        const mimeType = file.type || 'image/jpeg';
        const dataUrl = `data:${mimeType};base64,${base64}`;
        return NextResponse.json({
          success: true,
          imageUrl: dataUrl,
          message: 'Menggunakan fallback data URI.',
        });
      }
    } catch (_) {}

    return NextResponse.json(
      { success: false, message: error?.message || 'Gagal mengunggah foto produk.' },
      { status: 500 }
    );
  }
}
