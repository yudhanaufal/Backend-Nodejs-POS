const express = require('express');
const router = express.Router();
const returnController = require('../controllers/returnController');

// GET all return
router.get('/', returnController.getAllReturn);

// GET return by ID
router.get('/:id', returnController.getReturnById);

// GET return by toko
router.get('/toko/:toko_id', returnController.getReturnByToko);

// GET return by status
router.get('/status/:status', returnController.getReturnByStatus);

// GET return by produk
router.get('/produk/:produk_id', returnController.getReturnByProduk);

// GET summary return
router.get('/summary/:toko_id', returnController.getSummary);

// POST create return
router.post('/', returnController.createReturn);

// PUT update return
router.put('/:id', returnController.updateReturn);

// PATCH update status return
router.patch('/:id/status', returnController.updateStatus);

// DELETE return
router.delete('/:id', returnController.deleteReturn);

// Di src/routes/returnRoutes.js, tambah route:

// GET return with approval info
router.get('/:id/approval-info', async (req, res) => {
  try {
    const { id } = req.params;
    
    const returnItem = await ReturnModel.getById(id);
    
    if (!returnItem) {
      return res.status(404).json({
        success: false,
        message: "Return tidak ditemukan"
      });
    }
    
    // Get admin info jika ada
    let adminInfo = null;
    if (returnItem.approved_by) {
      const admin = await User.getById(returnItem.approved_by);
      if (admin) {
        adminInfo = {
          id: admin.id,
          username: admin.username,
          nama_lengkap: admin.nama_lengkap
        };
      }
    }
    
    res.json({
      success: true,
      data: {
        ...returnItem,
        admin_info: adminInfo
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

module.exports = router;