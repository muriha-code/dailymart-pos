import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { Product } from "@/types/product.types";

// Master Kategori Data
const CATEGORIES = [
  {
    id: "cat_makanan",
    name: "Makanan",
    description: "Makanan Instan & Olahan",
  },
  {
    id: "cat_minuman",
    name: "Minuman",
    description: "Minuman Kemasan, Air Mineral, Susu, Kopi",
  },
  {
    id: "cat_snack",
    name: "Snack & Biskuit",
    description: "Camilan, Biskuit, Keripik",
  },
  {
    id: "cat_sembako",
    name: "Sembako",
    description: "Beras, Minyak Goreng, Gula, Tepung, Bumbu Dapur",
  },
  {
    id: "cat_perawatan",
    name: "Perawatan Diri",
    description: "Sabun, Sampo, Pasta Gigi, Deodoran",
  },
  {
    id: "cat_kebersihan",
    name: "Kebersihan Rumah",
    description: "Deterjen, Pembersih Lantai, Cuci Piring",
  },
];

// Master Supplier Data
const SUPPLIERS = [
  {
    id: "sup_indofood",
    name: "PT Indofood Sukses Makmur Tbk",
    contactPerson: "Budi Santoso",
    phone: "021-57958822",
    address: "Sudirman Plaza, Jakarta Selatan",
  },
  {
    id: "sup_wings",
    name: "Wings Surya Group",
    contactPerson: "Hendra Wijaya",
    phone: "031-5312345",
    address: "Jl. Tipar Cakung, Jakarta Timur",
  },
  {
    id: "sup_unilever",
    name: "PT Unilever Indonesia Tbk",
    contactPerson: "Siti Rahma",
    phone: "021-80827000",
    address: "BSD City, Tangerang Selatan",
  },
  {
    id: "sup_mayora",
    name: "PT Mayora Indah Tbk",
    contactPerson: "Agus Pratama",
    phone: "021-5655308",
    address: "Jl. Tomang Raya, Jakarta Barat",
  },
];

