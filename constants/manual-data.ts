export interface ManualStep {
  stepNumber: number;
  title: string;
  description: string;
  subSteps?: string[];
  warningOrTip?: {
    type: 'tip' | 'warning' | 'info';
    text: string;
  };
}

export interface ManualGuide {
  id: string;
  title: string;
  category: string;
  summary: string;
  badge?: string;
  badgeColor?: string; // Tailwind color classes
  iconName: string;
  estimatedReadTime: string;
  steps: ManualStep[];
  quickTips?: string[];
  relatedPath?: string;
  relatedLabel?: string;
}

export interface FAQItem {
  question: string;
  answer: string;
  category: string;
}

export interface RoleManualConfig {
  roleName: string;
  roleDescription: string;
  badgeBg: string;
  badgeText: string;
  guides: ManualGuide[];
  faqs: FAQItem[];
  shortcuts?: Array<{ keys: string[]; description: string }>;
}

export const MANUAL_DATA: Record<string, RoleManualConfig> = {
  admin: {
    roleName: "Administrator & Super Admin",
    roleDescription: "Panduan lengkap manajemen master data, konfigurasi pengguna, penjadwalan shift, monitoring riwayat transaksi seluruh kasir, laporan penjualan, arus kas, dan audit inventaris.",
    badgeBg: "bg-purple-100 dark:bg-purple-950/50 border-purple-800 dark:border-purple-300",
    badgeText: "text-purple-900 dark:text-purple-200",
    shortcuts: [
      { keys: ["Ctrl", "K"], description: "Fokus pencarian data & panduan cepat" },
      { keys: ["Ctrl", "P"], description: "Cetak laporan atau ekspor tabel" },
      { keys: ["Esc"], description: "Menutup modal pop-up yang sedang terbuka" }
    ],
    guides: [
      {
        id: "admin-master-data",
        title: "Manajemen Master Data Katalog Produk & Kategori",
        category: "Master Data",
        summary: "Kelola data produk ritel, barcode, kategori, harga modal & jual, stok minimum, serta penetapan supplier.",
        badge: "Katalog & Harga",
        badgeColor: "bg-blue-100 text-blue-900 dark:bg-blue-900/40 dark:text-blue-200",
        iconName: "Package",
        estimatedReadTime: "4 Menit",
        relatedPath: "/admin/products",
        relatedLabel: "Buka Katalog Produk",
        steps: [
          {
            stepNumber: 1,
            title: "Membuka Menu Katalog Produk",
            description: "Akses menu 'Katalog Produk' pada bilah navigasi kiri di bawah bagian Manajemen Utama.",
            subSteps: [
              "Periksa daftar produk yang sudah ada, gunakan bilah pencarian atau filter kategori untuk memfilter data.",
              "Klik tombol '+ Tambah Produk' di sudut kanan atas untuk mendaftarkan barang baru."
            ]
          },
          {
            stepNumber: 2,
            title: "Pengisian Informasi Detail Produk",
            description: "Lengkapi seluruh informasi wajib mengenai produk ritel:",
            subSteps: [
              "Nama Produk: Masukkan nama lengkap produk (contoh: 'Indomie Goreng Spesial 85g').",
              "Barcode / SKU: Scan barcode fisik menggunakan scanner atau ketikkan kode unik SKU.",
              "Kategori: Pilih kategori yang sesuai (misal: Makanan, Minuman, Sembako, Kebutuhan Rumah).",
              "Harga Modal (Cost) & Harga Jual: Tentukan harga beli pokok dan harga jual eceran.",
              "Stok Awal & Stok Minimum (Min Alert): Tetapkan ambang batas stok agar sistem memberi peringatan otomatis saat stok menipis.",
              "Unit Satuan: Pilih satuan (Pcs, Box, Pack, Botol, Sachet)."
            ],
            warningOrTip: {
              type: "tip",
              text: "Pastikan Barcode bersifat unik (tidak boleh duplikat) agar tidak terjadi konflik pembacaan saat kasir melakukan scan."
            }
          },
          {
            stepNumber: 3,
            title: "Upload & Pengaturan Foto Produk",
            description: "Unggah gambar produk berkualitas baik untuk mempermudah identifikasi kasir saat pencarian manual.",
            subSteps: [
              "Gunakan fitur crop atau background removal yang terintegrasi jika diperlukan.",
              "Klik tombol 'Simpan Produk' untuk mempublikasikan produk ke mesin POS kasir secara instan."
            ]
          },
          {
            stepNumber: 4,
            title: "Memperbarui Harga atau Menghapus Produk",
            description: "Untuk mengubah harga atau data produk, klik ikon Edit pada baris produk yang diinginkan.",
            subSteps: [
              "Perubahan harga jual langsung berlaku secara real-time pada seluruh mesin kasir.",
              "Produk yang sudah memiliki riwayat transaksi sebaiknya dinonaktifkan statusnya daripada dihapus permanen untuk menjaga integritas data laporan."
            ]
          }
        ],
        quickTips: [
          "Gunakan penamaan produk yang standar (Format: Merek - Jenis - Ukuran/Varian).",
          "Atur batas Stok Minimum minimal setara dengan rata-rata penjualan 3 hari (Lead Time pemesanan ke supplier)."
        ]
      },
      {
        id: "admin-users-schedules",
        title: "Manajemen Pengguna, Hak Akses & Penjadwalan Shift",
        category: "SDM & Keamanan",
        summary: "Buat dan kelola akun kasir/gudang, atur jadwal kerja mingguan, serta kelola hak akses berbasis peran (RBAC).",
        badge: "Akses & Jadwal",
        badgeColor: "bg-purple-100 text-purple-900 dark:bg-purple-900/40 dark:text-purple-200",
        iconName: "Users",
        estimatedReadTime: "5 Menit",
        relatedPath: "/admin/schedules",
        relatedLabel: "Buka Penjadwalan Shift",
        steps: [
          {
            stepNumber: 1,
            title: "Mendaftarkan Akun Karyawan Baru",
            description: "Buka menu 'Kelola Pengguna' di bilah navigasi admin.",
            subSteps: [
              "Klik '+ Tambah Pengguna' dan isi Nama Lengkap, Email, dan Kata Sandi awal.",
              "Pilih Role yang tepat: 'CASHIER' (Kasir), 'WAREHOUSE' (Staff Gudang), atau 'ADMIN' (Supervisor Toko).",
              "Pastikan status akun diset 'Aktif' agar karyawan dapat melakukan login."
            ],
            warningOrTip: {
              type: "warning",
              text: "Jangan memberikan role SUPER_ADMIN atau ADMIN kepada staf kasir/gudang umum demi menjaga keamanan akses laporan finansial dan pengaturan sistem."
            }
          },
          {
            stepNumber: 2,
            title: "Menyusun Jadwal & Penugasan Shift Kasir",
            description: "Buka menu 'Jadwal & Shift Kasir' untuk mengatur jadwal harian / mingguan.",
            subSteps: [
              "Pilih tanggal pada kalender atau tabel jadwal.",
              "Tentukan Shift (Shift 1 Pagi: 07:00 - 15:00, Shift 2 Siang: 15:00 - 23:00, dll.).",
              "Pilih nama Kasir yang bertugas dan mesin kasir yang digunakan.",
              "Klik 'Simpan Jadwal' untuk memvalidasi penugasan shift."
            ]
          },
          {
            stepNumber: 3,
            title: "Memantau Kepatuhan Shift Aktif",
            description: "Lihat status real-time apakah kasir yang bertugas sudah melakukan Clock-In dan membuka kasir.",
            subSteps: [
              "Kasir yang belum clock-in akan ditandai dengan status 'Menunggu Buka Shift'.",
              "Kasir yang sedang melayani transaksi aktif berstatus 'Shift Berjalan'."
            ]
          }
        ],
        quickTips: [
          "Pastikan setiap kasir memiliki akun tersendiri; dilarang keras berbagi 1 akun untuk 2 orang kasir guna akuntabilitas rekonsiliasi kas.",
          "Jadwal shift yang diatur dengan baik mencegah terjadinya selisih jam kerja dan mempermudah audit operasional."
        ]
      },
      {
        id: "admin-transaction-audit",
        title: "Monitoring & Audit Riwayat Transaksi Seluruh Kasir",
        category: "Transaksi & Audit",
        summary: "Pantau seluruh transaksi penjualan dari semua kasir, cetak ulang struk, dan investigasi rincian transaksi.",
        badge: "Audit Transaksi",
        badgeColor: "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-200",
        iconName: "Receipt",
        estimatedReadTime: "3 Menit",
        relatedPath: "/admin/transactions",
        relatedLabel: "Buka Riwayat Transaksi",
        steps: [
          {
            stepNumber: 1,
            title: "Mengakses Menu Riwayat Transaksi Global",
            description: "Masuk ke menu 'Riwayat Transaksi' di bawah bagian Akses Operasional Kasir pada navigasi admin.",
            subSteps: [
              "Halaman ini menampilkan seluruh transaksi masuk secara real-time dari semua terminal kasir toko."
            ]
          },
          {
            stepNumber: 2,
            title: "Pencarian Multi-Filter & Investigasi",
            description: "Gunakan filter yang tersedia untuk mencari transaksi spesifik saat ada komplain pelanggan atau audit kasir:",
            subSteps: [
              "Filter Rentang Tanggal: Tentukan tanggal awal dan akhir transaksi.",
              "Filter Kasir: Pilih kasir tertentu yang melayani transaksi.",
              "Filter Metode Pembayaran: Filter berdasarkan Tunai, QRIS, Kartu Debit, atau Transfer.",
              "Filter Nomor Nota / Invoice: Ketik nomor invoice (contoh: 'INV-20260906-001')."
            ]
          },
          {
            stepNumber: 3,
            title: "Melihat Rincian Item Belanja & Cetak Ulang Struk",
            description: "Klik pada baris transaksi atau tombol 'Detail' untuk membuka nota transaksi lengkap.",
            subSteps: [
              "Periksa rincian item barang, harga satuan, diskon, subtotal, nominal bayar, dan uang kembalian.",
              "Klik tombol 'Cetak Ulang Struk' (Thermal 58mm/80mm) atau 'Unduh Bukti PDF' jika pelanggan meminta salinan struk belanja."
            ]
          }
        ],
        quickTips: [
          "Audit berkala transaksi dengan diskon besar atau pembayaran tunai non-bulat untuk memverifikasi akurasi input kasir.",
          "Nomor Invoice POS DailyMart tersusun unik berbasis tanggal dan nomor urut transaksi."
        ]
      },
      {
        id: "admin-financial-reports",
        title: "Laporan Penjualan, Arus Kas & Analitik Bisnis",
        category: "Laporan & Keuangan",
        summary: "Analisis performa omset toko harian/bulanan, laba kotor, laporan arus kas (cash flow), dan rekapitulasi audit stok.",
        badge: "Keuangan & Laba",
        badgeColor: "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200",
        iconName: "TrendingUp",
        estimatedReadTime: "5 Menit",
        relatedPath: "/admin/reports/sales",
        relatedLabel: "Buka Laporan Penjualan",
        steps: [
          {
            stepNumber: 1,
            title: "Membaca Laporan Penjualan & Performa Produk",
            description: "Buka menu 'Laporan Penjualan' untuk melihat metrik utama performa ritel.",
            subSteps: [
              "Total Omset Bruto & Bersih: Total nilai transaksi setelah dikurangi diskon.",
              "Estimasi Gross Profit (Laba Kotor): Selisih antara harga jual dan harga modal pokok (COGS).",
              "Top Selling Products: Daftar 10 produk dengan volume penjualan tertinggi.",
              "Grafik Tren Penjualan: Pola waktu transaksi teramai untuk optimasi alokasi kasir."
            ]
          },
          {
            stepNumber: 2,
            title: "Menganalisis Laporan Arus Kas (Cash Flow)",
            description: "Buka menu 'Laporan Arus Kas' untuk memantau pergerakan kas fisik toko.",
            subSteps: [
              "Kas Masuk Penjualan Tunai vs Non-Tunai (QRIS & EDC).",
              "Modal Awal Kasir (Opening Cash Float) vs Kas Akhir diserahkan.",
              "Pencatatan Biaya Operasional Toko (Pengeluaran Kas Kecil / Petty Cash).",
              "Deteksi Selisih Kas (Cash Discrepancy) per kasir dan per shift."
            ],
            warningOrTip: {
              type: "tip",
              text: "Laporan Arus Kas memudahkan pencocokan setoran bank dengan total penerimaan QRIS & Debit harian."
            }
          },
          {
            stepNumber: 3,
            title: "Ekspor Laporan ke Excel / PDF",
            description: "Klik tombol 'Ekspor Excel (.xlsx)' atau 'Cetak Laporan PDF' di bagian atas halaman laporan untuk kebutuhan arsip pembukuan atau pelaporan pemilik toko."
          }
        ],
        quickTips: [
          "Bandingkan performa penjualan antar shift untuk mengevaluasi produktivitas staf kasir.",
          "Cek Laporan Stock Opname secara berkala untuk meminimalkan potensi kehilangan barang (shrinkage)."
        ]
      },
      {
        id: "admin-settings-security",
        title: "Pengaturan Toko, Format Struk & Keamanan Jaringan",
        category: "Pengaturan & Sistem",
        summary: "Konfigurasi informasi toko pada struk belanja, pembulatan harga, dan pembatasan IP whitelist kasir.",
        badge: "Konfigurasi",
        badgeColor: "bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-200",
        iconName: "Settings",
        estimatedReadTime: "3 Menit",
        relatedPath: "/admin/settings",
        relatedLabel: "Buka Pengaturan Sistem",
        steps: [
          {
            stepNumber: 1,
            title: "Identitas Toko & Header Struk",
            description: "Buka menu 'Pengaturan Sistem'. Atur Nama Toko, Alamat Lengkap, Nomor Telepon, dan Pesan Footer Struk (contoh: 'Barang yang sudah dibeli tidak dapat ditukar').",
            subSteps: [
              "Informasi ini akan otomatis tercetak pada header dan footer struk thermal kasir."
            ]
          },
          {
            stepNumber: 2,
            title: "Pengaturan Jaringan Whitelist (Super Admin)",
            description: "Untuk toko dengan kebijakan keamanan jaringan ketat, daftarkan IP Address router toko di menu 'Pengaturan Jaringan'.",
            subSteps: [
              "Hanya perangkat yang terhubung ke Wi-Fi / IP toko yang diizinkan membuka halaman kasir dan gudang."
            ]
          }
        ]
      }
    ],
    faqs: [
      {
        category: "Master Data",
        question: "Bagaimana cara mengubah harga jual produk secara massal?",
        answer: "Saat ini Anda dapat mengedit harga jual per produk melalui menu 'Katalog Produk' > tombol Edit. Untuk update massal, Anda dapat memanfaatkan template ekspor/impor file Excel yang tersedia pada menu katalog."
      },
      {
        category: "Kasir & Transaksi",
        question: "Apa yang harus dilakukan jika ada selisih kas fisik dengan kas sistem saat kasir tutup shift?",
        answer: "Buka menu 'Laporan Arus Kas' > pilih shift kasir terkait. Periksa rincian modal awal, total transaksi tunai, dan nominal kas fisik yang disetor kasir. Catat selisih tersebut pada berita acara rekonsiliasi kas harian."
      },
      {
        category: "Keamanan",
        question: "Bagaimana jika kasir lupa kata sandi login?",
        answer: "Admin dapat membuka menu 'Kelola Pengguna', klik tombol Edit pada nama kasir yang bersangkutan, kemudian masukkan password baru pada kolom Ubah Sandi dan klik Simpan."
      }
    ]
  },

  cashier: {
    roleName: "Kasir (Front-End POS)",
    roleDescription: "Panduan operasional harian kasir: mulai dari pembukaan shift, scan barcode, kalkulasi diskon & kembalian, cetak struk belanja, hingga rekonsiliasi penutupan shift.",
    badgeBg: "bg-emerald-100 dark:bg-emerald-950/50 border-emerald-800 dark:border-emerald-300",
    badgeText: "text-emerald-900 dark:text-emerald-200",
    shortcuts: [
      { keys: ["Enter"], description: "Konfirmasi Scan Barcode / Tambah Item ke Keranjang" },
      { keys: ["F2"], description: "Fokus cepat ke Kolom Pencarian Produk" },
      { keys: ["F4"], description: "Ubah Kuantitas (Qty) Item yang dipilih" },
      { keys: ["F9"], description: "Buka Modal Pembayaran / Bayar Transaksi" },
      { keys: ["Esc"], description: "Batalkan Transaksi / Tutup Pop-up Modal" }
    ],
    guides: [
      {
        id: "cashier-shift-open",
        title: "Prosedur Buka Shift & Input Modal Awal (Cash Float)",
        category: "Awal Shift",
        summary: "Langkah wajib kasir sebelum memulai transaksi: login akun kasir dan mencatat modal uang kembalian di laci kasir (drawer).",
        badge: "Wajib Dilakukan",
        badgeColor: "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-200",
        iconName: "Clock",
        estimatedReadTime: "2 Menit",
        relatedPath: "/cashier/transactions",
        relatedLabel: "Buka Mesin Kasir POS",
        steps: [
          {
            stepNumber: 1,
            title: "Login ke Akun Kasir Masing-Masing",
            description: "Masukkan Email dan Kata Sandi terdaftar Anda pada layar login DailyMart POS.",
            warningOrTip: {
              type: "warning",
              text: "Pastikan Anda login menggunakan akun pribadi Anda, bukan akun kasir shift sebelumnya!"
            }
          },
          {
            stepNumber: 2,
            title: "Hitung Fisik Uang Modal di Laci Kasir (Drawer)",
            description: "Sebelum membuka sistem kasir, hitung secara teliti uang tunai pecahan kecil yang tersedia di laci kasir yang disiapkan supervisor untuk uang kembalian.",
            subSteps: [
              "Pisahkan uang pecahan: Rp 1.000, Rp 2.000, Rp 5.000, Rp 10.000, Rp 20.000, Rp 50.000.",
              "Jumlahkan total seluruh uang modal awal tersebut."
            ]
          },
          {
            stepNumber: 3,
            title: "Input Modal Awal pada Modal Pop-up Buka Shift",
            description: "Saat pertama kali membuka menu 'Mesin Kasir (POS)', modal Buka Shift akan muncul otomatis:",
            subSteps: [
              "Masukkan nominal uang modal awal pada kolom 'Modal Awal Kasir' (contoh: Rp 200.000).",
              "Tuliskan catatan shift jika ada (contoh: 'Pecahan kembalian lengkap').",
              "Klik tombol 'Buka Shift Kasir & Mulai Transaksi'."
            ],
            warningOrTip: {
              type: "tip",
              text: "Nominal modal awal ini akan dicatat sistem sebagai saldo awal kas dan tidak dihitung sebagai omset pendapatan penjualan."
            }
          }
        ],
        quickTips: [
          "Pastikan printer thermal sudah menyala, kertas struk terpasang dengan benar, dan barcode scanner terhubung ke PC/Tablet.",
          "Jika ada kekurangan uang receh kembalian, segera laporkan ke Admin/Supervisor sebelum toko dibuka."
        ]
      },
      {
        id: "cashier-pos-operations",
        title: "Operasi Scan Barcode, Pencarian & Manajemen Keranjang",
        category: "Transaksi Penjualan",
        summary: "Tata cara memindai produk, mencari item secara manual, mengubah jumlah beli (quantity), dan menerapkan diskon.",
        badge: "Operasional Utama",
        badgeColor: "bg-blue-100 text-blue-900 dark:bg-blue-900/40 dark:text-blue-200",
        iconName: "ShoppingCart",
        estimatedReadTime: "4 Menit",
        relatedPath: "/cashier/transactions",
        relatedLabel: "Buka Mesin Kasir POS",
        steps: [
          {
            stepNumber: 1,
            title: "Scan Barcode Produk Menggunakan Barcode Scanner",
            description: "Arahkan scanner ke barcode kemasan produk.",
            subSteps: [
              "Sistem akan langsung mendeteksi produk dan menambahkannya ke keranjang belanja pelanggan.",
              "Jika produk yang sama di-scan berulang kali, jumlah kuantitas (Qty) akan bertambah secara otomatis."
            ]
          },
          {
            stepNumber: 2,
            title: "Pencarian Produk Manual (Jika Barcode Rusak / Tidak Ada)",
            description: "Tekan tombol keyboard [F2] atau klik pada kolom pencarian:",
            subSteps: [
              "Ketik nama produk atau merek (misal: 'Minyak Goreng Sania').",
              "Klik pada produk yang muncul pada daftar hasil pencarian untuk menambahkannya ke keranjang."
            ]
          },
          {
            stepNumber: 3,
            title: "Mengubah Kuantitas (Qty) & Menghapus Item",
            description: "Untuk pesanan dalam jumlah banyak atau pembatalan item:",
            subSteps: [
              "Ubah Qty: Klik tombol '+' / '-' atau klik langsung pada angka kuantitas dan ketikkan jumlah yang dibeli (contoh: 12 pcs).",
              "Hapus Item: Klik ikon Tempat Sampah / Hapus pada baris produk yang ingin dibatalkan oleh pembeli.",
              "Reset Keranjang: Klik tombol 'Reset Transaksi' jika pembeli membatalkan seluruh belanjaannya."
            ],
            warningOrTip: {
              type: "tip",
              text: "Selalu konfirmasikan kembali jumlah item dan subtotal harga kepada pelanggan sebelum melangkah ke proses pembayaran."
            }
          }
        ],
        quickTips: [
          "Gunakan shortcut keyboard [F2] untuk mencari produk tanpa perlu menggunakan mouse.",
          "Perhatikan label harga promo atau diskon otomatis yang muncul pada sistem."
        ]
      },
      {
        id: "cashier-payments-receipt",
        title: "Proses Pembayaran, Hitung Kembalian & Cetak Struk",
        category: "Pembayaran & Kasir",
        summary: "Panduan pemrosesan pembayaran Tunai, QRIS, Kartu Debit, kalkulator kembalian instan, dan pencetakan struk thermal.",
        badge: "Pembayaran",
        badgeColor: "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-200",
        iconName: "CreditCard",
        estimatedReadTime: "3 Menit",
        relatedPath: "/cashier/transactions",
        relatedLabel: "Buka Mesin Kasir POS",
        steps: [
          {
            stepNumber: 1,
            title: "Membuka Menu Pembayaran",
            description: "Setelah seluruh barang selesai di-scan, klik tombol besar 'Proses Pembayaran' atau tekan [F9] pada keyboard.",
            subSteps: [
              "Layar akan menampilkan Total Belanja Bersih dan pilihan metode pembayaran."
            ]
          },
          {
            stepNumber: 2,
            title: "Metode Pembayaran Tunai (Cash)",
            description: "Jika pelanggan membayar dengan uang tunai:",
            subSteps: [
              "Klik tombol pecahan uang cepat (contoh: Rp 50.000, Rp 100.000, atau Pas) atau ketikkan nominal uang yang diterima dari pembeli.",
              "Sistem akan menghitung nominal Uang Kembalian (Change) secara otomatis dan jelas.",
              "Ambilkan uang kembalian dari laci kasir dan serahkan kepada pelanggan sambil menyebutkan nominalnya."
            ]
          },
          {
            stepNumber: 3,
            title: "Metode Pembayaran Non-Tunai (QRIS & Kartu Debit)",
            description: "Jika pelanggan memilih QRIS atau EDC Debit:",
            subSteps: [
              "Pilih opsi 'QRIS / E-Wallet': Arahkan pelanggan untuk melakukan scan QRIS pada monitor kasir atau stiker QRIS toko. Tunggu hingga notifikasi pembayaran sukses muncul pada HP pembeli / mesin EDC.",
              "Pilih opsi 'Debit / Transfer': Gesek kartu pada mesin EDC bank, masukkan nominal transaksi, dan pastikan struk EDC berhasil keluar.",
              "Klik tombol 'Konfirmasi Pembayaran Selesai' pada sistem POS."
            ],
            warningOrTip: {
              type: "warning",
              text: "Untuk pembayaran non-tunai (QRIS/EDC), selalu pastikan status transaksi 'BERHASIL' di layar EDC/HP pelanggan sebelum menekan tombol konfirmasi di POS."
            }
          },
          {
            stepNumber: 4,
            title: "Pencetakan Struk Belanja Pelanggan",
            description: "Setelah transaksi berhasil tersimpan:",
            subSteps: [
              "Sistem akan langsung memicu cetak struk ke printer thermal.",
              "Jika kertas struk macet atau habis, ganti roll kertas lalu klik tombol 'Cetak Ulang Struk' pada layar konfirmasi atau melalui menu Riwayat Shift."
            ]
          }
        ],
        quickTips: [
          "Selalu ucapkan terima kasih dan serahkan struk bersama dengan uang kembalian kepada pembeli.",
          "Jika ada komplain struk hilang, Anda dapat mencari nota transaksi di menu 'Riwayat Shift & Struk'."
        ]
      },
      {
        id: "cashier-shift-close",
        title: "Prosedur Tutup Shift & Rekonsiliasi Kas (End of Shift)",
        category: "Akhir Shift",
        summary: "Prosedur serah terima kasir: hitung uang fisik di laci, rekonsiliasi dengan catatan sistem POS, dan cetak slip shift.",
        badge: "Wajib di Akhir Shift",
        badgeColor: "bg-rose-100 text-rose-900 dark:bg-rose-900/40 dark:text-rose-200",
        iconName: "Lock",
        estimatedReadTime: "3 Menit",
        relatedPath: "/cashier/history",
        relatedLabel: "Buka Riwayat Kasir",
        steps: [
          {
            stepNumber: 1,
            title: "Membuka Menu Tutup Shift Kasir",
            description: "Di akhir jam kerja Anda, klik tombol 'Tutup Shift' di sudut kanan atas layar POS kasir.",
            subSteps: [
              "Layar modal penutupan shift akan menampilkan ringkasan penjualan shift Anda."
            ]
          },
          {
            stepNumber: 2,
            title: "Menghitung Fisik Uang Tunai di Laci Kasir",
            description: "Keluarkan seluruh uang tunai yang ada di dalam laci kasir dan hitung dengan teliti:",
            subSteps: [
              "Uang fisik yang dihitung harus mencakup: Modal Awal Kasir + Seluruh Penerimaan Penjualan Tunai.",
              "Masukkan nominal total uang fisik yang dihitung pada kolom 'Total Kas Fisik Disetor'."
            ]
          },
          {
            stepNumber: 3,
            title: "Memeriksa Status Selisih Kas (Discrepancy)",
            description: "Sistem akan membandingkan Kas Fisik vs Total Kas yang tercatat pada sistem:",
            subSteps: [
              "Selisih Rp 0: Kas Cocok (Balance).",
              "Selisih Minus (Kas Kurang): Tuliskan keterangan alasan selisih pada kolom catatan (misal: selisih uang receh pecahan 100/200).",
              "Selisih Plus (Kas Lebih): Tuliskan catatan penjelasan."
            ],
            warningOrTip: {
              type: "tip",
              text: "Laporan penutupan shift akan tersimpan otomatis dan dapat ditinjau oleh Admin / Supervisor Toko."
            }
          },
          {
            stepNumber: 4,
            title: "Cetak Laporan Rekap Shift & Logout",
            description: "Klik tombol 'Konfirmasi & Tutup Shift'. Cetak struk ringkasan shift untuk diserahkan kepada kasir shift berikutnya atau supervisor bersama fisik uang kasir."
          }
        ]
      }
    ],
    faqs: [
      {
        category: "Barcode & Scan",
        question: "Bagaimana jika barcode barang tidak terbaca oleh scanner?",
        answer: "Tekan tombol [F2] pada keyboard untuk mencari barang berdasarkan nama atau ketikkan nomor barcode secara manual pada kolom pencarian."
      },
      {
        category: "Struk",
        question: "Bagaimana jika printer kehabisan kertas di tengah cetak struk?",
        answer: "Buka penutup printer thermal, masukkan roll kertas thermal baru dengan posisi kertas keluar dari bawah, tutup rapat penutup printer, lalu buka menu 'Riwayat Shift & Struk' dan klik 'Cetak Ulang Struk' pada transaksi terakhir."
      },
      {
        category: "Pembatalan",
        question: "Pelanggan ingin membatalkan salah satu barang yang sudah di-scan, bagaimana caranya?",
        answer: "Cukup klik ikon 'Tempat Sampah' (Hapus) pada baris produk di daftar keranjang belanja sebelah kanan. Total belanja akan otomatis dikalkulasi ulang."
      }
    ]
  },

  warehouse: {
    roleName: "Staff Gudang (Warehouse & Inventory)",
    roleDescription: "Panduan alur kerja manajemen logistik gudang: penerimaan barang masuk dari supplier, verifikasi batch & expired, audit stok fisik (stock opname), pencatatan retur rusak, dan restock alert.",
    badgeBg: "bg-amber-100 dark:bg-amber-950/50 border-amber-800 dark:border-amber-300",
    badgeText: "text-amber-900 dark:text-amber-200",
    shortcuts: [
      { keys: ["Ctrl", "F"], description: "Pencarian Cepat Kode Barang / Nama Produk" },
      { keys: ["Enter"], description: "Konfirmasi Barcode Scan pada Stock Opname / Stock In" },
      { keys: ["Esc"], description: "Tutup Modal Bukti Foto Kerusakan" }
    ],
    guides: [
      {
        id: "warehouse-stock-in",
        title: "Penerimaan Barang Masuk dari Supplier (Stock-In)",
        category: "Barang Masuk",
        summary: "Prosedur verifikasi surat jalan supplier, pencocokan jumlah fisik, pencatatan batch & tanggal kadaluarsa (expired date), serta update stok katalog.",
        badge: "Penerimaan",
        badgeColor: "bg-blue-100 text-blue-900 dark:bg-blue-900/40 dark:text-blue-200",
        iconName: "Truck",
        estimatedReadTime: "4 Menit",
        relatedPath: "/warehouse/stock-in",
        relatedLabel: "Buka Form Barang Masuk",
        steps: [
          {
            stepNumber: 1,
            title: "Pemeriksaan Surat Jalan & Fisik Dus / Kemasan",
            description: "Saat armada supplier datang:",
            subSteps: [
              "Minta Surat Jalan (Delivery Order) atau Faktur Pengiriman dari supir/kurir.",
              "Periksa kondisi kemasan kardus/dus luar: pastikan segel utuh, tidak basah, tidak penyok berat, dan tidak berlubang."
            ]
          },
          {
            stepNumber: 2,
            title: "Membuka Menu Penerimaan Barang Masuk (Stock-In)",
            description: "Buka menu 'Barang Masuk (Stock-In)' di navigasi kiri.",
            subSteps: [
              "Pilih nama Supplier pengirim dari daftar supplier.",
              "Masukkan Nomor Surat Jalan / Nomor Faktur Supplier.",
              "Pilih tanggal penerimaan barang."
            ]
          },
          {
            stepNumber: 3,
            title: "Input Item Produk & Jumlah Fisik Diterima",
            description: "Scan barcode produk atau pilih produk dari katalog:",
            subSteps: [
              "Kuantitas Diterima: Masukkan jumlah unit fisik yang telah dihitung nyata (bukan sekadar melihat angka surat jalan).",
              "Nomor Batch & Expired Date: Catat tanggal kadaluarsa produk, khususnya untuk produk makanan, minuman, susu, dan farmasi.",
              "Catatan Kondisi: Tuliskan catatan jika terdapat bonus barang atau selisih nota."
            ],
            warningOrTip: {
              type: "warning",
              text: "Jika tanggal kadaluarsa produk kurang dari 3 bulan (kecuali produk fresh harian), tolak penerimaan item tersebut sesuai kebijakan standar retur toko."
            }
          },
          {
            stepNumber: 4,
            title: "Konfirmasi & Simpan Transaksi Stock-In",
            description: "Klik tombol 'Simpan Penerimaan Barang'. Stok pada sistem katalog toko dan POS kasir akan otomatis bertambah saat itu juga.",
            subSteps: [
              "Cetak atau simpan bukti tanda terima gudang.",
              "Tandatangani surat jalan supplier dan simpan copy untuk arsip administrasi."
            ]
          }
        ],
        quickTips: [
          "Terapkan metode FIFO (First-In, First-Out): Tempatkan barang dengan expired date lebih awal di posisi rak depan/atas.",
          "Jangan menumpuk dus barang melebihi batas 'Max Stack' yang tertera pada kemasan kardus."
        ]
      },
      {
        id: "warehouse-stock-audit",
        title: "Audit Stok Fisik & Stock Opname Berkala",
        category: "Audit Inventaris",
        summary: "Tata cara verifikasi stok fisik di rak & gudang vs data sistem, scan barcode opname, dan pelaporan selisih barang.",
        badge: "Stock Opname",
        badgeColor: "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-200",
        iconName: "ClipboardCheck",
        estimatedReadTime: "4 Menit",
        relatedPath: "/warehouse/stock-audit",
        relatedLabel: "Buka Audit Stok Fisik",
        steps: [
          {
            stepNumber: 1,
            title: "Persiapan Audit Stock Opname",
            description: "Sebelum audit dimulai, pastikan seluruh transaksi penjualan kasir dan penerimaan gudang hari tersebut sudah diinput ke sistem.",
            subSteps: [
              "Gunakan scanner nirkabel atau tablet untuk mempermudah perhitungan di lorong rak toko."
            ]
          },
          {
            stepNumber: 2,
            title: "Membuka Menu Verifikasi Stok (Opname)",
            description: "Buka menu 'Verifikasi Stok (Opname)' di navigasi gudang:",
            subSteps: [
              "Pilih kategori rak atau seluruh produk yang akan diaudit.",
              "Scan barcode produk satu per satu atau ketik jumlah fisik yang ada di rak display dan gudang penyimpanan."
            ]
          },
          {
            stepNumber: 3,
            title: "Menganalisis Selisih Stok (Variance)",
            description: "Sistem akan menghitung deviasi stok:",
            subSteps: [
              "Selisih 0: Stok Cocok.",
              "Selisih Negatif (Minus): Fisik lebih sedikit dari sistem (potensi barang hilang/tidak ter-scan saat kasir).",
              "Selisih Positif (Plus): Fisik lebih banyak dari sistem (potensi salah input stock-in atau salah ambil varian)."
            ],
            warningOrTip: {
              type: "tip",
              text: "Lakukan hitung ulang (double-check) untuk produk dengan selisih nominal besar sebelum mengirimkan laporan audit final."
            }
          },
          {
            stepNumber: 4,
            title: "Submit Laporan Penyesuaian ke Supervisor",
            description: "Klik 'Kirim Laporan Audit Stok'. Data hasil opname akan diteruskan ke Laporan Stock Opname Admin untuk proses approval penyesuaian saldo buku."
          }
        ],
        quickTips: [
          "Bagi zona audit per lorong / per kategori rak untuk menghindari produk terlewat atau terhitung ganda.",
          "Tempelkan stiker kecil bertuliskan 'Telah Diaudit' pada dus yang sudah selesai dihitung."
        ]
      },
      {
        id: "warehouse-returns",
        title: "Pencatatan Retur Barang Rusak, Cacat & Kadaluarsa",
        category: "Retur & Kerusakan",
        summary: "Prosedur pencatatan barang reject, pengambilan foto bukti (evidence capture), dan pembuatan formulir retur ke distributor.",
        badge: "Retur & Rusak",
        badgeColor: "bg-rose-100 text-rose-900 dark:bg-rose-900/40 dark:text-rose-200",
        iconName: "AlertTriangle",
        estimatedReadTime: "3 Menit",
        relatedPath: "/warehouse/returns",
        relatedLabel: "Buka Form Retur Barang",
        steps: [
          {
            stepNumber: 1,
            title: "Pemisahan Barang Rusak ke Area Karantina",
            description: "Segera tarik barang yang rusak, kemasan sobek, bocor, atau mendekati tanggal kadaluarsa dari rak toko dan pindahkan ke 'Rak Karantina Retur Gudang'.",
            warningOrTip: {
              type: "warning",
              text: "Dilarang membiarkan barang kadaluarsa atau rusak tetap berada di rak display toko yang dapat terjangkau pembeli!"
            }
          },
          {
            stepNumber: 2,
            title: "Input Laporan Barang Rusak / Retur",
            description: "Buka menu 'Retur & Barang Rusak' di bilah navigasi:",
            subSteps: [
              "Klik '+ Catat Barang Rusak / Retur'.",
              "Pilih Nama Produk yang rusak.",
              "Pilih Alasan: 'Kemasan Rusak / Bocor', 'Kadaluarsa (Expired)', 'Cacat Pabrik', atau 'Retur dari Pembeli'.",
              "Masukkan Jumlah Unit yang rusak."
            ]
          },
          {
            stepNumber: 3,
            title: "Unggah Foto Bukti Kerusakan (Evidence)",
            description: "Gunakan kamera HP / webcam untuk mengambil foto fisik produk yang rusak:",
            subSteps: [
              "Ambil foto yang memperlihatkan bagian kemasan yang rusak dan tanggal expired / kode batch yang tertera.",
              "Gunakan fitur crop foto untuk memfokuskan bukti kerusakan.",
              "Simpan laporan retur."
            ]
          },
          {
            stepNumber: 4,
            title: "Proses Klaim ke Supplier",
            description: "Saat sales distributor datang, buka daftar retur barang berstatus 'Menunggu Klaim', serahkan fisik barang dan minta tanda tangan Berita Acara Retur Barang."
          }
        ]
      },
      {
        id: "warehouse-alerts-restock",
        title: "Peringatan Stok Minimum & Permintaan Restok (Restock Request)",
        category: "Monitoring Stok",
        summary: "Pantau daftar produk yang menipis di bawah batas minimum dan buat permintaan restok barang ke bagian pengadaan/admin.",
        badge: "Monitoring",
        badgeColor: "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200",
        iconName: "Bell",
        estimatedReadTime: "3 Menit",
        relatedPath: "/warehouse/stock-alerts",
        relatedLabel: "Buka Peringatan Stok",
        steps: [
          {
            stepNumber: 1,
            title: "Cek Notifikasi Peringatan Stok Minimum",
            description: "Buka menu 'Peringatan Stok Minimum' setiap pagi:",
            subSteps: [
              "Sistem menampilkan produk yang stoknya saat ini berada di bawah atau sama dengan batas 'Min Alert'.",
              "Produk berstatus 'Habis / Out of Stock' ditandai dengan badge merah menyala."
            ]
          },
          {
            stepNumber: 2,
            title: "Membuat Permintaan Restok Barang (Restock Request)",
            description: "Buka menu 'Restock Request List':",
            subSteps: [
              "Klik tombol '+ Buat Permintaan Restok'.",
              "Pilih produk yang membutuhkan penambahan stok dan masukkan estimasi jumlah karton/pcs yang diperlukan.",
              "Pilih tingkat urgensi: 'Normal' atau 'Mendesak / Urgent'.",
              "Kirim permintaan ke Admin Toko / Bagian Purchasing untuk dibuatkan Purchase Order (PO) ke Supplier."
            ]
          }
        ]
      }
    ],
    faqs: [
      {
        category: "Barang Masuk",
        question: "Bagaimana jika jumlah barang fisik yang dikirim supir supplier kurang dari yang tertera di surat jalan?",
        answer: "Catat jumlah FISIK NYATA yang Anda terima pada sistem Stock-In. Berikan coretan dan catatan paraf pada Surat Jalan fisik supplier bertuliskan jumlah nyata yang diterima agar tidak ditagih lebih oleh supplier."
      },
      {
        category: "Retur",
        question: "Apakah bukti foto wajib diunggah saat mencatat barang rusak?",
        answer: "Ya, sistem DailyMart POS mewajibkan lampiran foto bukti (evidence) untuk mempermudah klaim retur barang ke pihak distributor dan audit transparansi."
      }
    ]
  }
};
