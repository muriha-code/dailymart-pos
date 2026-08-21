import { NextRequest, NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';
import { adminDb } from '@/lib/firebase/admin';

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
 * Helper untuk mengekstrak atau menentukan public_id Cloudinary dari imageUrl / SKU
 */
function extractPublicId(imageUrl?: string, publicId?: string, sku?: string, category?: string): string | null {
  if (publicId && publicId.trim()) {
    return publicId.trim();
  }

  if (imageUrl && imageUrl.includes('res.cloudinary.com')) {
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
  }

  if (sku) {
    const cleanSku = sku.trim().replace(/[^a-zA-Z0-9_-]/g, '_');
    const cat = (category || '').toLowerCase().trim();
    let folder = 'dailymart-pos/products';
    if (cat.includes('sembako')) folder = 'dailymart-pos/products/sembako';
    else if (cat.includes('makanan') || cat.includes('food')) folder = 'dailymart-pos/products/makanan';
    else if (cat.includes('minuman') || cat.includes('drink')) folder = 'dailymart-pos/products/minuman';
    else if (cat.includes('perawatan')) folder = 'dailymart-pos/products/Perawatan Diri';
    else if (cat.includes('snack') || cat.includes('biskuit')) folder = 'dailymart-pos/products/Snack and Biskuit';
    else if (cat.includes('obat') || cat.includes('p3k')) folder = 'dailymart-pos/products/Obat and P3K';
    else if (cat.includes('kebersihan')) folder = 'dailymart-pos/products/Kebersihan';

    return `${folder}/${cleanSku}`;
  }

  return null;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Normalisasi input single item atau items array
    let itemsToDelete: Array<{
      productId: string;
      publicId?: string;
      imageUrl?: string;
      sku?: string;
      category?: string;
    }> = [];

    if (Array.isArray(body.items) && body.items.length > 0) {
      itemsToDelete = body.items;
    } else if (body.productId || body.id) {
      itemsToDelete = [
        {
          productId: body.productId || body.id,
          publicId: body.publicId,
          imageUrl: body.imageUrl,
          sku: body.sku,
          category: body.category || body.categoryName,
        },
      ];
    } else {
      return NextResponse.json(
        { success: false, message: 'ID Produk wajib disertakan untuk menghapus.' },
        { status: 400 }
      );
    }

    let deletedCount = 0;
    const errors: string[] = [];

    // Proses penghapusan tiap produk
    for (const item of itemsToDelete) {
      const pId = item.productId;

      if (!pId) continue;

      try {
        // 1. Dapatkan data produk dari Firestore jika info gambar belum lengkap
        let docData: any = null;
        if (!item.imageUrl && !item.publicId && !item.sku) {
          const docSnap = await adminDb.collection('products').doc(pId).get();
          if (docSnap.exists) {
            docData = docSnap.data();
          }
        }

        const imageUrl = item.imageUrl || docData?.imageUrl;
        const publicId = item.publicId || docData?.publicId;
        const sku = item.sku || docData?.sku;
        const category = item.category || docData?.categoryName || docData?.categoryId;

        // 2. Hapus aset gambar dari Cloudinary jika public_id ditemukan
        const targetPublicId = extractPublicId(imageUrl, publicId, sku, category);
        if (targetPublicId) {
          try {
            await cloudinary.uploader.destroy(targetPublicId, { invalidate: true });
          } catch (cloudErr: any) {
            console.warn(`[Cloudinary Destroy Warning] ${targetPublicId}:`, cloudErr?.message || cloudErr);
          }
        }

        // 3. Hapus dokumen produk dari Firestore
        await adminDb.collection('products').doc(pId).delete();
        deletedCount++;
      } catch (err: any) {
        console.error(`Error deleting product ${pId}:`, err);
        errors.push(`Gagal menghapus produk ID ${pId}: ${err?.message || err}`);
      }
    }

    if (deletedCount === 0 && errors.length > 0) {
      return NextResponse.json(
        { success: false, message: errors.join('; ') },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `${deletedCount} produk berhasil dihapus permanen dari Firestore dan Cloudinary.`,
      deletedCount,
    });
  } catch (error: any) {
    console.error('[API /api/admin/products/delete POST Error]:', error);
    return NextResponse.json(
      { success: false, message: error?.message || 'Gagal menghapus produk permanen.' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  return POST(req);
}
