// بيانات تجريبية للمطعم والمنتجات
const restaurantData = {
    name: "MenuNow",
    status: "open", // open or closed
    whatsapp: "966500000000",
    currency: "ر.س",
    categories: ["الكل", "المشروبات", "البرغر", "السلطات", "الحلويات"],
    products: [
        { id: 1, name: "آيس لاتيه", price: 30, category: "المشروبات", image: "https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?w=500&q=80" },
        { id: 2, name: "تشيز برغر", price: 35, category: "البرغر", image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500&q=80" },
        { id: 3, name: "سلطة سيزر", price: 25, category: "السلطات", image: "https://images.unsplash.com/photo-1550304943-4f24f54ddde9?w=500&q=80" },
        { id: 4, name: "سوفليه شوكولاتة", price: 20, category: "الحلويات", image: "https://images.unsplash.com/photo-1624353365286-3f8d62daad51?w=500&q=80" },
        { id: 5, name: "عصير مانغو طبيعي", price: 15, category: "المشروبات", image: "https://images.unsplash.com/photo-1546173159-315724a31696?w=500&q=80" }
    ]
};

let cart = [];

// تهيئة الصفحة
document.addEventListener('DOMContentLoaded', () => {
    renderCategories();
    renderProducts(restaurantData.products);
    updateCartUI();
    
    // إغلاق السلة عند الضغط خارجها
    document.addEventListener('click', (e) => {
        const cartModal = document.getElementById('cartModal');
        const cartBtn = document.getElementById('cartBtn');
        if (!cartModal.contains(e.target) && !cartBtn.contains(e.target) && cartModal.classList.contains('active')) {
            toggleCart();
        }
    });
});

// عرض الأقسام
function renderCategories() {
    const container = document.getElementById('categoriesContainer');
    container.innerHTML = restaurantData.categories.map((cat, index) => `
        <div class="category-item ${index === 0 ? 'active' : ''}" onclick="filterCategory('${cat}', this)">
            ${cat}
        </div>
    `).join('');
}

// تصفية المنتجات حسب القسم
function filterCategory(category, element) {
    document.querySelectorAll('.category-item').forEach(el => el.classList.remove('active'));
    element.classList.add('active');
    
    const filtered = category === "الكل" 
        ? restaurantData.products 
        : restaurantData.products.filter(p => p.category === category);
    renderProducts(filtered);
}

// عرض المنتجات
function renderProducts(products) {
    const grid = document.getElementById('productsGrid');
    grid.innerHTML = products.map(product => `
        <div class="product-card">
            <img src="${product.image}" alt="${product.name}" class="product-image">
            <div class="product-info">
                <div class="product-name">${product.name}</div>
                <div class="product-price">${product.price} ${restaurantData.currency}</div>
                <button class="add-to-cart" onclick="addToCart(${product.id})">إضافة للسلة</button>
            </div>
        </div>
    `).join('');
}

// إضافة للسلة
function addToCart(productId) {
    const product = restaurantData.products.find(p => p.id === productId);
    const existingItem = cart.find(item => item.id === productId);
    
    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({ ...product, quantity: 1 });
    }
    
    updateCartUI();
    showToast(`${product.name} تمت إضافته`);
}

// تحديث واجهة السلة
function updateCartUI() {
    const cartItems = document.getElementById('cartItems');
    const cartCount = document.getElementById('cartCount');
    const totalPriceElement = document.getElementById('totalPrice');
    
    cartCount.innerText = cart.reduce((sum, item) => sum + item.quantity, 0);
    
    if (cart.length === 0) {
        cartItems.innerHTML = '<div style="text-align:center; padding:2rem; color:#888;">السلة فارغة</div>';
        totalPriceElement.innerText = `0 ${restaurantData.currency}`;
    } else {
        cartItems.innerHTML = cart.map(item => `
            <div class="cart-item">
                <div style="flex:1">
                    <div style="font-weight:bold">${item.name}</div>
                    <div style="color:var(--primary-color); font-size:0.9rem">${item.price} × ${item.quantity} = ${item.price * item.quantity} ${restaurantData.currency}</div>
                </div>
                <div style="display:flex; align-items:center; gap:10px">
                    <button onclick="changeQuantity(${item.id}, -1)" style="width:25px; height:25px; border-radius:50%; border:1px solid #ddd; background:white">-</button>
                    <span>${item.quantity}</span>
                    <button onclick="changeQuantity(${item.id}, 1)" style="width:25px; height:25px; border-radius:50%; border:1px solid #ddd; background:white">+</button>
                </div>
            </div>
        `).join('');
        
        const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        totalPriceElement.innerText = `${total} ${restaurantData.currency}`;
    }
}

// تغيير الكمية في السلة
function changeQuantity(productId, delta) {
    const item = cart.find(i => i.id === productId);
    if (item) {
        item.quantity += delta;
        if (item.quantity <= 0) {
            cart = cart.filter(i => i.id !== productId);
        }
        updateCartUI();
    }
}

// فتح/إغلاق السلة
function toggleCart() {
    document.getElementById('cartModal').classList.toggle('active');
}

// إرسال الطلب عبر واتساب
function sendOrder() {
    if (cart.length === 0) {
        alert("السلة فارغة!");
        return;
    }
    
    let message = `*طلب جديد من MenuNow*\n\n`;
    cart.forEach(item => {
        message += `• ${item.name} (الكمية: ${item.quantity}) - ${item.price * item.quantity} ${restaurantData.currency}\n`;
    });
    
    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    message += `\n*المجموع النهائي: ${total} ${restaurantData.currency}*`;
    
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${restaurantData.whatsapp}?text=${encodedMessage}`;
    
    window.open(whatsappUrl, '_blank');
}

// تنبيه بسيط (Toast)
function showToast(msg) {
    const toast = document.createElement('div');
    toast.style.cssText = `
        position: fixed;
        bottom: 90px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(0,0,0,0.8);
        color: white;
        padding: 10px 20px;
        border-radius: 20px;
        z-index: 2000;
        font-size: 0.9rem;
    `;
    toast.innerText = msg;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2000);
}
