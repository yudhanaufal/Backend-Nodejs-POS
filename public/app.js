// ==================== Configuration ====================
const API_BASE_URL = '/api';
const AUTO_REFRESH_INTERVAL = 60000; // 60 seconds (1 minute)

// ==================== State Management ====================
let currentStore = null;
let allProducts = [];
let filteredProducts = [];
let refreshTimer = null;
let cart = [];
let currentStoreName = '';
let currentStorePhone = '';

// ==================== DOM Elements ====================
const storeSelector = document.getElementById('storeSelector');
const searchSection = document.getElementById('searchSection');
const searchInput = document.getElementById('searchInput');
const clearSearchBtn = document.getElementById('clearSearch');
const loadingState = document.getElementById('loadingState');
const emptyState = document.getElementById('emptyState');
const errorState = document.getElementById('errorState');
const errorMessage = document.getElementById('errorMessage');
const retryButton = document.getElementById('retryButton');
const productsGrid = document.getElementById('productsGrid');
const noResultsState = document.getElementById('noResultsState');

// Cart DOM Elements
const cartButton = document.getElementById('cartButton');
const cartBadge = document.getElementById('cartBadge');
const cartModal = document.getElementById('cartModal');
const cartOverlay = document.getElementById('cartOverlay');
const closeCartBtn = document.getElementById('closeCart');
const cartBody = document.getElementById('cartBody');
const cartEmpty = document.getElementById('cartEmpty');
const cartFooter = document.getElementById('cartFooter');
const totalPriceEl = document.getElementById('totalPrice');
const whatsappBtn = document.getElementById('whatsappButton');

// ==================== Initialization ====================
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
});

async function initializeApp() {
    console.log('🚀 Initializing Customer Catalog App [v1.0.3-vps-fix]');
    console.log('📡 API Base URL:', API_BASE_URL);
    await loadStores();
    setupEventListeners();
}

// ==================== Event Listeners ====================
function setupEventListeners() {
    // Store selection
    storeSelector.addEventListener('change', handleStoreChange);
    
    // Search functionality
    searchInput.addEventListener('input', handleSearch);
    clearSearchBtn.addEventListener('click', clearSearch);
    
    // Retry button
    retryButton.addEventListener('click', () => {
        if (currentStore) {
            loadProducts(currentStore);
        }
    });
}

// ==================== Store Management ====================
async function loadStores() {
    try {
        console.log('📦 Loading stores...');
        const response = await fetch(`${API_BASE_URL}/toko?limit=100`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.success && result.data) {
            populateStoreSelector(result.data);
            console.log(`✅ Loaded ${result.data.length} stores`);
        } else {
            throw new Error('Invalid response format');
        }
    } catch (error) {
        console.error('❌ Error loading stores:', error);
        showError('Gagal memuat daftar toko. Pastikan server berjalan.');
    }
}

function populateStoreSelector(stores) {
    storeSelector.innerHTML = '<option value="">-- Pilih Toko --</option>';
    stores.forEach(store => {
        const option = document.createElement('option');
        option.value = store.id;
        option.textContent = store.nama_toko;
        option.dataset.phone = store.telepon || '';
        option.dataset.name = store.nama_toko;
        storeSelector.appendChild(option);
    });
    console.log(`✅ Populated ${stores.length} stores in selector`);
}


function handleStoreChange(event) {
    const storeId = event.target.value;
    if (storeId) {
        const selectedOption = event.target.options[event.target.selectedIndex];
        currentStore = storeId;
        currentStoreName = selectedOption.dataset.name || selectedOption.textContent;
        currentStorePhone = selectedOption.dataset.phone || '';
        console.log(` Store selected: ${currentStoreName}, Phone: ${currentStorePhone}`);
        loadProducts(storeId);
        searchSection.style.display = 'block';
        startAutoRefresh();
    } else {
        currentStore = null;
        currentStoreName = '';
        currentStorePhone = '';
        stopAutoRefresh();
        searchSection.style.display = 'none';
        showEmptyState();
    }
} 

