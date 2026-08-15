import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { Product } from '@/types/product.types';
import type { Query, QueryDocumentSnapshot, DocumentData } from 'firebase-admin/firestore';

const FALLBACK_PRODUCTS: Product[] = [
  {
    id: "prod-001",
    sku: "SM-BRS-001",
    barcode: "8992753123456",
    name: "Beras Premium Ramos 5kg",
    categoryId: "sembako",
    categoryName: "Sembako",
    purchasePrice: 65000,
    sellingPrice: 74000,
    stock: 28,
    minimumStock: 5,
    unit: "sak",
    status: "active",
  },
  {
    id: "prod-002",
    sku: "SM-MYK-002",
    barcode: "8992753123457",
    name: "Minyak Goreng Sania 2L",
    categoryId: "sembako",
    categoryName: "Sembako",
    purchasePrice: 32000,
    sellingPrice: 36500,
    originalPrice: 39000,
    discountAmount: 2500,
    discountPercentage: 6,
    stock: 45,
    minimumStock: 5,
    unit: "pouch",
    status: "active",
  },
  {
    id: "prod-003",
    sku: "SM-GLA-003",
    barcode: "8992753123458",
    name: "Gulaku Gula Pasir Putih 1kg",
    categoryId: "sembako",
    categoryName: "Sembako",
    purchasePrice: 15000,
    sellingPrice: 17500,
    stock: 60,
    minimumStock: 10,
    unit: "bks",
    status: "active",
  },
  {
    id: "prod-004",
    sku: "MK-MIE-001",
    barcode: "8998866200112",
    name: "Indomie Goreng Spesial 85g",
    categoryId: "makanan",
    categoryName: "Makanan",
    purchasePrice: 2800,
    sellingPrice: 3200,
    stock: 150,
    minimumStock: 20,
    unit: "bks",
    status: "active",
  },
  {
    id: "prod-005",
    sku: "MK-MIE-002",
    barcode: "8998866200113",
    name: "Indomie Kuah Ayam Bawang 75g",
    categoryId: "makanan",
    categoryName: "Makanan",
    purchasePrice: 2700,
    sellingPrice: 3100,
    stock: 120,
    minimumStock: 20,
    unit: "bks",
    status: "active",
  },
  {
    id: "prod-006",
    sku: "MK-SBN-003",
    barcode: "8998866200114",
    name: "Sarden ABC Saus Tomat 155g",
    categoryId: "makanan",
    categoryName: "Makanan",
    purchasePrice: 9500,
    sellingPrice: 11200,
    originalPrice: 12500,
    discountAmount: 1300,
    discountPercentage: 10,
    stock: 35,
    minimumStock: 5,
    unit: "klg",
    status: "active",
  },
  {
    id: "prod-007",
    sku: "MN-AIR-001",
    barcode: "8996001300018",
    name: "Aqua Air Mineral Botol 600ml",
    categoryId: "minuman",
    categoryName: "Minuman",
    purchasePrice: 2800,
    sellingPrice: 3500,
    stock: 95,
    minimumStock: 15,
    unit: "btl",
    status: "active",
  },
  {
    id: "prod-008",
    sku: "MN-TEH-002",
    barcode: "8996001300019",
    name: "Teh Botol Sosro Kotak 250ml",
    categoryId: "minuman",
    categoryName: "Minuman",
    purchasePrice: 3200,
    sellingPrice: 4000,
    stock: 80,
    minimumStock: 10,
    unit: "kotak",
    status: "active",
  },
  {
    id: "prod-009",
    sku: "MN-SUS-003",
    barcode: "8996001300020",
    name: "Ultra Milk Cokelat 200ml",
    categoryId: "minuman",
    categoryName: "Minuman",
    purchasePrice: 5000,
    sellingPrice: 6000,
    originalPrice: 7000,
    discountAmount: 1000,
    discountPercentage: 14,
    stock: 55,
    minimumStock: 10,
    unit: "kotak",
    status: "active",
  },
  {
    id: "prod-010",
    sku: "SN-CKLT-001",
    barcode: "8991002100511",
    name: "Silverqueen Cashew 58g",
    categoryId: "snack",
    categoryName: "Snack & Biskuit",
    purchasePrice: 13500,
    sellingPrice: 16500,
    originalPrice: 18500,
    discountAmount: 2000,
    discountPercentage: 11,
    stock: 4, // low stock test
    minimumStock: 5,
    unit: "pcs",
    status: "active",
  },
  {
    id: "prod-011",
    sku: "SN-KRPK-002",
    barcode: "8991002100512",
    name: "Chitato Sapi Panggang 68g",
    categoryId: "snack",
    categoryName: "Snack & Biskuit",
    purchasePrice: 8500,
    sellingPrice: 10500,
    stock: 42,
    minimumStock: 5,
    unit: "bks",
    status: "active",
  },
  {
    id: "prod-012",
    sku: "SN-BSKT-003",
    barcode: "8991002100513",
    name: "Oreo Vanilla Sandwich 133g",
    categoryId: "snack",
    categoryName: "Snack & Biskuit",
    purchasePrice: 7800,
    sellingPrice: 9500,
    stock: 30,
    minimumStock: 5,
    unit: "bks",
    status: "active",
  },
  {
    id: "prod-013",
    sku: "PW-SBN-001",
    barcode: "8993005200311",
    name: "Lifebuoy Sabun Cair Total 10 400ml",
    categoryId: "perawatan",
    categoryName: "Perawatan Diri",
    purchasePrice: 21000,
    sellingPrice: 25500,
    stock: 18,
    minimumStock: 5,
    unit: "pouch",
    status: "active",
  },
  {
    id: "prod-014",
    sku: "PW-SMP-002",
    barcode: "8993005200312",
    name: "Clear Shampoo Men Cool Sport 160ml",
    categoryId: "perawatan",
    categoryName: "Perawatan Diri",
    purchasePrice: 24000,
    sellingPrice: 28900,
    originalPrice: 32000,
    discountAmount: 3100,
    discountPercentage: 10,
    stock: 12,
    minimumStock: 5,
    unit: "btl",
    status: "active",
  },
  {
    id: "prod-015",
    sku: "PW-SGT-003",
    barcode: "8993005200313",
    name: "Pepsodent Pencegah Gigi Berlubang 190g",
    categoryId: "perawatan",
    categoryName: "Perawatan Diri",
    purchasePrice: 12000,
    sellingPrice: 14500,
    stock: 50,
    minimumStock: 10,
    unit: "tube",
    status: "active",
  },
  {
    id: "prod-016",
    sku: "KB-DET-001",
    barcode: "8994006100111",
    name: "Rinso Anti Noda Bubuk 770g",
    categoryId: "kebersihan",
    categoryName: "Kebersihan Rumah",
    purchasePrice: 21500,
    sellingPrice: 24900,
    stock: 22,
    minimumStock: 5,
    unit: "bks",
    status: "active",
  },
  {
    id: "prod-017",
    sku: "KB-PLN-002",
    barcode: "8994006100112",
    name: "Sunlight Pencuci Piring Jeruk Nipis 750ml",
    categoryId: "kebersihan",
    categoryName: "Kebersihan Rumah",
    purchasePrice: 14000,
    sellingPrice: 16500,
    stock: 35,
    minimumStock: 5,
    unit: "pouch",
    status: "active",
  },
  {
    id: "prod-018",
    sku: "OB-FLU-001",
    barcode: "8995007100011",
    name: "Panadol Extra Paracetamol 10 Kaplet",
    categoryId: "obat",
    categoryName: "Obat & P3K",
    purchasePrice: 11000,
    sellingPrice: 13500,
    stock: 65,
    minimumStock: 10,
    unit: "strip",
    status: "active",
  },
];

