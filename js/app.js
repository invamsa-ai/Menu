// js/app.js - المنيو المتصل بقاعدة البيانات مع ميزة إيقاف الطلبات

let cart = JSON.parse(localStorage.getItem('myCart')) || []; 
let currentRestaurant = {}; 
let productsList = []; 

// 1. عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const restaurantId = urlParams.get('id');

    if (!restaurantId) {
        document.body.innerHTML = `
            <div style="text-align:center; padding:50px; font-family:sans-serif;">
                <h1>⚠️ رابط غير صحيح</h1>
                <p>يرجى مسح رمز QR الخاص بالمطعم بشكل صحيح.</p>
            </div>
        `;
        return;
    }

    // تفعيل البحث
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase();
            const filtered = productsList.filter(p => 
                p.name.toLowerCase().includes(term) || 
                p.category.toLowerCase().includes(term)
            );
            renderProducts(filtered);
        });
    }

    listenToRestaurantInfo(restaurantId);
    listenToProducts(restaurantId);
});

// 2. مراقبة بيانات المطعم
function listenToRestaurantInfo(id) {
    db.collection('restaurants').doc(id).onSnapshot((doc) => {
        if (!doc.exists) {
            document.body.innerHTML = "<h1>المطعم غير موجود</h1>";
            return;
        }
        currentRestaurant = doc.data();
        updateHeaderUI();
        // تحديث السلة في حال تغيرت حالة السماح بالطلب أثناء التصفح
        updateCartUI();
    });
}

// 3. مراقبة المنتجات
function listenToProducts(id) {
    const grid = document.getElementById('productsGrid');
    grid.innerHTML = '<div style="text-align:center; width:100%">جاري تحميل القائمة...</div>';

    db.collection('products')
      .where('restaurant_id', '==', id)
      .onSnapshot((snapshot) => {
          productsList = [];
          
          if (snapshot.empty) {
              grid.innerHTML = '<div style="text-align:center; width:100%; color:#888;">لا يوجد منتجات متاحة حالياً.</div>';
              return;
          }

          snapshot.forEach(doc => {
              productsList.push({ id: doc.id, ...doc.data() });
          });

          renderCategories();
          renderProducts(productsList);
          updateCartUI();
      });
}

// 4. تحديث واجهة الرأس
function updateHeaderUI() {
    const logoElements = document.querySelectorAll('.logo, h1');
    logoElements.forEach(el => {
        if(el.tagName === 'H1') el.innerText = "أهلاً بكم في " + currentRestaurant.name;
        else el.innerText = currentRestaurant.name;
    });

    const statusBadge = document.getElementById('restaurantStatus');
    if (currentRestaurant.status === 'closed') {
        statusBadge.innerText = "مغلق حالياً 🔴";
        statusBadge.className = 'status-badge status-closed';
        document.body.classList.add('restaurant-closed');
    } else {
        statusBadge.innerText = "مفتوح الآن 🟢";
        statusBadge.className = 'status-badge status-open';
        document.body.classList.remove('restaurant-closed');
    }
}

// 5. عرض الأقسام
function renderCategories() {
    const container = document.getElementById('categoriesContainer');
    const categories = ["الكل", ...(currentRestaurant.categories || [])];
    
    container.innerHTML = categories.map((cat, index) => `
        <div class="category-item ${index === 0 ? 'active' : ''}" onclick="filterCategory('${cat}', this)">
            ${cat}
        </div>
    `).join('');
}

// 6. فلترة المنتجات
function filterCategory(category, element) {
    document.querySelectorAll('.category-item').forEach(el => el.classList.remove('active'));
    element.classList.add('active');
    
    document.getElementById('searchInput').value = '';

    const filtered = category === "الكل" 
        ? productsList 
        : productsList.filter(p => p.category === category);
    
    renderProducts(filtered);
}

// 7. رسم المنتجات
function renderProducts(products) {
    const grid = document.getElementById('productsGrid');
    
    if (products.length === 0) {
        grid.innerHTML = '<div style="text-align:center; width:100%; padding:20px; color:#777">لا توجد نتائج مطابقة</div>';
        return;
    }

    grid.innerHTML = products.map(product => {
        const image = product.image || 'https://via.placeholder.com/150';
        const isClosed = currentRestaurant.status === 'closed';
        
        return `
        <div class="product-card">
            <img src="${image}" alt="${product.name}" class="product-image">
            <div class="product-info">
                <div class="product-name">${product.name}</div>
                <div class="product-price">${product.price} ${currentRestaurant.currency}</div>
                
                ${isClosed ? 
                    '<button class="add-to-cart" disabled style="background:#ccc; cursor:not-allowed">مغلق</button>' : 
                    `<button class="add-to-cart" onclick="addToCart('${product.id}')">إضافة للسلة</button>`
                }
            </div>
        </div>
    `}).join('');
}

