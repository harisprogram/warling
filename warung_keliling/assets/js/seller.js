// File: /assets/js/seller.js - Final Audited Version (Name + PIN)

// ---- Safety Check Awal ----
if (typeof window.supabase === 'undefined') {
    console.error("Supabase client not loaded.");
    document.body.innerHTML = '<main class="container"><h1>Error Kritis: Konfigurasi Gagal.</h1></main>';
    throw new Error("Supabase is required.");
}

// ---- Deklarasi Variabel Global ----
let sellerProfile = null; // Menyimpan data profil lengkap

// ---- Inisialisasi Aplikasi ----
document.addEventListener('DOMContentLoaded', function() {
    initializeSellerPage();
    initializeEventListeners();
});

async function initializeSellerPage() {
    const savedShopName = localStorage.getItem('sellerShopName');
    if (savedShopName) {
        document.getElementById('shop-name-input').value = savedShopName;
        document.getElementById('pin-input').focus();
    }
}

function initializeEventListeners() {
    document.getElementById('auth-form').addEventListener('submit', handleAuthFormSubmit);
    document.getElementById('toggle-mode-link').addEventListener('click', toggleAuthMode);
    document.getElementById('logout-btn').addEventListener('click', handleLogout);
    document.getElementById('profile-form').addEventListener('submit', handleProfileSave);
    document.getElementById('update-location-btn').addEventListener('click', handleLocationUpdate);
    document.getElementById('product-form').addEventListener('submit', handleProductSubmit);
}

// ---- FUNGSI PENGATUR TAMPILAN (VIEW) ----
function showLoginView() { document.getElementById('login-view').classList.remove('hidden');
    document.getElementById('dashboard-view').classList.add('hidden'); }

function showDashboardView() { document.getElementById('login-view').classList.add('hidden');
    document.getElementById('dashboard-view').classList.remove('hidden'); }

function toggleAuthMode(event) {
    if (event) event.preventDefault();
    const formTitle = document.getElementById('form-title');
    const authButton = document.getElementById('auth-button');
    const toggleLink = document.getElementById('toggle-mode-link');
    const isLoginMode = authButton.textContent === 'Masuk';
    if (isLoginMode) {
        formTitle.textContent = "Buat Akun Baru";
        authButton.textContent = "Daftar";
        toggleLink.textContent = "Sudah punya akun? Masuk di sini";
    } else {
        formTitle.textContent = "Masuk ke Akun Anda";
        authButton.textContent = "Masuk";
        toggleLink.textContent = "Belum punya akun? Buat akun baru";
    }
}

// ---- FUNGSI HANDLER UNTUK OTENTIKASI ----
function handleAuthFormSubmit(event) {
    event.preventDefault();
    const isLoginMode = document.getElementById('auth-button').textContent === 'Masuk';
    if (isLoginMode) { handleLogin(); } else { handleSignUp(); }
}

async function handleSignUp() {
    const shopName = document.getElementById('shop-name-input').value.trim();
    const pin = document.getElementById('pin-input').value.trim();
    const authMessage = document.getElementById('auth-message');
    if (!/^\d{6}$/.test(pin)) {
        authMessage.textContent = 'PIN harus 6 digit angka.';
        authMessage.classList.remove('hidden');
        return;
    }
    authMessage.textContent = "Mendaftarkan...";
    authMessage.classList.remove('hidden');

    const { data, error } = await window.supabase.rpc('signup_seller', { shop_name: shopName, plain_pin: pin });

    if (error) {
        if (error.code === '23505' || error.message.includes('duplicate key value')) {
            return authMessage.textContent = 'Gagal: Nama Usaha ini sudah digunakan.';
        }
        return authMessage.textContent = `Gagal mendaftar: ${error.message}`;
    }
    authMessage.textContent = "Pendaftaran berhasil! Menyimpan sesi dan masuk...";
    localStorage.setItem('sellerShopName', shopName);
    sellerProfile = data;
    showDashboardView();
    populateDashboardWithProfileData();
}