// ==================== Products Management ====================
async function loadProducts(storeId) {
    try {
        showLoading();
        console.log(`📦 Loading products for store ${storeId}...`);
        
        const url = `${API_BASE_URL}/produk/toko/${storeId}?limit=500`;
        console.log(`🔗 Fetching from: ${url}`);
        
        const response = await fetch(url);
        
        console.log(`📡 Response status: ${response.status}`);
        console.log(`📡 Response ok: ${response.ok}`);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error(`❌ Server error response:`, errorText);
            throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
        }
        
        const result = await response.json();
        console.log(`📦 Response data:`, result);
        
        if (result.success && result.data) {
            allProducts = result.data;
            filteredProducts = [...allProducts];
            renderProducts(filteredProducts);
            console.log(`✅ Loaded ${result.data.length} products`);
        } else {
            console.error(`❌ Invalid response format:`, result);
            throw new Error('Invalid response format');
        }
    } catch (error) {
        console.error('❌ Error loading products:', error);
        console.error('❌ Error details:', error.message);
        showError(`Gagal memuat produk: ${error.message}`);
    }
}

function renderProducts(products) {
    hideAllStates();
    
    if (products.length === 0) {
        if (searchInput.value.trim()) {
            noResultsState.style.display = 'block';
        } else {
            emptyState.querySelector('h3').textContent = 'Tidak Ada Produk';
            emptyState.querySelector('p').textContent = 'Toko ini belum memiliki produk.';
            emptyState.style.display = 'block';
        }
        return;
    }
    
    productsGrid.innerHTML = '';
    productsGrid.style.display = 'grid';
    
    products.forEach(product => {
        const card = createProductCard(product);
        productsGrid.appendChild(card);
    });
}

function createProductCard(product) {
    const card = document.createElement('div');
    card.className = 'product-card';
    
    // Determine stock status
    const stockStatus = getStockStatus(product.stok);
    
    // Format price
    const formattedPrice = formatRupiah(product.harga_jual);
    
    // Image URL
    const imageUrl = product.gambar 
        ? `/uploads/produk/${product.gambar}` 
        : null;
    
    if (imageUrl) {
        console.log(`🖼️ Loading product image: ${imageUrl} (Base: ${window.location.origin})`);
    }
    
    // Check if item is in cart
    const isInCart = cart.some(item => item.id === product.id);
    const cartItem = cart.find(item => item.id === product.id);
    const quantityInCart = cartItem ? cartItem.quantity : 0;

    card.innerHTML = `
        <div class="product-image-wrapper">
            ${imageUrl 
                ? `<img src="${imageUrl}" alt="${product.nama_produk}" class="product-image" loading="lazy" onerror="this.parentElement.innerHTML='<div class=\\'product-image-placeholder\\'>📦</div>'">`
                : '<div class="product-image-placeholder">📦</div>'
            }
        </div>
        <div class="product-info">
            <h3 class="product-name">${escapeHtml(product.nama_produk)}</h3>
            ${product.barcode ? `<div class="product-barcode">${escapeHtml(product.barcode)}</div>` : ''}
            <div class="product-price">${formattedPrice}</div>
            <div class="product-stock ${stockStatus.className}">
                <span class="stock-dot"></span>
                <span>${stockStatus.text}</span>
            </div>
            <button 
                class="add-to-cart-btn ${isInCart ? 'in-cart' : ''}" 
                onclick="event.stopPropagation(); addToCart(${JSON.stringify(product).replace(/"/g, '&quot;')})"
                ${product.stok <= 0 ? 'disabled' : ''}
            >
                ${isInCart ? `🛒 Di Keranjang (${quantityInCart})` : '➕ Tambah ke Keranjang'}
            </button>
        </div>
    `;
    
    return card;
}

