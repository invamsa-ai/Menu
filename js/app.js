// js/app.js - المنيو المتصل بقاعدة البيانات

let cart = JSON.parse(localStorage.getItem('myCart')) || []; // السلة
let currentRestaurant = {}; // بيانات المطعم
let productsList = []; // قائمة المنتجات

// 1. عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', () => {
    // استخراج معرف المطعم من الرابط (e.g., ?id=xyz...)
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

    // تهيئة المستمعين (Real-time Listeners)
    listenToRestaurantInfo(restaurantId);
    listenToProducts(restaurantId);
});

// 2. مراقبة بيانات المطعم (الاسم، الحالة، العملة)
function listenToRestaurantInfo(id) {
    db.collection('restaurants').doc(id).onSnapshot((doc) => {
        if (!doc.exists) {
            document.body.innerHTML = "<h1>المطعم غير موجود</h1>";
            return;
        }

        currentRestaurant = doc.data();
        updateHeaderUI(); // تحديث الواجهة فوراً
    });
}

// 3. مراقبة المنتجات
function listenToProducts(id) {
    const grid = document.getElementById('productsGrid');
    grid.innerHTML = '<div style="text-align:center; width:100%">جاري تحميل القائمة...</div>';

    db.collection('products')
      .where('restaurant_id', '==', id) // جلب منتجات هذا المطعم فقط
      .onSnapshot((snapshot) => {
          productsList = [];
          
          if (snapshot.empty) {
              grid.innerHTML = '<div style="text-align:center; width:100%; color:#888;">لا يوجد منتجات متاحة حالياً.</div>';
              return;
          }

          snapshot.forEach(doc => {
              productsList.push({ id: doc.id, ...doc.data() });
          });

          // عرض الأقسام والمنتجات
          renderCategories();
          renderProducts(productsList); // عرض الكل افتراضياً
          updateCartUI(); // تحديث السلة لتناسب العملة الجديدة
      });
}

// 4. تحديث واجهة الرأس (اسم المطعم وحالته)
function updateHeaderUI() {
    // تحديث الاسم
    const logoElements = document.querySelectorAll('.logo, h1');
    logoElements.forEach(el => {
        if(el.tagName === 'H1') el.innerText = "أهلاً بكم في " + currentRestaurant.name;
        else el.innerText = currentRestaurant.name;
    });

    // تحديث حالة المطعم (مفتوح/مغلق)
    const statusBadge = document.getElementById('restaurantStatus');
    if (currentRestaurant.status === 'closed') {
        statusBadge.innerText = "مغلق حالياً 🔴";
        statusBadge.style.background = '#dc3545'; // لون أحمر
        
        // إخفاء أزرار الإضافة للسلة إذا كان مغلقاً
        document.body.classList.add('restaurant-closed');
    } else {
        statusBadge.innerText = "مفتوح الآن 🟢";
        statusBadge.style.background = '#28a745'; // لون أخضر
        document.body.classList.remove('restaurant-closed');
    }
}

// 5. عرض الأقسام (تؤخذ من بيانات المطعم)
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
    // تحديث الزر النشط
    document.querySelectorAll('.category-item').forEach(el => el.classList.remove('active'));
    element.classList.add('active');
    
    // الفلترة
    const filtered = category === "الكل" 
        ? productsList 
        : productsList.filter(p => p.category === category);
    
    renderProducts(filtered);
}

// 7. رسم المنتجات على الشاشة
function renderProducts(products) {
    const grid = document.getElementById('productsGrid');
    
    if (products.length === 0) {
        grid.innerHTML = '<div style="text-align:center; width:100%">لا يوجد منتجات في هذا القسم</div>';
        return;
    }

    grid.innerHTML = products.map(product => {
        const image = product.image || 'https://via.placeholder.com/150';
        // التحقق مما إذا كان المطعم مغلقاً لتعطيل الزر
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

// 8. التعامل مع السلة
function addToCart(productId) {
    if (currentRestaurant.status === 'closed') {
        alert("عذراً، المطعم مغلق حالياً لا يستقبل طلبات.");
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
    showToast(`${product.name} أضيف للسلة`);
}

function updateCartUI() {
    const cartCount = document.getElementById('cartCount');
    const cartItems = document.getElementById('cartItems');
    const totalPriceElement = document.getElementById('totalPrice');
    
    cartCount.innerText = cart.reduce((sum, item) => sum + item.quantity, 0);
    
    if (!cartItems) return; // في حال لم تكن السلة مفتوحة

    if (cart.length === 0) {
        cartItems.innerHTML = '<div style="text-align:center; padding:2rem; color:#888;">السلة فارغة</div>';
        totalPriceElement.innerText = `0 ${currentRestaurant.currency || ''}`;
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
                    <button onclick="changeQuantity('${item.id}', -1)" style="width:25px;">-</button>
                    <span>${item.quantity}</span>
                    <button onclick="changeQuantity('${item.id}', 1)" style="width:25px;">+</button>
                </div>
            </div>
        `).join('');
        
        const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        totalPriceElement.innerText = `${total} ${currentRestaurant.currency}`;
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

// 9. إرسال الطلب واتساب
function sendOrder() {
    if (cart.length === 0) return alert("السلة فارغة!");
    
    let message = `*طلب جديد من: ${currentRestaurant.name}*\n`;
    message += `------------------\n`;
    
    cart.forEach(item => {
        message += `▪️ ${item.name} (${item.quantity}) - ${item.price * item.quantity} ${currentRestaurant.currency}\n`;
    });
    
    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    message += `------------------\n`;
    message += `*المجموع النهائي: ${total} ${currentRestaurant.currency}*`;
    
    // رقم الواتساب من قاعدة البيانات
    const phone = currentRestaurant.whatsapp;
    if(!phone) {
        alert("صاحب المطعم لم يقم بإعداد رقم الواتساب بعد.");
        return;
    }

    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
    
    // تفريغ السلة بعد الطلب (اختياري)
    cart = [];
    saveCart();
    updateCartUI();
    toggleCart();
}

// دوال مساعدة (UI)
function toggleCart() {
    document.getElementById('cartModal').classList.toggle('active');
}

function showToast(msg) {
    const toast = document.createElement('div');
    toast.style.cssText = `position:fixed; bottom:20px; left:50%; transform:translateX(-50%); background:rgba(0,0,0,0.8); color:white; padding:10px 20px; border-radius:20px; z-index:9999;`;
    toast.innerText = msg;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2000);
}