// GET /api/products -> Mengambil daftar produk dengan filter search, categoryId, dan status
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const search = searchParams.get('search')?.toLowerCase();
  const categoryId = searchParams.get('categoryId');
  const status = searchParams.get('status');

  try {
    let query: Query = adminDb.collection('products');

    // Filter status jika spesifik ('active' / 'inactive'). Jika 'all', ambil seluruh status.
    if (status && status !== 'all') {
      query = query.where('status', '==', status);
    }

    if (categoryId && categoryId !== 'all') {
      query = query.where('categoryId', '==', categoryId);
    }

    const snapshot = await query.get();
    let products: Product[] = [];

    if (snapshot.empty) {
      // Jika koleksi Firestore masih kosong, gunakan fallback produk
      products = FALLBACK_PRODUCTS;
    } else {
      products = snapshot.docs.map((doc: QueryDocumentSnapshot<DocumentData>) => ({
        id: doc.id,
        ...doc.data(),
      })) as Product[];
    }

    // Filter status & kategori jika fallback
    if (snapshot.empty) {
      if (status && status !== 'all') {
        products = products.filter((p) => p.status === status);
      }
      if (categoryId && categoryId !== 'all') {
        products = products.filter((p) => p.categoryId === categoryId);
      }
    }

    // Filter nama/SKU/barcode manual di memori jika ada query search
    if (search) {
      products = products.filter(
        (p) =>
          p.name.toLowerCase().includes(search) ||
          p.sku.toLowerCase().includes(search) ||
          (p.barcode && p.barcode.toLowerCase().includes(search))
      );
    }

    return NextResponse.json({ success: true, data: products }, { status: 200 });
  } catch (error: any) {
    console.error('[API /api/products GET Error]:', error?.message || error);

    // Fallback jika Firestore belum diinisialisasi atau error kredensial
    let fallback = FALLBACK_PRODUCTS;
    if (status && status !== 'all') {
      fallback = fallback.filter((p) => p.status === status);
    }
    if (categoryId && categoryId !== 'all') {
      fallback = fallback.filter((p) => p.categoryId === categoryId);
    }
    if (search) {
      fallback = fallback.filter(
        (p) =>
          p.name.toLowerCase().includes(search) ||
          p.sku.toLowerCase().includes(search) ||
          (p.barcode && p.barcode.toLowerCase().includes(search))
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: fallback,
        warning: 'Menggunakan fallback data karena Firestore belum terhubung.',
      },
      { status: 200 }
    );
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
    console.error('[API /api/products POST Error]:', error?.message || error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}