// Master 35 Produk Ritel Indonesia Realistis
const PRODUCTS: Omit<Product, "id">[] = [
  // 1. Makanan Instan (6 Produk)
  {
    sku: "DM-MKN-001",
    barcode: "8998866200112",
    name: "Indomie Goreng Spesial 85g",
    categoryId: "cat_makanan",
    categoryName: "Makanan",
    supplierId: "sup_indofood",
    purchasePrice: 2800,
    sellingPrice: 3200,
    stock: 120,
    minimumStock: 20,
    unit: "Bungkus",
    status: "active",
  },
  {
    sku: "DM-MKN-002",
    barcode: "8998866200113",
    name: "Indomie Kuah Ayam Bawang 75g",
    categoryId: "cat_makanan",
    categoryName: "Makanan",
    supplierId: "sup_indofood",
    purchasePrice: 2700,
    sellingPrice: 3100,
    stock: 100,
    minimumStock: 20,
    unit: "Bungkus",
    status: "active",
  },
  {
    sku: "DM-MKN-003",
    barcode: "8998866200114",
    name: "Pop Mie Rasa Ayam 75g",
    categoryId: "cat_makanan",
    categoryName: "Makanan",
    supplierId: "sup_indofood",
    purchasePrice: 4500,
    sellingPrice: 5500,
    stock: 45,
    minimumStock: 10,
    unit: "Cup",
    status: "active",
  },
  {
    sku: "DM-MKN-004",
    barcode: "8998866200115",
    name: "Sarden ABC Saus Tomat 155g",
    categoryId: "cat_makanan",
    categoryName: "Makanan",
    supplierId: "sup_indofood",
    purchasePrice: 9500,
    sellingPrice: 11200,
    originalPrice: 12500,
    discountAmount: 1300,
    discountPercentage: 10,
    stock: 35,
    minimumStock: 5,
    unit: "Kaleng",
    status: "active",
  },
  {
    sku: "DM-MKN-005",
    barcode: "8998866200116",
    name: "Supermi Rasa Ayam Bawang 70g",
    categoryId: "cat_makanan",
    categoryName: "Makanan",
    supplierId: "sup_indofood",
    purchasePrice: 2600,
    sellingPrice: 3000,
    stock: 80,
    minimumStock: 15,
    unit: "Bungkus",
    status: "active",
  },
  {
    sku: "DM-MKN-006",
    barcode: "8998866200117",
    name: "Mie Sedaap Goreng Original 90g",
    categoryId: "cat_makanan",
    categoryName: "Makanan",
    supplierId: "sup_wings",
    purchasePrice: 2750,
    sellingPrice: 3150,
    stock: 90,
    minimumStock: 15,
    unit: "Bungkus",
    status: "active",
  },

  // 2. Minuman Kemasan (6 Produk)
  {
    sku: "DM-MNM-001",
    barcode: "8996001300018",
    name: "Aqua Air Mineral Botol 600ml",
    categoryId: "cat_minuman",
    categoryName: "Minuman",
    supplierId: "sup_indofood",
    purchasePrice: 2800,
    sellingPrice: 3500,
    stock: 95,
    minimumStock: 15,
    unit: "Botol",
    status: "active",
  },
  {
    sku: "DM-MNM-002",
    barcode: "8996001300019",
    name: "Teh Botol Sosro Kotak 250ml",
    categoryId: "cat_minuman",
    categoryName: "Minuman",
    supplierId: "sup_indofood",
    purchasePrice: 3200,
    sellingPrice: 4000,
    stock: 80,
    minimumStock: 10,
    unit: "Kotak",
    status: "active",
  },
  {
    sku: "DM-MNM-003",
    barcode: "8996001300020",
    name: "Ultra Milk Cokelat 200ml",
    categoryId: "cat_minuman",
    categoryName: "Minuman",
    supplierId: "sup_indofood",
    purchasePrice: 5000,
    sellingPrice: 6000,
    originalPrice: 7000,
    discountAmount: 1000,
    discountPercentage: 14,
    stock: 55,
    minimumStock: 10,
    unit: "Kotak",
    status: "active",
  },
  {
    sku: "DM-MNM-004",
    barcode: "8996001300021",
    name: "Le Minerale Botol 600ml",
    categoryId: "cat_minuman",
    categoryName: "Minuman",
    supplierId: "sup_mayora",
    purchasePrice: 2700,
    sellingPrice: 3400,
    stock: 75,
    minimumStock: 12,
    unit: "Botol",
    status: "active",
  },
  {
    sku: "DM-MNM-005",
    barcode: "8996001300022",
    name: "Teh Pucuk Harum 350ml",
    categoryId: "cat_minuman",
    categoryName: "Minuman",
    supplierId: "sup_mayora",
    purchasePrice: 3100,
    sellingPrice: 4000,
    stock: 60,
    minimumStock: 10,
    unit: "Botol",
    status: "active",
  },
  {
    sku: "DM-MNM-006",
    barcode: "8996001300023",
    name: "Kopiko 78C Coffee Latte 240ml",
    categoryId: "cat_minuman",
    categoryName: "Minuman",
    supplierId: "sup_mayora",
    purchasePrice: 5800,
    sellingPrice: 7000,
    stock: 40,
    minimumStock: 8,
    unit: "Botol",
    status: "active",
  },

  // 3. Snack & Biskuit (6 Produk)
  {
    sku: "DM-SNK-001",
    barcode: "8991002100511",
    name: "Silverqueen Cashew 58g",
    categoryId: "cat_snack",
    categoryName: "Snack & Biskuit",
    supplierId: "sup_mayora",
    purchasePrice: 13500,
    sellingPrice: 16500,
    originalPrice: 18500,
    discountAmount: 2000,
    discountPercentage: 11,
    stock: 4, // low stock test
    minimumStock: 5,
    unit: "Pcs",
    status: "active",
  },
  {
    sku: "DM-SNK-002",
    barcode: "8991002100512",
    name: "Chitato Sapi Panggang 68g",
    categoryId: "cat_snack",
    categoryName: "Snack & Biskuit",
    supplierId: "sup_indofood",
    purchasePrice: 8500,
    sellingPrice: 10500,
    stock: 42,
    minimumStock: 5,
    unit: "Bungkus",
    status: "active",
  },
  {
    sku: "DM-SNK-003",
    barcode: "8991002100513",
    name: "Oreo Vanilla Sandwich 133g",
    categoryId: "cat_snack",
    categoryName: "Snack & Biskuit",
    supplierId: "sup_mayora",
    purchasePrice: 7800,
    sellingPrice: 9500,
    stock: 30,
    minimumStock: 5,
    unit: "Bungkus",
    status: "active",
  },
  {
    sku: "DM-SNK-004",
    barcode: "8991002100514",
    name: "Beng Beng Chocolate Wafer 20g",
    categoryId: "cat_snack",
    categoryName: "Snack & Biskuit",
    supplierId: "sup_mayora",
    purchasePrice: 2000,
    sellingPrice: 2500,
    stock: 120,
    minimumStock: 20,
    unit: "Pcs",
    status: "active",
  },
  {
    sku: "DM-SNK-005",
    barcode: "8991002100515",
    name: "Roma Kelapa Biskuit 300g",
    categoryId: "cat_snack",
    categoryName: "Snack & Biskuit",
    supplierId: "sup_mayora",
    purchasePrice: 9500,
    sellingPrice: 11500,
    stock: 25,
    minimumStock: 5,
    unit: "Bungkus",
    status: "active",
  },
  {
    sku: "DM-SNK-006",
    barcode: "8991002100516",
    name: "Taro Net Seaweed 36g",
    categoryId: "cat_snack",
    categoryName: "Snack & Biskuit",
    supplierId: "sup_indofood",
    purchasePrice: 4200,
    sellingPrice: 5200,
    stock: 50,
    minimumStock: 10,
    unit: "Bungkus",
    status: "active",
  },

  // 4. Sembako (6 Produk)
  {
    sku: "DM-SBK-001",
    barcode: "8992753123456",
    name: "Beras Premium Ramos 5kg",
    categoryId: "cat_sembako",
    categoryName: "Sembako",
    supplierId: "sup_wings",
    purchasePrice: 65000,
    sellingPrice: 74000,
    stock: 28,
    minimumStock: 5,
    unit: "Sak",
    status: "active",
  },
  {
    sku: "DM-SBK-002",
    barcode: "8992753123457",
    name: "Minyak Goreng Bimoli 2L",
    categoryId: "cat_sembako",
    categoryName: "Sembako",
    supplierId: "sup_indofood",
    purchasePrice: 32500,
    sellingPrice: 36500,
    originalPrice: 39000,
    discountAmount: 2500,
    discountPercentage: 6,
    stock: 45,
    minimumStock: 5,
    unit: "Pouch",
    status: "active",
  },
  {
    sku: "DM-SBK-003",
    barcode: "8992753123458",
    name: "Gulaku Gula Pasir Putih 1kg",
    categoryId: "cat_sembako",
    categoryName: "Sembako",
    supplierId: "sup_indofood",
    purchasePrice: 15000,
    sellingPrice: 17500,
    stock: 60,
    minimumStock: 10,
    unit: "Bungkus",
    status: "active",
  },
  {
    sku: "DM-SBK-004",
    barcode: "8992753123459",
    name: "Segitiga Biru Tepung Terigu 1kg",
    categoryId: "cat_sembako",
    categoryName: "Sembako",
    supplierId: "sup_indofood",
    purchasePrice: 11000,
    sellingPrice: 13000,
    stock: 35,
    minimumStock: 8,
    unit: "Bungkus",
    status: "active",
  },
  {
    sku: "DM-SBK-005",
    barcode: "8992753123460",
    name: "Royco Rasa Sapi 230g",
    categoryId: "cat_sembako",
    categoryName: "Sembako",
    supplierId: "sup_unilever",
    purchasePrice: 9000,
    sellingPrice: 10800,
    stock: 50,
    minimumStock: 10,
    unit: "Bungkus",
    status: "active",
  },
  {
    sku: "DM-SBK-006",
    barcode: "8992753123461",
    name: "Bango Kecap Manis 520ml",
    categoryId: "cat_sembako",
    categoryName: "Sembako",
    supplierId: "sup_unilever",
    purchasePrice: 20500,
    sellingPrice: 24000,
    stock: 40,
    minimumStock: 6,
    unit: "Pouch",
    status: "active",
  },

  // 5. Perawatan Diri (6 Produk)
  {
    sku: "DM-PRW-001",
    barcode: "8993005200311",
    name: "Lifebuoy Sabun Cair Total 10 400ml",
    categoryId: "cat_perawatan",
    categoryName: "Perawatan Diri",
    supplierId: "sup_unilever",
    purchasePrice: 21000,
    sellingPrice: 25500,
    stock: 18,
    minimumStock: 5,
    unit: "Pouch",
    status: "active",
  },
  {
    sku: "DM-PRW-002",
    barcode: "8993005200312",
    name: "Clear Shampoo Men Cool Sport 160ml",
    categoryId: "cat_perawatan",
    categoryName: "Perawatan Diri",
    supplierId: "sup_unilever",
    purchasePrice: 24000,
    sellingPrice: 28900,
    originalPrice: 32000,
    discountAmount: 3100,
    discountPercentage: 10,
    stock: 12,
    minimumStock: 5,
    unit: "Botol",
    status: "active",
  },
  {
    sku: "DM-PRW-003",
    barcode: "8993005200313",
    name: "Pepsodent Pencegah Gigi Berlubang 190g",
    categoryId: "cat_perawatan",
    categoryName: "Perawatan Diri",
    supplierId: "sup_unilever",
    purchasePrice: 12000,
    sellingPrice: 14500,
    stock: 50,
    minimumStock: 10,
    unit: "Tube",
    status: "active",
  },
  {
    sku: "DM-PRW-004",
    barcode: "8993005200314",
    name: "Rexona Men Roll On Ice Cool 50ml",
    categoryId: "cat_perawatan",
    categoryName: "Perawatan Diri",
    supplierId: "sup_unilever",
    purchasePrice: 16500,
    sellingPrice: 19800,
    stock: 22,
    minimumStock: 5,
    unit: "Botol",
    status: "active",
  },
  {
    sku: "DM-PRW-005",
    barcode: "8993005200315",
    name: "Lux Botanicals Body Wash 450ml",
    categoryId: "cat_perawatan",
    categoryName: "Perawatan Diri",
    supplierId: "sup_unilever",
    purchasePrice: 22500,
    sellingPrice: 27000,
    stock: 15,
    minimumStock: 5,
    unit: "Pouch",
    status: "active",
  },
  {
    sku: "DM-PRW-006",
    barcode: "8993005200316",
    name: "Gatsby Hair Gel Super Hold 150g",
    categoryId: "cat_perawatan",
    categoryName: "Perawatan Diri",
    supplierId: "sup_wings",
    purchasePrice: 13000,
    sellingPrice: 15500,
    stock: 30,
    minimumStock: 5,
    unit: "Tube",
    status: "active",
  },

  // 6. Kebersihan Rumah (5 Produk) -> Total 35 Produk!
  {
    sku: "DM-KBH-001",
    barcode: "8994006100111",
    name: "Rinso Anti Noda Bubuk 770g",
    categoryId: "cat_kebersihan",
    categoryName: "Kebersihan Rumah",
    supplierId: "sup_unilever",
    purchasePrice: 21500,
    sellingPrice: 24900,
    stock: 22,
    minimumStock: 5,
    unit: "Bungkus",
    status: "active",
  },
  {
    sku: "DM-KBH-002",
    barcode: "8994006100112",
    name: "Sunlight Pencuci Piring Jeruk Nipis 750ml",
    categoryId: "cat_kebersihan",
    categoryName: "Kebersihan Rumah",
    supplierId: "sup_unilever",
    purchasePrice: 14000,
    sellingPrice: 16500,
    stock: 35,
    minimumStock: 5,
    unit: "Pouch",
    status: "active",
  },
  {
    sku: "DM-KBH-003",
    barcode: "8994006100113",
    name: "So Klin Pembersih Lantai Lavender 780ml",
    categoryId: "cat_kebersihan",
    categoryName: "Kebersihan Rumah",
    supplierId: "sup_wings",
    purchasePrice: 10500,
    sellingPrice: 12800,
    stock: 40,
    minimumStock: 8,
    unit: "Pouch",
    status: "active",
  },
  {
    sku: "DM-KBH-004",
    barcode: "8994006100114",
    name: "Daia Deterjen Bubuk Bunga 850g",
    categoryId: "cat_kebersihan",
    categoryName: "Kebersihan Rumah",
    supplierId: "sup_wings",
    purchasePrice: 17000,
    sellingPrice: 19500,
    stock: 30,
    minimumStock: 5,
    unit: "Bungkus",
    status: "active",
  },
  {
    sku: "DM-KBH-005",
    barcode: "8994006100115",
    name: "Super Pell Pembersih Lantai Citrus 770ml",
    categoryId: "cat_kebersihan",
    categoryName: "Kebersihan Rumah",
    supplierId: "sup_unilever",
    purchasePrice: 12500,
    sellingPrice: 15000,
    stock: 25,
    minimumStock: 5,
    unit: "Pouch",
    status: "active",
  },
];

