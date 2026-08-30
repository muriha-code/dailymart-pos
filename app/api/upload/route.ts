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
 * Helper untuk menentukan sub-folder Cloudinary berdasarkan kategori produk atau folderType
 */
function resolveProductFolder(category?: string | null, folderType?: string | null): string {
  if (folderType === 'store') return 'dailymart-pos/store';
  if (folderType === 'returns' || folderType === 'evidence/returns') return 'dailymart-pos/evidence/returns';
  if (folderType === 'audits' || folderType === 'evidence/audits') return 'dailymart-pos/evidence/audits';
  if (folderType === 'evidence' || folderType?.startsWith('evidence')) return 'dailymart-pos/evidence';
  if (folderType && folderType.startsWith('dailymart-pos/')) return folderType;

  const cat = (category || '').toLowerCase().trim();

  if (cat.includes('sembako')) return 'dailymart-pos/products/sembako';
  if (cat.includes('makanan') || cat.includes('food')) return 'dailymart-pos/products/makanan';
  if (cat.includes('minuman') || cat.includes('drink')) return 'dailymart-pos/products/minuman';
  if (cat.includes('perawatan')) return 'dailymart-pos/products/Perawatan Diri';
  if (cat.includes('snack') || cat.includes('biskuit')) return 'dailymart-pos/products/Snack and Biskuit';
  if (cat.includes('obat') || cat.includes('p3k')) return 'dailymart-pos/products/Obat and P3K';
  if (cat.includes('kebersihan')) return 'dailymart-pos/products/Kebersihan';

  return 'dailymart-pos/products';
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const sku = (formData.get('sku') || formData.get('public_id') || '').toString().trim();
    const category = (formData.get('category') || formData.get('categoryId') || formData.get('categoryName') || '').toString().trim();
    const folderType = (formData.get('folderType') || formData.get('folder') || '').toString().trim();

    if (!file) {
      return NextResponse.json(
        { success: false, message: 'Tidak ada file yang diunggah.' },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Tentukan folder tujuan Cloudinary
    const targetFolder = resolveProductFolder(category, folderType);

    const uploadOptions: any = {
      folder: targetFolder,
      resource_type: 'image',
    };

    // Jika SKU disediakan, gunakan sebagai public_id dengan overwrite: true
    if (sku) {
      const cleanSku = sku.replace(/[^a-zA-Z0-9_-]/g, '_');
      uploadOptions.public_id = cleanSku;
      uploadOptions.overwrite = true;
      uploadOptions.invalidate = true;
    }

    // Upload stream ke Cloudinary
    const uploadResult = await new Promise<any>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        uploadOptions,
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
      folder: targetFolder,
    });
  } catch (error: any) {
    console.error('[API /api/upload POST Error]:', error);

    // Fallback: Jika Cloudinary gagal/kredensial belum diset, hasilkan Data URI fallback
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