// 8. التعامل مع السلة (تحديث كبير هنا)
function addToCart(productId) {
    if (currentRestaurant.status === 'closed') {
        alert("عذراً، المطعم مغلق حالياً.");
        return;
    }

    const product = productsList.find(p => p.id === productId);
    const existingItem = cart.find(item => item.id === productId);
    
    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({ ...product, quantity: 1 });
    }
    
    saveCart();
    updateCartUI();
    
    const btn = document.getElementById('cartBtn');
    btn.style.transform = 'scale(1.2)';
    setTimeout(() => btn.style.transform = 'scale(1)', 200);
}

function updateCartUI() {
    const cartCount = document.getElementById('cartCount');
    const cartItems = document.getElementById('cartItems');
    const totalPriceElement = document.getElementById('totalPrice');
    
    const count = cart.reduce((sum, item) => sum + item.quantity, 0);
    cartCount.innerText = count;
    
    const cartBtn = document.getElementById('cartBtn');
    if(count > 0) cartBtn.style.display = 'flex';
    else cartBtn.style.display = 'none';

    if (!cartItems) return; 

    // التحقق من تفعيل الطلب
    const isOrderingEnabled = currentRestaurant.ordering_enabled !== false;

    if (cart.length === 0) {
        cartItems.innerHTML = '<div style="text-align:center; padding:2rem; color:#888;">السلة فارغة</div>';
        totalPriceElement.innerText = `0 ${currentRestaurant.currency || ''}`;
        
        // إخفاء الزر إذا السلة فارغة
        const footerBtn = document.querySelector('.cart-footer button');
        if(footerBtn) footerBtn.style.display = 'none';

    } else {
        cartItems.innerHTML = cart.map(item => `
            <div class="cart-item">
                <div style="flex:1">
                    <div style="font-weight:bold">${item.name}</div>
                    <div style="color:var(--primary-color); font-size:0.9rem">
                        ${item.price} × ${item.quantity} = ${item.price * item.quantity} ${currentRestaurant.currency}
                    </div>
                </div>
                <div style="display:flex; align-items:center; gap:10px">
                    <button onclick="changeQuantity('${item.id}', -1)" style="width:25px; height:25px; border-radius:50%; border:1px solid #ddd; background:white;">-</button>
                    <span>${item.quantity}</span>
                    <button onclick="changeQuantity('${item.id}', 1)" style="width:25px; height:25px; border-radius:50%; border:1px solid #ddd; background:white;">+</button>
                </div>
            </div>
        `).join('');
        
        const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        totalPriceElement.innerText = `${total} ${currentRestaurant.currency}`;

        // التحكم في زر الإرسال حسب الإعدادات
        const checkoutBtn = document.querySelector('.checkout-btn');
        if (checkoutBtn) {
            checkoutBtn.style.display = 'flex';
            
            if (isOrderingEnabled) {
                checkoutBtn.innerHTML = '<i class="fab fa-whatsapp"></i> إرسال الطلب عبر واتساب';
                checkoutBtn.onclick = sendOrder;
                checkoutBtn.style.background = '#25D366';
                checkoutBtn.style.cursor = 'pointer';
            } else {
                checkoutBtn.innerHTML = '🚫 استقبال الطلبات متوقف حالياً';
                checkoutBtn.onclick = null; 
                checkoutBtn.style.background = '#ccc'; 
                checkoutBtn.style.cursor = 'not-allowed';
            }
        }
    }
}

function changeQuantity(id, delta) {
    const item = cart.find(i => i.id === id);
    if (item) {
        item.quantity += delta;
        if (item.quantity <= 0) cart = cart.filter(i => i.id !== id);
        saveCart();
        updateCartUI();
    }
}

function saveCart() {
    localStorage.setItem('myCart', JSON.stringify(cart));
}

function toggleCart() {
    document.getElementById('cartModal').classList.toggle('active');
}

// 9. إرسال الطلب واتساب
function sendOrder() {
    // تحقق إضافي للحماية
    if (currentRestaurant.ordering_enabled === false) return;

    if (cart.length === 0) return alert("السلة فارغة!");
    
    let message = `*طلب جديد من: ${currentRestaurant.name}*\n`;
    message += `------------------\n`;
    
    cart.forEach(item => {
        message += `▪️ ${item.name} (${item.quantity}) - ${item.price * item.quantity} ${currentRestaurant.currency}\n`;
    });
    
    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    message += `------------------\n`;
    message += `*المجموع النهائي: ${total} ${currentRestaurant.currency}*`;
    
    const phone = currentRestaurant.whatsapp;
    if(!phone) {
        alert("رقم الواتساب غير متوفر.");
        return;
    }

    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
    
    cart = [];
    saveCart();
    updateCartUI();
    toggleCart();
}