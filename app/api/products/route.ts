import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { Product } from '@/types/product.types';
import type { Query, QueryDocumentSnapshot, DocumentData } from 'firebase-admin/firestore';

// GET /api/products -> Mengambil daftar produk
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search')?.toLowerCase();
    const categoryId = searchParams.get('categoryId');

    let query: Query = adminDb.collection('products').where('status', '==', 'active');

    if (categoryId) {
      query = query.where('categoryId', '==', categoryId);
    }

    const snapshot = await query.get();
    let products = snapshot.docs.map((doc: QueryDocumentSnapshot<DocumentData>) => ({
      id: doc.id,
      ...doc.data(),
    })) as Product[];

    // Filter nama/SKU manual di memori jika ada search
    if (search) {
      products = products.filter(
        (p) => p.name.toLowerCase().includes(search) || p.sku.toLowerCase().includes(search)
      );
    }

    return NextResponse.json({ success: true, data: products }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

// POST /api/products -> Menambah produk baru
export async function POST(req: NextRequest) {
  try {
    const body: Product = await req.json();

    // Validasi basic
    if (!body.sku || !body.name || body.purchasePrice == null || body.sellingPrice == null) {
      return NextResponse.json(
        { success: false, message: 'SKU, Nama, Harga Beli, dan Harga Jual wajib diisi' },
        { status: 400 }
      );
    }

    if (body.purchasePrice < 0 || body.sellingPrice < 0 || (body.stock && body.stock < 0)) {
      return NextResponse.json(
        { success: false, message: 'Harga dan stok tidak boleh bernilai negatif' },
        { status: 400 }
      );
    }

    // Cek duplikasi SKU
    const existingSku = await adminDb.collection('products').where('sku', '==', body.sku).get();
    if (!existingSku.empty) {
      return NextResponse.json(
        { success: false, message: 'SKU produk sudah terdaftar' },
        { status: 400 }
      );
    }

    const newProduct = {
      ...body,
      barcode: body.barcode || null,
      stock: body.stock || 0,
      minimumStock: body.minimumStock || 5,
      unit: body.unit || 'Pcs',
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const docRef = await adminDb.collection('products').add(newProduct);

    return NextResponse.json(
      { success: true, message: 'Produk berhasil ditambahkan', data: { id: docRef.id, ...newProduct } },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}