async function handleLogin() {
    const shopName = document.getElementById('shop-name-input').value.trim();
    const pin = document.getElementById('pin-input').value.trim();
    const authMessage = document.getElementById('auth-message');
    authMessage.textContent = "Mencoba masuk...";
    authMessage.classList.remove('hidden');

    const { data, error } = await window.supabase.rpc('check_pin', { seller_name: shopName, plain_pin: pin });
    if (error || !data || data.length === 0) {
        authMessage.textContent = 'Gagal masuk: Nama Usaha atau PIN salah.';
        return;
    }
    authMessage.textContent = "Login berhasil!";
    localStorage.setItem('sellerShopName', shopName);
    sellerProfile = data[0].profile;
    showDashboardView();
    populateDashboardWithProfileData();
}

function handleLogout() {
    if (confirm("Yakin ingin keluar?")) {
        sellerProfile = null;
        document.getElementById('pin-input').value = '';
        showLoginView();
    }
}

// ---- FUNGSI HANDLER UNTUK DASBOR ----
function populateDashboardWithProfileData() {
    if (!sellerProfile) return;
    document.getElementById('name').value = sellerProfile.name || '';
    document.getElementById('description').value = sellerProfile.description || '';
    document.getElementById('phone_number').value = sellerProfile.phone_number || '';
    document.getElementById('seller-type').value = sellerProfile.seller_type || '';
    document.getElementById('broadcast_message').value = sellerProfile.broadcast_message || '';
    loadProducts();
}

async function handleProfileSave(event) {
    event.preventDefault();
    if (!sellerProfile) return alert('Sesi tidak valid.');
    const updates = {
        description: document.getElementById('description').value,
        phone_number: document.getElementById('phone_number').value,
        seller_type: document.getElementById('seller-type').value,
        broadcast_message: document.getElementById('broadcast_message').value,
        last_updated_at: new Date().toISOString()
    };
    const { data, error } = await window.supabase.from('sellers').update(updates).eq('id', sellerProfile.id).select().single();
    if (error) { alert('Gagal menyimpan profil: ' + error.message); } else { sellerProfile = data;
        alert('Profil berhasil disimpan!'); }
}

async function handleLocationUpdate() {
    if (!sellerProfile) return;
    const locationStatus = document.getElementById('location-status');
    const locationButton = document.getElementById('update-location-btn');
    locationStatus.textContent = "Mencari lokasi...";
    locationButton.disabled = true;
    try {
        const position = await new Promise((resolve, reject) => { navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }); });
        const { error } = await window.supabase.rpc('update_seller_location_by_id', { seller_id_to_update: sellerProfile.id, new_lon: position.coords.longitude, new_lat: position.coords.latitude });
        if (error) { locationStatus.textContent = 'Gagal memperbarui: ' + error.message; } else { locationStatus.textContent = 'Lokasi berhasil diperbarui!'; }
    } catch (error) { locationStatus.textContent = `Error Geolocation: ${error.message}`; } finally { locationButton.disabled = false; }
}

async function loadProducts() {
    if (!sellerProfile) return;
    const { data: products, error } = await window.supabase.from('products').select('*').eq('seller_id', sellerProfile.id);
    if (error) { console.error("Gagal memuat produk:", error); return; }
    const productList = document.getElementById('product-list');
    productList.innerHTML = '';
    products.forEach(p => { const item = document.createElement('div');
        item.className = 'product-item';
        item.innerHTML = `<div><strong>${p.name}</strong><br><span>Rp ${p.price}</span></div><button onclick="deleteProduct('${p.id}')" class="secondary outline">Hapus</button>`;
        productList.appendChild(item); });
    const productCount = products.length;
    const maxProducts = 10;
    document.getElementById('product-counter').textContent = `${productCount}/${maxProducts}`;
    document.getElementById('add-product-btn').disabled = productCount >= maxProducts;
    document.getElementById('limit-notice').classList.toggle('hidden', productCount < maxProducts);
}

async function handleProductSubmit(event) {
    event.preventDefault();
    if (!sellerProfile) return;
    const newProduct = { seller_id: sellerProfile.id, name: document.getElementById('product-name').value, price: document.getElementById('product-price').value };
    const { error } = await window.supabase.from('products').insert(newProduct);
    if (error) { alert('Gagal menambah produk: ' + error.message); } else { document.getElementById('product-form').reset();
        await loadProducts(); }
}

window.deleteProduct = async function(productId) {
    if (confirm("Yakin ingin menghapus produk ini?")) {
        const { error } = await window.supabase.from('products').delete().eq('id', productId);
        if (error) { alert('Gagal menghapus produk: ' + error.message); } else { await loadProducts(); }
    }
};