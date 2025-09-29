// File: /assets/js/main.js - FINAL AUDITED VERSION (Readable & Bug-Free)

// ---- Safety Check Awal ----
if (typeof window.supabase === 'undefined' || typeof L === 'undefined') {
    console.error("Supabase or Leaflet library not loaded. Check script order in index.html.");
    document.body.innerHTML = '<main class="container"><h1>Error Kritis: Konfigurasi Gagal.</h1></main>';
    throw new Error("Core libraries are missing.");
}

// ---- Deklarasi Variabel Global ----
let map = null;
let userLocation = null;
let sellerMarkers = [];

// ---- Inisialisasi Aplikasi ----
document.addEventListener('DOMContentLoaded', function() {
    setupApplicationFlow();
});

function setupApplicationFlow() {
    // --- Elemen-elemen Interaktif Utama ---
    const welcomeView = document.getElementById('welcome-view');
    const buyerView = document.getElementById('buyer-view');
    const disclaimerModal = document.getElementById('disclaimer-modal');
    const agreeButton = document.getElementById('agree-btn');
    const buyerButton = document.getElementById('buyer-btn');
    const sellerLink = document.getElementById('seller-link');
    const shareAppButton = document.getElementById('share-app-btn');
    const exitBuyerBtn = document.getElementById('exit-buyer-view-btn');
    const shareModal = document.getElementById('share-qr-modal');
    const mapControlsForm = document.getElementById('map-controls-form');
    const radiusSlider = document.getElementById('radius-slider');
    const radiusValue = document.getElementById('radius-value');

    function activateApp() {
        buyerButton.disabled = false;
        shareAppButton.disabled = false;
        sellerLink.classList.remove('disabled');
        sellerLink.removeAttribute('aria-disabled');
    }

    if (localStorage.getItem('disclaimerAccepted') === 'true') {
        activateApp();
    } else {
        disclaimerModal.showModal();
    }
    agreeButton.addEventListener('click', function() { localStorage.setItem('disclaimerAccepted', 'true');
        disclaimerModal.close();
        activateApp(); });
    disclaimerModal.addEventListener('cancel', function(event) { event.preventDefault();
        alert("Anda harus menyetujui ketentuan untuk dapat menggunakan aplikasi."); });

    buyerButton.addEventListener('click', function() {
        welcomeView.classList.add('hidden');
        buyerView.classList.remove('hidden');
        initializeAndShowMap();
    });

    exitBuyerBtn.addEventListener('click', function(e) { e.preventDefault();
        buyerView.classList.add('hidden');
        welcomeView.classList.remove('hidden'); });

    shareAppButton.addEventListener('click', function() {
        const qrContainer = document.getElementById('qr-code-container');
        const appUrl = window.location.origin;
        qrContainer.innerHTML = '';
        const qrImage = document.createElement('img');
        qrImage.src = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(appUrl)}`;
        qrImage.alt = 'QR Code untuk Aplikasi Warling';
        qrContainer.appendChild(qrImage);
        shareModal.showModal();
    });

    shareModal.addEventListener('click', function(event) { if (event.target === shareModal || event.target.closest('.close')) { shareModal.close(); } });

    radiusSlider.addEventListener('input', function() { radiusValue.textContent = `${this.value} km`; });
    mapControlsForm.addEventListener('submit', function(event) { event.preventDefault();
        fetchSellers(); });
    radiusSlider.addEventListener('change', fetchSellers);
}

function initializeAndShowMap() {
    const loadingOverlay = document.getElementById('loading-overlay');
    loadingOverlay.classList.remove('hidden');
    if (!map) {
        map = L.map('map').setView([-6.20, 106.81], 13);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' }).addTo(map);
    }
    setTimeout(() => map.invalidateSize(), 20);
    getUserLocationAndFetchSellers();
}

function getUserLocationAndFetchSellers() {
    const loadingOverlay = document.getElementById('loading-overlay');
    navigator.geolocation.getCurrentPosition(
        function(position) {
            userLocation = { lat: position.coords.latitude, lng: position.coords.longitude };
            map.setView([userLocation.lat, userLocation.lng], 15);
            L.marker([userLocation.lat, userLocation.lng]).addTo(map).bindPopup('<strong>Anda di sini</strong>');
            fetchSellers();
        },
        function(error) {
            console.warn("Geolocation error:", error.message);
            alert("Gagal mendapatkan lokasi. Menampilkan semua penjual aktif.");
            userLocation = null;
            fetchSellers();
        }, { enableHighAccuracy: true }
    );
}

async function fetchSellers() {
    const loadingOverlay = document.getElementById('loading-overlay');
    try {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const searchTerm = document.getElementById('search-input').value;
        const radiusKm = document.getElementById('radius-slider').value;
        const radiusMeters = radiusKm * 1000;

        let query = window.supabase.from('sellers').select('*').gte('last_updated_at', thirtyDaysAgo.toISOString());
        if (searchTerm) {
            query = query.or(`name.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%,seller_type.ilike.%${searchTerm}%`);
        }

        const { data: allSellers, error } = await query;
        if (error) { throw error; }

        sellerMarkers.forEach(marker => marker.remove());
        sellerMarkers = [];

        const filteredSellers = userLocation ?
            allSellers.filter(seller => {
                if (!seller.location || !seller.location.x || !seller.location.y) return false;
                const sellerLatLng = L.latLng(seller.location.y, seller.location.x);
                const userLatLng = L.latLng(userLocation.lat, userLocation.lng);
                return userLatLng.distanceTo(sellerLatLng) <= radiusMeters;
            }) :
            allSellers;

        filteredSellers.forEach(function(seller) {
            const lat = seller.location.y;
            const lon = seller.location.x;
            const phone = seller.phone_number ? seller.phone_number.replace(/\D/g, '') : '';
            const popupContent = `
                <h4>${seller.name}</h4>
                <p>${seller.description || 'Tidak ada deskripsi.'}</p>
                <p><strong>Pesan Hari Ini:</strong> ${seller.broadcast_message || '-'}</p>
                <a href="https://wa.me/${phone}" target="_blank" role="button" class="contrast">Hubungi via WA</a>
            `;
            const marker = L.marker([lat, lon]).addTo(map).bindPopup(popupContent);
            sellerMarkers.push(marker);
        });
        console.log(`Menampilkan ${filteredSellers.length} penjual.`);
    } catch (error) {
        console.error("Gagal mengambil data:", error);
    } finally {
        loadingOverlay.classList.add('hidden');
    }
}