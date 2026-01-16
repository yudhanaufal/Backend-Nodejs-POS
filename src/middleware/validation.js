exports.validateToko = (req, res, next) => {
  const { nama_toko, alamat } = req.body;
  
  if (!nama_toko || nama_toko.trim() === '') {
    return res.status(400).json({
      success: false,
      message: "Nama toko wajib diisi"
    });
  }
  
  if (!alamat || alamat.trim() === '') {
    return res.status(400).json({
      success: false,
      message: "Alamat toko wajib diisi"
    });
  }
  
  if (nama_toko.length < 3) {
    return res.status(400).json({
      success: false,
      message: "Nama toko minimal 3 karakter"
    });
  }
  
  next();
};

exports.validateProduct = (req, res, next) => {
  const { nama_produk, harga } = req.body;
  
  if (!nama_produk || nama_produk.trim() === '') {
    return res.status(400).json({
      success: false,
      message: "Nama produk wajib diisi"
    });
  }
  
  if (!harga || isNaN(harga) || harga <= 0) {
    return res.status(400).json({
      success: false,
      message: "Harga harus berupa angka dan lebih dari 0"
    });
  }
  
  next();
};