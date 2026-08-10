const Sales = require('../models/Sales');

/**
 * @desc    Create new sales
 * @route   POST /api/sales
 * @access  Public
 */
exports.createSales = async (req, res) => {
    try {
        const { nama_sales, no_tlp, alamat } = req.body;
        const salesId = await Sales.createSales({ nama_sales, no_tlp, alamat });
        res.status(201).json({
            success: true,
            message: "Sales berhasil ditambahkan",
            data: {
                id: salesId,
                nama_sales,
                no_tlp,
                alamat
            }
        });
    } catch (error) {
        console.error('Create Sales Error:', error);
        res.status(500).json({
            success: false,
            message: "Gagal membuat sales",
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

exports.updateSales = async (req, res) => {
    try {
        const { id, nama_sales, no_tlp, alamat } = req.body;
        const salesId = await Sales.updateSales({ id, nama_sales, no_tlp, alamat });
        res.json({
            success: true,
            message: "Sales berhasil diupdate",
            data: {
                id: salesId,
                nama_sales,
                no_tlp,
                alamat
            }
        });
    } catch (error) {
        console.error('Update Sales Error:', error);
        res.status(500).json({
            success: false,
            message: "Gagal mengupdate sales",
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

exports.getSales = async (req, res) => {
    try {
        const sales = await Sales.getSales();
        res.json({
            success: true,
            data: sales
        });
    } catch (error) {
        console.error('Get Sales Error:', error);
        res.status(500).json({
            success: false,
            message: "Gagal mengambil data sales",
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

exports.getAllSales = async (req, res) => {
    try {
        const { start_date, end_date } = req.query;

        const sales = await Sales.getAllSales(start_date, end_date);
        res.json({
            success: true,
            data: sales
        });
    } catch (error) {
        console.error('Get All Sales Error:', error);
        res.status(500).json({
            success: false,
            message: "Gagal mengambil data sales",
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

exports.getSalesById = async (req, res) => {
    try {
        const { id } = req.params;
        const { start_date, end_date } = req.query;

        const sales = await Sales.getSalesById(
            id,
            start_date,
            end_date
        );

        if (!sales) {
            return res.status(404).json({
                success: false,
                message: "Sales tidak ditemukan"
            });
        }

        res.json({
            success: true,
            data: sales
        });

    } catch (error) {
        console.error('Get Sales By Id Error:', error);

        res.status(500).json({
            success: false,
            message: "Gagal mengambil detail sales",
            error: process.env.NODE_ENV === 'development'
                ? error.message
                : undefined
        });
    }
};

exports.getMemberByTokoAndSales = async (req, res) => {
    try {
        const { toko_id, sales_id } = req.params;
        const { start_date, end_date } = req.query;

        if (!toko_id || !sales_id) {
            return res.status(400).json({
                success: false,
                message: "toko_id dan sales_id wajib diisi"
            });
        }

        const members = await Sales.getMemberByTokoAndSales(toko_id, sales_id, start_date, end_date);

        res.json({
            success: true,
            data: members
        });
    } catch (error) {
        console.error('Get Member By Toko & Sales Error:', error);
        res.status(500).json({
            success: false,
            message: "Gagal mengambil data member",
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};
