const db = require('../config/Connection');

class Transaksi {
    static async generateInvoice(toko_id) {
        const date = new Date();
        const ymd = date.toLocaleDateString('sv-SE').replace(/-/g, '');
        
        // Hitung hanya transaksi milik toko_id tertentu di hari ini
        const [rows] = await db.query(
            "SELECT COUNT(*) as total FROM transaksi WHERE toko_id = ? AND DATE(Tanggal) = CURDATE()",
            [toko_id]
        );

        const nextNumber = (rows[0].total + 1).toString().padStart(3, '0');
        
        // Format: INV/T1/20260130/001 (T1 adalah contoh kode toko)
        return `INV/T${toko_id}/${ymd}/${nextNumber}`;
    }

   static async create(data) {
    const { items, member_id, user_id, bayar, metode, toko_id, status } = data;
    const connection = await db.getConnection();
    await connection.beginTransaction();

    try {
        // 1. Ambil Data Toko (Tambahan baru)
        const [toko] = await connection.query(
            'SELECT nama_toko, telepon, alamat FROM toko WHERE id = ?', 
            [toko_id]
        );
        
        if (!toko[0]) {
            throw new Error('Toko tidak ditemukan');
        }
        
        const namaToko = toko[0].nama_toko;
        const noTlpToko = toko[0].telepon;
        const alamatToko = toko[0].alamat;

        // 2. Ambil Nama Kasir (User)
        const [user] = await connection.query('SELECT nama_lengkap FROM users WHERE id = ?', [user_id]);
        const namaKasir = user[0]?.nama_lengkap || 'Unknown';

        // 3. Ambil Nama Member
        let namaMember = 'Non-Member';
        if (member_id) {
            const [member] = await connection.query('SELECT nama_member FROM member WHERE id = ?', [member_id]);
            namaMember = member[0]?.nama_member || 'Non-Member';
        }

        let totalTransaksi = 0;
        let totalLabaTransaksi = 0;
        let totalDiskonTransaksi = 0;
        const preparedItems = [];

        // 4. Olah Items (Ambil Data Produk & Hitung Otomatis)
        for (const item of items) {
            const [produk] = await connection.query(
                'SELECT nama_produk, harga_jual, harga_beli, stok FROM produk WHERE id = ? AND toko_id = ?', 
                [item.produk_id, toko_id] // Saya tambahkan toko_id untuk validasi
            );

            if (!produk[0]) throw new Error(`Produk ID ${item.produk_id} tidak ditemukan di toko ini`);
            if (produk[0].stok < item.qty) throw new Error(`Stok ${produk[0].nama_produk} habis!`);

            const p = produk[0];
            const diskonPerItem = item.diskon || 0;
            const subtotal = (p.harga_jual - diskonPerItem) * item.qty;
            const labaPerItem = (p.harga_jual - p.harga_beli - diskonPerItem) * item.qty;

            totalTransaksi += subtotal;
            totalLabaTransaksi += labaPerItem;
            totalDiskonTransaksi += (diskonPerItem * item.qty);

            preparedItems.push({
                ...item,
                nama_produk: p.nama_produk,
                harga_jual: p.harga_jual,
                harga_beli: p.harga_beli,
                laba: labaPerItem,
                subtotal: subtotal,
                diskon: diskonPerItem
            });
        }

        const invoice = await this.generateInvoice(toko_id);
        const kembali = bayar - totalTransaksi;

        // 5. Simpan ke Tabel Transaksi
        const [resT] = await connection.query(
            `INSERT INTO transaksi 
            (Invoice, Total, kembali, Member, Metode, Kasir, Status, total_laba, total_diskon, toko_id, member_id, user_id) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [invoice, totalTransaksi, kembali, namaMember, metode, namaKasir, status, totalLabaTransaksi, totalDiskonTransaksi, toko_id, member_id, user_id]
        );

        // 6. Simpan Detail & Update Stok
        for (const pi of preparedItems) {
            await connection.query(
                `INSERT INTO detail_transaksi 
                (transaksi_id, produk_id, Nama_produk, Harga_Jual, Harga_beli, Laba, Diskon, Quantity, Subtotal) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [resT.insertId, pi.produk_id, pi.nama_produk, pi.harga_jual, pi.harga_beli, pi.laba, pi.diskon, pi.qty, pi.subtotal]
            );

            await connection.query('UPDATE produk SET stok = stok - ? WHERE id = ? AND toko_id = ?', 
                [pi.qty, pi.produk_id, toko_id]);

            // Ambil nilai stok terbaru
            const [stokTerbaru] = await connection.query(
                'SELECT stok FROM produk WHERE id = ? AND toko_id = ?', 
                [pi.produk_id, toko_id]
            );
            const stok_sesudah = stokTerbaru[0].stok;
            const stok_sebelum = stok_sesudah + pi.qty;

            // Jalankan Query Mutasi Stok
            await connection.query(
                `INSERT INTO mutasi_stok 
                (produk_id, toko_id, quantity, stok_sebelum, stok_sesudah, tipe, sumber, ref_id, harga_beli, harga_jual, created_at) 
                VALUES (?, ?, ?, ?, ?, 'keluar', 'penjualan', ?, ?, ?, NOW())`,
                [
                    pi.produk_id, 
                    toko_id, 
                    pi.qty, 
                    stok_sebelum, 
                    stok_sesudah, 
                    resT.insertId,
                    pi.harga_beli, 
                    pi.harga_jual
                ]
            );
        }
        
        await connection.commit();
        
        // Response dengan data toko
        return { 
            invoice, 
            total: totalTransaksi,
            namaMember, 
            namaKasir,
            kembali,
            nama_toko: namaToko,
            telepon: noTlpToko,
            alamat: alamatToko,
            preparedItems
        };
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}
    // static async getAll() {
    //     // Query Join untuk melihat transaksi beserta detailnya
       