// ==================== Search Functionality ====================
function handleSearch(event) {
    const query = event.target.value.toLowerCase().trim();
    
    if (query) {
        clearSearchBtn.style.display = 'flex';
        filteredProducts = allProducts.filter(product => 
            product.nama_produk.toLowerCase().includes(query) ||
            (product.barcode && product.barcode.toLowerCase().includes(query))
        );
    } else {
        clearSearchBtn.style.display = 'none';
        filteredProducts = [...allProducts];
    }
    
    renderProducts(filteredProducts);
}

function clearSearch() {
    searchInput.value = '';
    clearSearchBtn.style.display = 'none';
    filteredProducts = [...allProducts];
    renderProducts(filteredProducts);
    searchInput.focus();
}

// ==================== Auto Refresh ====================
function startAutoRefresh() {
    stopAutoRefresh(); // Clear any existing timer
    
    refreshTimer = setInterval(() => {
        if (currentStore) {
            console.log('🔄 Auto-refreshing products...');
            loadProducts(currentStore);
        }
    }, AUTO_REFRESH_INTERVAL);
}

function stopAutoRefresh() {
    if (refreshTimer) {
        clearInterval(refreshTimer);
        refreshTimer = null;
    }
}

// ==================== UI State Management ====================
function showLoading() {
    hideAllStates();
    loadingState.style.display = 'block';
}

function showError(message) {
    hideAllStates();
    errorMessage.textContent = message;
    errorState.style.display = 'block';
}

function showEmptyState() {
    hideAllStates();
    emptyState.querySelector('h3').textContent = 'Pilih Toko untuk Melihat Produk';
    emptyState.querySelector('p').textContent = 'Silakan pilih toko dari dropdown di atas untuk menampilkan katalog produk';
    emptyState.style.display = 'block';
}

function hideAllStates() {
    loadingState.style.display = 'none';
    emptyState.style.display = 'none';
    errorState.style.display = 'none';
    productsGrid.style.display = 'none';
    noResultsState.style.display = 'none';
}

// ==================== Helper Functions ====================
function getStockStatus(stok) {
    if (stok === 0) {
        return {
            className: 'stock-out-of-stock',
            text: 'Stok Habis'
        };
    } else if (stok <= 10) {
        return {
            className: 'stock-low-stock',
            text: `Stok Menipis (${stok})`
        };
    } else {
        return {
            className: 'stock-in-stock',
            text: `Tersedia (${stok})`
        };
    }
}

function formatRupiah(amount) {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount);
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ==================== Cleanup on page unload ====================
window.addEventListener('beforeunload', () => {
    stopAutoRefresh();
});

// ==================== Cart Functions ====================
function loadCart() {
    const savedCart = localStorage.getItem('catalog_cart');
    if (savedCart) {
        cart = JSON.parse(savedCart);
        updateCartUI();
    }
}

function saveCart() {
    localStorage.setItem('catalog_cart', JSON.stringify(cart));
}

function addToCart(product) {
    const existingItem = cart.find(item => item.id === product.id);
    
    if (existingItem) {
        if (existingItem.quantity < product.stok) {
            existingItem.quantity++;
        } else {
            alert('Stok tidak mencukupi');
            return;
        }
    } else {
        cart.push({
            id: product.id,
            nama_produk: product.nama_produk,
            harga_jual: product.harga_jual,
            gambar: product.gambar,
            stok: product.stok,
            quantity: 1
        });
    }
    
    saveCart();
    updateCartUI();
    renderProducts(filteredProducts); // Re-render to update button states
    console.log(' Product added to cart:', product.nama_produk);
}

function removeFromCart(productId) {
    cart = cart.filter(item => item.id !== productId);
    saveCart();
    updateCartUI();
    renderProducts(filteredProducts);
    console.log(' Product removed from cart');
}

function updateQuantity(productId, newQuantity) {
    const item = cart.find(item => item.id === productId);
    if (item) {
        if (newQuantity > 0 && newQuantity <= item.stok) {
            item.quantity = newQuantity;
            saveCart();
            updateCartUI();
        } else if (newQuantity === 0) {
            removeFromCart(productId);
        } else {
            alert('Stok tidak mencukupi');
        }
    }
}

