const User = require('../models/Users');
const Toko = require('../models/Toko');

exports.createUser = async (req, res) => {
  try {
    const { 
      username, 
      password, 
      nama_lengkap, 
      email, 
      telepon, 
      role, 
      toko_id 
    } = req.body;

    // Validasi input wajib
    if (!username || !password || !nama_lengkap) {
      return res.status(400).json({
        success: false,
        message: "Username, password, dan nama lengkap wajib diisi"
      });
    }

    // Validasi panjang password
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password minimal 6 karakter"
      });
    }

    // Cek apakah username sudah terdaftar
    const usernameExists = await User.usernameExists(username);
    if (usernameExists) {
      return res.status(409).json({
        success: false,
        message: "Username sudah terdaftar"
      });
    }

    // Cek apakah email sudah terdaftar (jika ada)
    if (email) {
      const emailExists = await User.emailExists(email);
      if (emailExists) {
        return res.status(409).json({
          success: false,
          message: "Email sudah terdaftar"
        });
      }
    }

    // Validasi toko_id (jika ada)
    if (toko_id) {
      const tokoExists = await Toko.exists(toko_id);
      if (!tokoExists) {
        return res.status(404).json({
          success: false,
          message: "Toko tidak ditemukan"
        });
      }
    }

    // Validasi role
    const validRoles = ['admin', 'kasir', 'gudang', 'owner'];
    if (role && !validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: `Role tidak valid. Pilih dari: ${validRoles.join(', ')}`
      });
    }

    // Create user
    const userId = await User.create({
      username,
      password,
      nama_lengkap,
      email: email || null,
      telepon: telepon || null,
      role: role || 'kasir',
      toko_id: toko_id || null
    });

    // Get created user
    const newUser = await User.getById(userId);

    res.status(201).json({
      success: true,
      message: "User berhasil dibuat",
      data: newUser
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({
      success: false,
      message: "Gagal membuat user",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

exports.getAllUsers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const toko_id = req.query.toko_id; // Filter by toko_id
    
    const filters = {};
    if (toko_id) filters.toko_id = toko_id;
    
    const result = await User.getAll(page, limit, filters);
    
    res.json({
      success: true,
      message: "Data user berhasil diambil",
      data: result.data,
      pagination: result.pagination
    });
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({
      success: false,
      message: "Gagal mengambil data user"
    });
  }
};

exports.getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const user = await User.getById(id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User tidak ditemukan"
      });
    }
    
    res.json({
      success: true,
      message: "User berhasil ditemukan",
      data: user
    });
  } catch (error) {
    console.error('Get user by id error:', error);
    res.status(500).json({
      success: false,
      message: "Gagal mengambil data user"
    });
  }
};

exports.getUsersByToko = async (req, res) => {
  try {
    const { toko_id } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    
    // Validasi toko_id
    if (!toko_id || isNaN(toko_id)) {
      return res.status(400).json({
        success: false,
        message: "ID toko tidak valid"
      });
    }
    
    // Cek apakah toko exists
    const tokoExists = await Toko.exists(toko_id);
    if (!tokoExists) {
      return res.status(404).json({
        success: false,
        message: "Toko tidak ditemukan"
      });
    }
    
    const result = await User.getByTokoId(parseInt(toko_id), page, limit);
    
    res.json({
      success: true,
      message: `Data user toko ${toko_id} berhasil diambil`,
      data: result.data,
      pagination: result.pagination
    });
  } catch (error) {
    console.error('Get users by toko error:', error);
    res.status(500).json({
      success: false,
      message: "Gagal mengambil data user"
    });
  }
};

exports.updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      nama_lengkap, 
      email, 
      telepon, 
      role, 
      toko_id,
      is_active 
    } = req.body;
    
    // Cek apakah user exists
    const userExists = await User.exists(id);
    if (!userExists) {
      return res.status(404).json({
        success: false,
        message: "User tidak ditemukan"
      });
    }
    
    // Validasi email (jika diupdate)
    if (email) {
      const emailExists = await User.emailExists(email, id);
      if (emailExists) {
        return res.status(409).json({
          success: false,
          message: "Email sudah terdaftar"
        });
      }
    }
    
    // Validasi toko_id (jika ada)
    if (toko_id) {
      const tokoExists = await Toko.exists(toko_id);
      if (!tokoExists) {
        return res.status(404).json({
          success: false,
          message: "Toko tidak ditemukan"
        });
      }
    }
    
    // Validasi role
    if (role) {
      const validRoles = ['admin', 'kasir', 'gudang', 'owner'];
      if (!validRoles.includes(role)) {
        return res.status(400).json({
          success: false,
          message: `Role tidak valid. Pilih dari: ${validRoles.join(', ')}`
        });
      }
    }
    
    // Update user
    const updated = await User.update(id, {
      nama_lengkap,
      email: email || null,
      telepon: telepon || null,
      role: role || 'kasir',
      toko_id: toko_id || null,
      is_active: is_active !== undefined ? is_active : true
    });
    
    if (!updated) {
      return res.status(400).json({
        success: false,
        message: "Gagal mengupdate user"
      });
    }
    
    const updatedUser = await User.getById(id);
    
    res.json({
      success: true,
      message: "User berhasil diupdate",
      data: updatedUser
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      success: false,
      message: "Gagal mengupdate user"
    });
  }
};

exports.updatePassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { current_password, new_password } = req.body;
    
    if (!current_password || !new_password) {
      return res.status(400).json({
        success: false,
        message: "Password lama dan baru wajib diisi"
      });
    }
    
    if (new_password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password baru minimal 6 karakter"
      });
    }
    
    // Get user with password
    const user = await User.getByUsername(req.user?.username || '');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User tidak ditemukan"
      });
    }
    
    // Verify current password
    const isValid = await User.verifyPassword(current_password, user.password);
    if (!isValid) {
      return res.status(401).json({
        success: false,
        message: "Password lama salah"
      });
    }
    
    // Update password
    const updated = await User.updatePassword(id, new_password);
    
    if (!updated) {
      return res.status(400).json({
        success: false,
        message: "Gagal mengupdate password"
      });
    }
    
    res.json({
      success: true,
      message: "Password berhasil diupdate"
    });
  } catch (error) {
    console.error('Update password error:', error);
    res.status(500).json({
      success: false,
      message: "Gagal mengupdate password"
    });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Cek apakah user exists
    const userExists = await User.exists(id);
    if (!userExists) {
      return res.status(404).json({
        success: false,
        message: "User tidak ditemukan"
      });
    }
    
    // Tidak boleh delete diri sendiri (jika ada auth)
    if (req.user && req.user.id === parseInt(id)) {
      return res.status(403).json({
        success: false,
        message: "Tidak dapat menghapus akun sendiri"
      });
    }
    
    const deleted = await User.delete(id);
    
    if (!deleted) {
      return res.status(400).json({
        success: false,
        message: "Gagal menghapus user"
      });
    }
    
    res.json({
      success: true,
      message: "User berhasil dihapus"
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      message: "Gagal menghapus user"
    });
  }
};