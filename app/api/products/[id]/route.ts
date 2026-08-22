import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';

// PUT /api/products/[id] -> Update product details
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();

    if (!id) {
      return NextResponse.json(
        { success: false, message: 'Product ID wajib diisi' },
        { status: 400 }
      );
    }

    const docRef = adminDb.collection('products').doc(id);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return NextResponse.json(
        { success: false, message: 'Produk tidak ditemukan' },
        { status: 404 }
      );
    }

    const existingData = docSnap.data() || {};
    
    // Kalkulasi HPP per unit (Retail Cost Breakdown) jika ada perubahan harga/diskon/biaya
    const conversionQty =
      body.conversionQty !== undefined
        ? Number(body.conversionQty)
        : Number(existingData.conversionQty || 1);
    
    let baseUnitSupplierPrice =
      body.supplierPrice !== undefined
        ? Number(body.supplierPrice)
        : body.purchasePrice !== undefined
        ? Number(body.purchasePrice)
        : Number(existingData.supplierPrice ?? existingData.purchasePrice ?? 0);

    const purchaseUnitCost =
      body.purchaseUnitCost !== undefined
        ? Number(body.purchaseUnitCost)
        : existingData.purchaseUnitCost;

    if (purchaseUnitCost && Number(purchaseUnitCost) > 0) {
      baseUnitSupplierPrice = Math.round(Number(purchaseUnitCost) / (conversionQty > 0 ? conversionQty : 1));
    }

    const discount =
      body.purchaseDiscount !== undefined
        ? Number(body.purchaseDiscount)
        : Number(existingData.purchaseDiscount || 0);

    const additional =
      body.additionalCost !== undefined
        ? Number(body.additionalCost)
        : Number(existingData.additionalCost || 0);

    const calculatedHpp = Math.max(0, baseUnitSupplierPrice - discount + additional);

    const markupPct =
      body.markupPercentage !== undefined
        ? Number(body.markupPercentage)
        : Number(existingData.markupPercentage || 0);

    const recommendedPrice = Math.round(calculatedHpp * (1 + markupPct / 100));

    const updateData: Record<string, any> = {
      ...body,
      supplierPrice: baseUnitSupplierPrice,
      purchaseDiscount: discount,
      additionalCost: additional,
      conversionQty: conversionQty > 0 ? conversionQty : 1,
      costPrice: calculatedHpp,
      purchasePrice: calculatedHpp, // Synced as standard purchase price for backward-compatibility
      markupPercentage: markupPct,
      recommendedPrice,
      updatedAt: new Date(),
    };

    // Remove undefined values
    Object.keys(updateData).forEach((key) => {
      if (updateData[key] === undefined) {
        delete updateData[key];
      }
    });

    await docRef.update(updateData);

    return NextResponse.json(
      {
        success: true,
        message: 'Produk berhasil diperbarui',
        data: { id, ...existingData, ...updateData },
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('[API /api/products/[id] PUT Error]:', error);
    return NextResponse.json(
      { success: false, message: error?.message || 'Gagal mengedit produk' },
      { status: 500 }
    );
  }
}

// PATCH /api/products/[id] -> Toggle status or partial update
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();

    if (!id) {
      return NextResponse.json(
        { success: false, message: 'Product ID wajib diisi' },
        { status: 400 }
      );
    }

    const docRef = adminDb.collection('products').doc(id);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return NextResponse.json(
        { success: false, message: 'Produk tidak ditemukan' },
        { status: 404 }
      );
    }

    await docRef.update({
      ...body,
      updatedAt: new Date(),
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Status produk berhasil diperbarui',
        data: { id, ...docSnap.data(), ...body },
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('[API /api/products/[id] PATCH Error]:', error);
    return NextResponse.json(
      { success: false, message: error?.message || 'Gagal mengubah status produk' },
      { status: 500 }
    );
  }
}

// DELETE /api/products/[id] -> Soft delete (set status = 'inactive')
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { success: false, message: 'Product ID wajib diisi' },
        { status: 400 }
      );
    }

    const docRef = adminDb.collection('products').doc(id);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return NextResponse.json(
        { success: false, message: 'Produk tidak ditemukan' },
        { status: 404 }
      );
    }

    await docRef.update({
      status: 'inactive',
      updatedAt: new Date(),
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Produk berhasil dinonaktifkan',
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('[API /api/products/[id] DELETE Error]:', error);
    return NextResponse.json(
      { success: false, message: error?.message || 'Gagal menonaktifkan produk' },
      { status: 500 }
    );
  }
}