function calculateTotal() {
    return cart.reduce((total, item) => total + (item.harga_jual * item.quantity), 0);
}

function updateCartUI() {
    // Update badge
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    cartBadge.textContent = totalItems;
    
    // Show/hide cart button
    if (totalItems > 0) {
        cartButton.style.display = 'flex';
    } else {
        cartButton.style.display = 'none';
    }
    
    // Render cart items
    renderCart();

    // Update products grid to refresh button states
    if (filteredProducts.length > 0) {
        renderProducts(filteredProducts);
    }
}

function renderCart() {
    if (cart.length === 0) {
        cartEmpty.style.display = 'block';
        cartFooter.style.display = 'none';
        cartBody.innerHTML = '';
        cartBody.appendChild(cartEmpty);
        return;
    }
    
    cartEmpty.style.display = 'none';
    cartFooter.style.display = 'block';
    
    cartBody.innerHTML = '';
    
    cart.forEach(item => {
        const cartItem = document.createElement('div');
        cartItem.className = 'cart-item';
        
        const imageUrl = item.gambar 
            ? `/uploads/produk/${item.gambar}` 
            : null;
        
        cartItem.innerHTML = `
            ${imageUrl 
                ? `<img src="${imageUrl}" alt="${item.nama_produk}" class="cart-item-image" onerror="this.outerHTML='<div class=\\'cart-item-placeholder\\'></div>'">`
                : '<div class="cart-item-placeholder"></div>'
            }
            <div class="cart-item-details">
                <h4 class="cart-item-name">${escapeHtml(item.nama_produk)}</h4>
                <div class="cart-item-price">${formatRupiah(item.harga_jual)}  ${item.quantity}</div>
                <div class="cart-item-controls">
                    <button class="qty-button" onclick="updateQuantity(${item.id}, ${item.quantity - 1})" ${item.quantity <= 1 ? 'disabled' : ''}></button>
                    <span class="qty-value">${item.quantity}</span>
                    <button class="qty-button" onclick="updateQuantity(${item.id}, ${item.quantity + 1})" ${item.quantity >= item.stok ? 'disabled' : ''}>+</button>
                    <button class="remove-item" onclick="removeFromCart(${item.id})">Hapus</button>
                </div>
            </div>
        `;
        
        cartBody.appendChild(cartItem);
    });
    
    // Update total
    const total = calculateTotal();
    totalPriceEl.textContent = formatRupiah(total);
}

function openCart() {
    cartModal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeCart() {
    cartModal.classList.remove('active');
    document.body.style.overflow = '';
}

function formatWhatsAppMessage() {
    const total = calculateTotal();
    let message = `Halo, saya ingin memesan:\n\n`;
    message += ` Toko: ${currentStoreName}\n\n`;
    message += ` Pesanan:\n`;
    
    cart.forEach((item, index) => {
        message += `${index + 1}. ${item.nama_produk} x${item.quantity} - ${formatRupiah(item.harga_jual * item.quantity)}\n`;
    });
    
    message += `\n Total: ${formatRupiah(total)}\n\n`;
    message += `Terima kasih!`;
    
    return message;
}

function sendToWhatsApp() {
    if (cart.length === 0) {
        alert('Keranjang belanja kosong');
        return;
    }
    
    if (!currentStorePhone) {
        alert('Nomor WhatsApp toko tidak tersedia');
        return;
    }
    
    const message = formatWhatsAppMessage();
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${currentStorePhone}?text=${encodedMessage}`;
    
    console.log(' Opening WhatsApp:', whatsappUrl);
    window.open(whatsappUrl, '_blank');
}

// ==================== Cart Event Listeners ====================
cartButton.addEventListener('click', openCart);
closeCartBtn.addEventListener('click', closeCart);
cartOverlay.addEventListener('click', closeCart);
whatsappBtn.addEventListener('click', sendToWhatsApp);

// Make functions global for onclick handlers
window.addToCart = addToCart;
window.removeFromCart = removeFromCart;
window.updateQuantity = updateQuantity;

// Load cart on init
loadCart();