/**
 * Helper function untuk menghapus seluruh key yang bernilai `undefined`
 * agar Firestore Admin SDK tidak melempar exception 500.
 */
function cleanUndefinedFields<T extends Record<string, any>>(obj: T): T {
  const result: Record<string, any> = {};
  Object.keys(obj).forEach((key) => {
    if (obj[key] !== undefined) {
      result[key] = obj[key];
    }
  });
  return result as T;
}

// POST /api/seed -> Inisialisasi Database Seeder Firestore
export async function POST(req: NextRequest) {
  try {
    const batch = adminDb.batch();
    const now = new Date();

    // 1. Seed Master Categories
    CATEGORIES.forEach((cat) => {
      const docRef = adminDb.collection("categories").doc(cat.id);
      const categoryData = cleanUndefinedFields({
        name: cat.name ?? "",
        description: cat.description ?? "",
        createdAt: now,
        updatedAt: now,
      });
      batch.set(docRef, categoryData, { merge: true });
    });

    // 2. Seed Master Suppliers
    SUPPLIERS.forEach((sup) => {
      const docRef = adminDb.collection("suppliers").doc(sup.id);
      const supplierData = cleanUndefinedFields({
        name: sup.name ?? "",
        contactPerson: sup.contactPerson ?? "",
        phone: sup.phone ?? "",
        address: sup.address ?? "",
        createdAt: now,
        updatedAt: now,
      });
      batch.set(docRef, supplierData, { merge: true });
    });

    // 3. Seed Master 35 Products
    PRODUCTS.forEach((prod) => {
      // Doc ID berbasis SKU (misal: doc("prod_DM-MKN-001"))
      const docId = `prod_${prod.sku}`;
      const docRef = adminDb.collection("products").doc(docId);

      const productData = cleanUndefinedFields({
        sku: String(prod.sku),
        barcode: prod.barcode ? String(prod.barcode) : null,
        name: String(prod.name),
        description: prod.description ? String(prod.description) : "",
        categoryId: String(prod.categoryId),
        categoryName: prod.categoryName ? String(prod.categoryName) : "",
        supplierId: prod.supplierId ? String(prod.supplierId) : null,
        purchasePrice: Number(prod.purchasePrice || 0),
        sellingPrice: Number(prod.sellingPrice || 0),
        originalPrice: prod.originalPrice !== undefined ? Number(prod.originalPrice) : null,
        discountAmount: prod.discountAmount !== undefined ? Number(prod.discountAmount) : 0,
        discountPercentage: prod.discountPercentage !== undefined ? Number(prod.discountPercentage) : 0,
        stock: Number(prod.stock || 0),
        minimumStock: Number(prod.minimumStock || 0),
        unit: String(prod.unit || "Pcs"),
        imageUrl: prod.imageUrl ? String(prod.imageUrl) : null,
        status: prod.status || "active",
        createdAt: now,
        updatedAt: now,
      });

      batch.set(docRef, productData, { merge: true });
    });

    // Commit seluruh data secara atomik
    await batch.commit();

    return NextResponse.json(
      {
        success: true,
        message: "Berhasil menginisialisasi 35 produk ke database",
        data: {
          categoriesCount: CATEGORIES.length,
          suppliersCount: SUPPLIERS.length,
          productsCount: PRODUCTS.length,
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("[API /api/seed POST Error]:", error);
    return NextResponse.json(
      {
        success: false,
        message: error?.message || "Gagal melakukan seeding data ke Firestore.",
        stack: process.env.NODE_ENV === "development" ? error?.stack : undefined,
        code: error?.code || error?.name || "InternalServerError",
      },
      { status: 500 }
    );
  }
}

// GET /api/seed -> Info instruksi seeder
export async function GET() {
  return NextResponse.json(
    {
      success: true,
      message: "DailyMart POS Database Seeder Ready. Kirim HTTP POST ke /api/seed untuk mengeksekusi seeding 35 produk.",
    },
    { status: 200 }
  );
}
