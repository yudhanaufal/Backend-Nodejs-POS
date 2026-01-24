const pool = require('../config/Connection');

const Pembelian = {
  // ============================================
  // 1. CREATE PEMBELIAN DENGAN HARGA OTOMATIS
  // ============================================
  async createPembelian(pembelianData, detailPembelian) {
    const connection = await pool.getConnection();
    
    try {
      await connection.beginTransaction();
      console.log('🚀 Starting pembelian transaction...');

      // Generate invoice
      const invoiceNumber = `INV-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      console.log(`📄 Generated invoice: ${invoiceNumber}`);
      
      // Insert ke tabel pembelian
      const [pembelianResult] = await connection.query(
        `INSERT INTO pembelian (invoice, total, status, tanggal, users_id, toko_id) 
         VALUES (?, ?, ?, NOW(), ?, ?)`,
        [
          invoiceNumber,
          pembelianData.total || 0,
          pembelianData.status || 'SELESAI',
          pembelianData.users_id,
          pembelianData.toko_id
        ]
      );

      const pembelianId = pembelianResult.insertId;
      console.log(`✅ Pembelian created with ID: ${pembelianId}`);

      // Process each detail
      console.log(`🛒 Processing ${detailPembelian.length} items...`);
      let calculatedTotal = 0;
      
      for (const detail of detailPembelian) {
        // 1. GET HARGA_BELI DARI PRODUK (OTOMATIS)
        let hargaBeliProduk = detail.harga_beli || 0;
        let namaProduk = detail.nama_produk;
        let produkId = detail.produk_id;
        
        if (produkId) {
          // Cek apakah produk ada
          const [produk] = await connection.query(
            `SELECT id, nama_produk, harga_beli, harga_jual, stok 
             FROM produk 
             WHERE id = ? AND toko_id = ?`,
            [produkId, pembelianData.toko_id]
          );

          if (produk.length > 0) {
            // Produk sudah ada, ambil harga_beli dari database
            hargaBeliProduk = produk[0].harga_beli;
            namaProduk = produk[0].nama_produk;
            console.log(`💰 Harga beli diambil dari produk: ${hargaBeliProduk} untuk produk ${produk[0].id}`);
          }
        }

        // 2. UPDATE HARGA DI PRODUK JIKA INPUT BERBEDA
        if (produkId && detail.harga_beli && detail.harga_beli !== hargaBeliProduk) {
          console.log(`🔄 Update harga beli produk ${produkId}: ${hargaBeliProduk} → ${detail.harga_beli}`);
          
          await connection.query(
            `UPDATE produk SET 
              harga_beli = ?,
              updated_at = NOW()
             WHERE id = ? AND toko_id = ?`,
            [detail.harga_beli, produkId, pembelianData.toko_id]
          );
          
          hargaBeliProduk = detail.harga_beli;
        }

        // Hitung subtotal
        const subtotal = hargaBeliProduk * (detail.quantity || 1);
        calculatedTotal += subtotal;

        // 3. Insert detail pembelian
        await connection.query(
          `INSERT INTO detail_pembelian 
           (nama_produk, harga_beli, quantity, subtotal, pembelian_id, produk_id) 
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            namaProduk,
            hargaBeliProduk,
            detail.quantity || 1,
            subtotal,
            pembelianId,
            produkId || null
          ]
        );

        console.log(`✅ Detail inserted: ${namaProduk} @ ${hargaBeliProduk} x ${detail.quantity}`);

        // 4. UPDATE ATAU CREATE PRODUK DAN STOK
        if (produkId) {
          const [produk] = await connection.query(
            `SELECT id, stok, harga_jual FROM produk 
             WHERE id = ? AND toko_id = ?`,
            [produkId, pembelianData.toko_id]
          );

          let stokSebelum = 0;
          let stokSesudah = 0;
          let hargaJualProduk = hargaBeliProduk * 1.3;

          if (produk.length > 0) {
            // Produk sudah ada, update stok
            stokSebelum = produk[0].stok || 0;
            stokSesudah = stokSebelum + (detail.quantity || 1);
            hargaJualProduk = produk[0].harga_jual || hargaJualProduk;
            
            await connection.query(
              `UPDATE produk SET 
                stok = ?,
                updated_at = NOW() 
               WHERE id = ? AND toko_id = ?`,
              [stokSesudah, produkId, pembelianData.toko_id]
            );
            
            console.log(`📦 Updated stock: ${stokSebelum} → ${stokSesudah}`);
          } else {
            // Produk belum ada, insert baru
            stokSesudah = detail.quantity || 1;
            
            await connection.query(
              `INSERT INTO produk (nama_produk, harga_beli, harga_jual, stok, toko_id) 
               VALUES (?, ?, ?, ?, ?)`,
              [
                namaProduk,
                hargaBeliProduk,
                hargaJualProduk,
                stokSesudah,
                pembelianData.toko_id
              ]
            );
            
            console.log(`🆕 Created new product: ${namaProduk}`);
          }

          // 5. Insert mutasi stok
          await connection.query(
            `INSERT INTO mutasi_stok 
             (produk_id, toko_id, quantity, stok_sebelum, stok_sesudah, 
              tipe, sumber, ref_id, harga_beli, harga_jual, created_at) 
             VALUES (?, ?, ?, ?, ?, 'MASUK', 'PEMBELIAN', ?, ?, ?, NOW())`,
            [
              produkId,
              pembelianData.toko_id,
              detail.quantity || 1,
              stokSebelum,
              stokSesudah,
              pembelianId,
              hargaBeliProduk,
              hargaJualProduk
            ]
          );
          
          console.log(`📝 Mutasi stok recorded`);
        }
      }

      // 6. UPDATE TOTAL PEMBELIAN
      await connection.query(
        `UPDATE pembelian SET total = ? WHERE id = ?`,
        [calculatedTotal, pembelianId]
      );

      await connection.commit();
      console.log('✅ Transaction committed successfully');
      
      return { 
        success: true, 
        pembelianId, 
        invoice: invoiceNumber,
        total: calculatedTotal,
        message: 'Pembelian berhasil dibuat'
      };

    } catch (error) {
      await connection.rollback();
      console.error('❌ Transaction rolled back:', error.message);
      throw error;
    } finally {
      connection.release();
    }
  },

  // ============================================
  // 2. GET ALL PEMBELIAN
  // ============================================
  async getAllPembelian() {
    try {
      const [rows] = await pool.query(`
        SELECT 
          p.id,
          p.invoice,
          p.total,
          p.status,
          DATE_FORMAT(p.tanggal, '%Y-%m-%d %H:%i:%s') as tanggal,
          p.users_id,
          p.toko_id,
          p.created_at,
          u.nama_lengkap as user_nama,
          t.nama_toko as toko_nama
        FROM pembelian p
        LEFT JOIN users u ON p.users_id = u.id
        LEFT JOIN toko t ON p.toko_id = t.id
        ORDER BY p.tanggal DESC
      `);
      return rows;
    } catch (error) {
      console.error('Error getAllPembelian:', error);
      throw error;
    }
  },

  // ============================================
  // 3. GET PEMBELIAN BY ID
  // ============================================
  async getPembelianById(id) {
    try {
      // Get detail pembelian
      const [detail] = await pool.query(
        `SELECT 
          dp.*
        FROM detail_pembelian dp
        LEFT JOIN produk pr ON dp.produk_id = pr.id
        WHERE dp.pembelian_id = ?`,
        [id]
      );
      return detail;
    } catch (error) {
      console.error('Error getPembelianById:', error);
      throw error;
    }
  },

  // ============================================
  // 4. GET PEMBELIAN BY TOKO
  // ============================================
  async getPembelianByToko(tokoId, filters = {}) {
    try {
      let query = `
        SELECT 
          p.id,
          p.invoice,
          p.total,
          p.status,
          DATE_FORMAT(p.tanggal, '%Y-%m-%d') as tanggal,
          p.users_id,
          p.toko_id,
          p.created_at,
          u.nama_lengkap as user_nama,
          COUNT(dp.id) as jumlah_item,
          SUM(dp.quantity) as total_quantity
        FROM pembelian p
        LEFT JOIN users u ON p.users_id = u.id
        LEFT JOIN detail_pembelian dp ON p.id = dp.pembelian_id
        WHERE p.toko_id = ?
      `;
      
      const params = [tokoId];
      
      if (filters.status && filters.status !== 'ALL') {
        query += ` AND p.status = ?`;
        params.push(filters.status);
      }
      
      if (filters.start_date && filters.end_date) {
        query += ` AND DATE(p.tanggal) BETWEEN ? AND ?`;
        params.push(filters.start_date, filters.end_date);
      }
      
      if (filters.search) {
        query += ` AND p.invoice LIKE ?`;
        params.push(`%${filters.search}%`);
      }
      
      query += ` GROUP BY p.id ORDER BY p.tanggal DESC`;
      
      if (filters.limit) {
        query += ` LIMIT ?`;
        params.push(parseInt(filters.limit));
      }
      
      const [rows] = await pool.query(query, params);
      return rows;
    } catch (error) {
      console.error('Error getPembelianByToko:', error);
      throw error;
    }
  },

  // ============================================
  // 5. UPDATE HARGA BELI (Single Item)
  // ============================================
  async updateHargaBeli(pembelianId, detailId, hargaBeliBaru) {
    const connection = await pool.getConnection();
    
    try {
      await connection.beginTransaction();

      // 1. Get detail information
      const [detail] = await connection.query(
        `SELECT dp.*, p.toko_id 
         FROM detail_pembelian dp
         JOIN pembelian p ON dp.pembelian_id = p.id
         WHERE dp.id = ? AND dp.pembelian_id = ?`,
        [detailId, pembelianId]
      );

      if (detail.length === 0) {
        throw new Error('Detail pembelian tidak ditemukan');
      }

      const produkId = detail[0].produk_id;
      const tokoId = detail[0].toko_id;
      const quantity = detail[0].quantity;
      const subtotalBaru = hargaBeliBaru * quantity;

      // 2. Update detail_pembelian
      await connection.query(
        `UPDATE detail_pembelian 
         SET harga_beli = ?, subtotal = ?, updated_at = NOW()
         WHERE id = ?`,
        [hargaBeliBaru, subtotalBaru, detailId]
      );

      // 3. Update produk jika ada produk_id
      if (produkId) {
        await connection.query(
          `UPDATE produk 
           SET harga_beli = ?, updated_at = NOW()
           WHERE id = ? AND toko_id = ?`,
          [hargaBeliBaru, produkId, tokoId]
        );

        // 4. Update mutasi_stok
        await connection.query(
          `UPDATE mutasi_stok 
           SET harga_beli = ?, updated_at = NOW()
           WHERE ref_id = ? AND produk_id = ? AND sumber = 'PEMBELIAN'`,
          [hargaBeliBaru, pembelianId, produkId]
        );
      }

      // 5. Recalculate total pembelian
      const [detailPembelian] = await connection.query(
        `SELECT SUM(subtotal) as total FROM detail_pembelian WHERE pembelian_id = ?`,
        [pembelianId]
      );

      const totalBaru = detailPembelian[0].total || 0;

      await connection.query(
        `UPDATE pembelian SET total = ?, updated_at = NOW() WHERE id = ?`,
        [totalBaru, pembelianId]
      );

      await connection.commit();
      
      return {
        success: true,
        detail_id: detailId,
        produk_id: produkId,
        harga_beli_baru: hargaBeliBaru,
        total_baru: totalBaru
      };

    } catch (error) {
      await connection.rollback();
      console.error('Error updateHargaBeli:', error);
      throw error;
    } finally {
      connection.release();
    }
  },

  // ============================================
  // 6. GET HARGA PRODUK
  // ============================================
  async getHargaProduk(produkId, tokoId) {
    try {
      const [produk] = await pool.query(
        `SELECT id, nama_produk, harga_beli, harga_jual, stok 
         FROM produk 
         WHERE id = ? AND toko_id = ?`,
        [produkId, tokoId]
      );

      if (produk.length === 0) {
        return null;
      }

      return produk[0];
    } catch (error) {
      console.error('Error getHargaProduk:', error);
      throw error;
    }
  },

  // ============================================
  // 7. SEARCH PRODUK
  // ============================================
  async searchProduk(keyword, tokoId) {
    try {
      const [produk] = await pool.query(
        `SELECT id, nama_produk, harga_beli, harga_jual, stok 
         FROM produk 
         WHERE (nama_produk LIKE ? OR id = ?) 
         AND toko_id = ?
         ORDER BY nama_produk
         LIMIT 20`,
        [`%${keyword}%`, keyword, tokoId]
      );

      return produk;
    } catch (error) {
      console.error('Error searchProduk:', error);
      throw error;
    }
  },

  // ============================================
  // 8. GET ALL TOKO
  // ============================================
  async getAllToko() {
    try {
      const [toko] = await pool.query(`
        SELECT 
          id,
          nama,
          alamat,
          created_at,
          (SELECT COUNT(*) FROM pembelian WHERE toko_id = toko.id) as total_pembelian
        FROM toko
        ORDER BY nama
      `);
      return toko;
    } catch (error) {
      console.error('Error getAllToko:', error);
      throw error;
    }
  },

  // ============================================
  // 9. UPDATE STATUS PEMBELIAN
  // ============================================
  async updateStatusPembelian(pembelianId, status) {
    try {
      await pool.query(
        `UPDATE pembelian SET status = ?, updated_at = NOW() WHERE id = ?`,
        [status, pembelianId]
      );
      
      return { success: true, pembelianId, status };
    } catch (error) {
      console.error('Error updateStatusPembelian:', error);
      throw error;
    }
  },

  // ============================================
  // 10. DELETE PEMBELIAN (Soft Delete)
  // ============================================
  async deletePembelian(pembelianId) {
    const connection = await pool.getConnection();
    
    try {
      await connection.beginTransaction();

      // 1. Get semua detail untuk rollback stok
      const [details] = await connection.query(
        `SELECT dp.produk_id, dp.quantity, p.toko_id 
         FROM detail_pembelian dp
         JOIN pembelian p ON dp.pembelian_id = p.id
         WHERE dp.pembelian_id = ?`,
        [pembelianId]
      );

      // 2. Rollback stok untuk setiap produk
      for (const detail of details) {
        if (detail.produk_id) {
          await connection.query(
            `UPDATE produk 
             SET stok = stok - ?,
                 updated_at = NOW()
             WHERE id = ? AND toko_id = ?`,
            [detail.quantity, detail.produk_id, detail.toko_id]
          );
        }
      }

      // 3. Delete mutasi stok
      await connection.query(
        `DELETE FROM mutasi_stok WHERE ref_id = ? AND sumber = 'PEMBELIAN'`,
        [pembelianId]
      );

      // 4. Delete detail pembelian
      await connection.query(
        `DELETE FROM detail_pembelian WHERE pembelian_id = ?`,
        [pembelianId]
      );

      // 5. Delete pembelian
      await connection.query(
        `DELETE FROM pembelian WHERE id = ?`,
        [pembelianId]
      );

      await connection.commit();
      
      return { success: true, message: 'Pembelian berhasil dihapus' };
    } catch (error) {
      await connection.rollback();
      console.error('Error deletePembelian:', error);
      throw error;
    } finally {
      connection.release();
    }
  },

  // ============================================
  // 11. GET STATISTIK PEMBELIAN
  // ============================================
  async getStatistikPembelian(tokoId, periode = 'month') {
    try {
      let dateFormat, interval;
      
      switch (periode) {
        case 'day':
          dateFormat = '%Y-%m-%d';
          interval = '7 DAY';
          break;
        case 'week':
          dateFormat = '%Y-%u';
          interval = '8 WEEK';
          break;
        case 'month':
        default:
          dateFormat = '%Y-%m';
          interval = '12 MONTH';
          break;
      }

      const [statistik] = await pool.query(`
        SELECT 
          DATE_FORMAT(tanggal, ?) as periode,
          COUNT(*) as jumlah_transaksi,
          SUM(total) as total_nilai,
          AVG(total) as rata_rata,
          MAX(total) as transaksi_terbesar,
          MIN(total) as transaksi_terkecil
        FROM pembelian
        WHERE toko_id = ? 
          AND status = 'SELESAI'
          AND tanggal >= DATE_SUB(NOW(), INTERVAL ${interval})
        GROUP BY DATE_FORMAT(tanggal, ?)
        ORDER BY periode DESC
      `, [dateFormat, tokoId, dateFormat]);

      return statistik;
    } catch (error) {
      console.error('Error getStatistikPembelian:', error);
      throw error;
    }
  },

    async updateStatusPembelian(pembelianId, status, alasanCancel = null) {
    const connection = await pool.getConnection();
    
    try {
      await connection.beginTransaction();

      // 1. Get data pembelian
      const [pembelian] = await pool.query(
        `SELECT * FROM pembelian WHERE id = ?`,
        [pembelianId]
      );

      if (pembelian.length === 0) {
        throw new Error('Pembelian tidak ditemukan');
      }

      const currentStatus = pembelian[0].status;
      const tokoId = pembelian[0].toko_id;
      const invoice = pembelian[0].invoice;

      console.log(`🔄 Update status pembelian ${pembelianId} (${invoice}): ${currentStatus} → ${status}`);

      // 2. Update status di tabel pembelian
      await connection.query(
        `UPDATE pembelian 
         SET status = ?, 
             updated_at = NOW() 
         WHERE id = ?`,
        [status, pembelianId]
      );

      // 3. Log untuk status BATAL/CANCEL
      if (status === 'BATAL' && alasanCancel) {
        await connection.query(
          `INSERT INTO log_pembelian (pembelian_id, action, keterangan, created_at)
           VALUES (?, 'CANCEL', ?, NOW())`,
          [pembelianId, alasanCancel]
        );
      }

      // 4. PROSES ROLLBACK STOK JIKA STATUS JADI BATAL
      if (currentStatus !== 'BATAL' && status === 'BATAL') {
        console.log(`📉 Rollback stok untuk pembelian ${pembelianId}`);
        
        // Get semua detail pembelian
        const [details] = await connection.query(
          `SELECT * FROM detail_pembelian WHERE pembelian_id = ?`,
          [pembelianId]
        );

        for (const detail of details) {
          if (detail.produk_id) {
            // Get stok saat ini
            const [produk] = await connection.query(
              `SELECT stok, harga_jual FROM produk WHERE id = ? AND toko_id = ?`,
              [detail.produk_id, tokoId]
            );

            if (produk.length > 0) {
              const stokSebelum = produk[0].stok;
              const stokSesudah = stokSebelum - detail.quantity;

              // Validasi stok cukup untuk dikurangi
              if (stokSesudah < 0) {
                throw new Error(`Stok produk ${detail.nama_produk} tidak cukup untuk rollback. Stok: ${stokSebelum}, butuh: ${detail.quantity}`);
              }

              // Update stok produk (kurangi)
              await connection.query(
                `UPDATE produk 
                 SET stok = ?, 
                     updated_at = NOW() 
                 WHERE id = ? AND toko_id = ?`,
                [stokSesudah, detail.produk_id, tokoId]
              );

              console.log(`📦 Stok produk ${detail.produk_id}: ${stokSebelum} → ${stokSesudah}`);

              // Buat mutasi stok KELUAR untuk cancel
              await connection.query(
                `INSERT INTO mutasi_stok 
                 (produk_id, toko_id, quantity, stok_sebelum, stok_sesudah, 
                  tipe, sumber, ref_id, harga_beli, harga_jual, created_at) 
                 VALUES (?, ?, ?, ?, ?, 'KELUAR', 'cancel_pembelian', ?, ?, ?, NOW())`,
                [
                  detail.produk_id,
                  tokoId,
                  detail.quantity,
                  stokSebelum,
                  stokSesudah,
                  pembelianId,
                  detail.harga_beli,
                  produk[0].harga_jual
                ]
              );
            }
          }
        }
      }

      // 5. PROSES RESTORE STOK JIKA DARI BATAL KE SELESAI/PROSES
      else if (currentStatus === 'BATAL' && (status === 'SELESAI' || status === 'PROSES')) {
        console.log(`📈 Restore stok untuk pembelian ${pembelianId}`);
        
        const [details] = await connection.query(
          `SELECT * FROM detail_pembelian WHERE pembelian_id = ?`,
          [pembelianId]
        );

        for (const detail of details) {
          if (detail.produk_id) {
            const [produk] = await connection.query(
              `SELECT stok, harga_jual FROM produk WHERE id = ? AND toko_id = ?`,
              [detail.produk_id, tokoId]
            );

            if (produk.length > 0) {
              const stokSebelum = produk[0].stok;
              const stokSesudah = stokSebelum + detail.quantity;

              // Update stok produk (tambah)
              await connection.query(
                `UPDATE produk 
                 SET stok = ?, 
                     updated_at = NOW() 
                 WHERE id = ? AND toko_id = ?`,
                [stokSesudah, detail.produk_id, tokoId]
              );

              console.log(`📦 Stok produk ${detail.produk_id}: ${stokSebelum} → ${stokSesudah}`);

              // Buat mutasi stok MASUK untuk restore
              await connection.query(
                `INSERT INTO mutasi_stok 
                 (produk_id, toko_id, quantity, stok_sebelum, stok_sesudah, 
                  tipe, sumber, ref_id, harga_beli, harga_jual, created_at) 
                 VALUES (?, ?, ?, ?, ?, 'MASUK', 'RESTORE', ?, ?, ?, NOW())`,
                [
                  detail.produk_id,
                  tokoId,
                  detail.quantity,
                  stokSebelum,
                  stokSesudah,
                  pembelianId,
                  detail.harga_beli,
                  produk[0].harga_jual
                ]
              );

              // Hapus mutasi cancel sebelumnya
              await connection.query(
                `DELETE FROM mutasi_stok 
                 WHERE ref_id = ? AND produk_id = ? AND sumber = 'CANCEL'`,
                [pembelianId, detail.produk_id]
              );
            }
          }
        }
      }

      // 6. PROSES NORMAL UNTUK STATUS LAIN (DRAFT, PROSES, SELESAI)
      else if (status === 'SELESAI' && currentStatus !== 'SELESAI') {
        console.log(`✅ Pembelian ${pembelianId} diselesaikan`);
        
        // Log untuk status SELESAI
        await connection.query(
          `INSERT INTO log_pembelian (pembelian_id, action, created_at)
           VALUES (?, 'COMPLETE', NOW())`,
          [pembelianId]
        );
      }

      await connection.commit();

      return {
        success: true,
        pembelianId,
        invoice,
        status_lama: currentStatus,
        status_baru: status,
        message: `Status berhasil diubah dari ${currentStatus} ke ${status}`
      };

    } catch (error) {
      await connection.rollback();
      console.error('❌ Error updateStatusPembelian:', error);
      throw error;
    } finally {
      connection.release();
    }
  }
};




module.exports = Pembelian;