    //     const [detail] = await db.query(`
    //         SELECT td.nama_produk, td.qty, td.harga_satuan 
    //         FROM transaksi_detail td 
    //     `);
    //     return detail;
    // }
static async getTransaksi(page = 1, limit = 10) {
    const offset = (page - 1) * limit;

    // Ambil data
    const [data] = await db.query(
        `SELECT * FROM transaksi 
         ORDER BY created_at DESC 
         LIMIT ? OFFSET ?`,
        [limit, offset]
    );

    // Hitung total data
    const [[{ total }]] = await db.query(
        `SELECT COUNT(*) AS total FROM transaksi`
    );

    return {
        data,
        pagination: {
            total,
            page,
            limit,
            totalPage: Math.ceil(total / limit)
        }
    };
}

static async getById(id) {
    // Ambil data utama transaksi beserta data toko
    const [transaksi] = await db.query(
        `SELECT t.*, tk.nama_toko, tk.telepon, tk.alamat 
         FROM transaksi t
         LEFT JOIN toko tk ON t.toko_id = tk.id
         WHERE t.id = ?`,
        [id]
    );

    // Jika transaksi tidak ditemukan, kembalikan null agar controller bisa menangani
    if (transaksi.length === 0) return null;

    // Ambil semua detail transaksi tanpa batasan (pagination)
    const [detail] = await db.query(
        `SELECT * FROM detail_transaksi WHERE transaksi_id = ?`,
        [id]
    );

    return {
        ...transaksi[0], // Mengambil objek pertama agar tidak berbentuk array di dalam array
        detail
    };
}

static async getByToko(toko_id, date = null, page = 1, limit = 50) {
        const offset = (page - 1) * limit;
        let queryParams = [toko_id];
        let dateFilter = "";

        // Tambahkan filter tanggal jika ada (Format: YYYY-MM-DD)
        if (date) {
            dateFilter = "AND DATE(Tanggal) = ?";
            queryParams.push(date);
        }

        // Query Ambil Data
        const sqlData = `
            SELECT * FROM transaksi 
            WHERE toko_id = ? ${dateFilter}
            ORDER BY created_at DESC
            LIMIT ? OFFSET ?`;
        
        const [data] = await db.query(sqlData, [...queryParams, limit, offset]);

        // Query Hitung Total untuk Pagination
        const sqlCount = `
            SELECT COUNT(*) AS total 
            FROM transaksi 
            WHERE toko_id = ? ${dateFilter}`;
        
        const [[{ total }]] = await db.query(sqlCount, queryParams);

        return {
            data,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPage: Math.ceil(total / limit)
            }
        };
    }

    static async cancel(transaksiId, data) {
        const { user_id, alasan } = data; // Opsional: untuk mencatat siapa yang cancel
        const connection = await db.getConnection();
        await connection.beginTransaction();

        try {
            // 1. Cek apakah transaksi ada dan statusnya belum 'Cancel'
            const [transaksi] = await connection.query(
                'SELECT Status, toko_id FROM transaksi WHERE id = ?', 
                [transaksiId]
            );

            if (!transaksi[0]) throw new Error("Transaksi tidak ditemukan");
            if (transaksi[0].Status === 'Cancel') throw new Error("Transaksi sudah dibatalkan sebelumnya");

            const toko_id = transaksi[0].toko_id;

            // 2. Ambil semua detail item dari transaksi tersebut
            const [details] = await connection.query(
                'SELECT produk_id, Quantity, Harga_Beli, Harga_Jual FROM detail_transaksi WHERE transaksi_id = ?',
                [transaksiId]
            );

            // 3. Loop untuk mengembalikan stok dan catat mutasi
            for (const item of details) {
                // A. Ambil stok saat ini sebelum dikembalikan
                const [produk] = await connection.query('SELECT stok FROM produk WHERE id = ?', [item.produk_id]);
                const stok_sebelum = produk[0].stok;
                const stok_sesudah = stok_sebelum + item.Quantity;

                // B. Update stok di tabel produk (Tambah Kembali)
                await connection.query(
                    'UPDATE produk SET stok = ? WHERE id = ?',
                    [stok_sesudah, item.produk_id]
                );

                // C. Catat di Mutasi Stok (Tipe: Masuk, Sumber: cancel_penjualan)
                await connection.query(
                    `INSERT INTO mutasi_stok 
                    (produk_id, toko_id, quantity, stok_sebelum, stok_sesudah, tipe, sumber, ref_id, harga_beli, harga_jual, created_at) 
                    VALUES (?, ?, ?, ?, ?, 'masuk', 'cancel_penjualan', ?, ?, ?, NOW())`,
                    [item.produk_id, toko_id, item.Quantity, stok_sebelum, stok_sesudah, transaksiId, item.Harga_Beli, item.Harga_Jual]
                );
            }

            // 4. Ubah status transaksi menjadi 'Cancel'
            await connection.query(
                'UPDATE transaksi SET Status = "Cancel" WHERE id = ?',
                [transaksiId]
            );

            await connection.commit();
            return { message: "Transaksi berhasil dibatalkan dan stok telah dikembalikan" };
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }
}

module.exports = Transaksi;