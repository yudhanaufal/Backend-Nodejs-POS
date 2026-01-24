const Transaksi = require('../models/Transaksi');

    exports.createTransaksi = async (req, res) => {
        try {
            const result = await Transaksi.create(req.body);
            res.status(201).json({
                status: "Success",
                message: "Transaksi berhasil dan stok telah diperbarui",
                data: result
            });
        } catch (error) {
            res.status(400).json({ // 400 jika error bisnis (seperti stok habis)
                status: "Error",
                message: error.message
            });
        }
    };

    exports.cancelTransaksi = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await Transaksi.cancel(id, req.body);
        res.json({
            status: "Success",
            message: result.message
        });
    } catch (error) {
        res.status(400).json({
            status: "Error",
            message: error.message
        });
    }
};


// const getRiwayat = async (req, res) => {
//     try {
//         const data = await Transaksi.getAll();
//         res.json(data);
//     } catch (error) {
//         res.status(500).json({ message: error.message });
//     }
// };
exports.getTransaksi = async (req, res) => {
    try {
        const data = await Transaksi.getTransaksi();
        res.json(data);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }   
};

exports.getTransaksiById = async (req, res) => {
    try {
        const id = req.params.id;
        const data = await Transaksi.getById(id);

        if (!data) {
            return res.status(404).json({ message: "Transaksi tidak ditemukan" });
        }

        res.json(data);
    } catch (error) {
        res.status(500).json({ message: "Gagal mengambil data", error: error.message });
    }
};


