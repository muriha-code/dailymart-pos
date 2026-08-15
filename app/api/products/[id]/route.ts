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

    const updateData: Record<string, any> = {
      ...body,
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
        data: { id, ...docSnap.data(), ...updateData },
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
