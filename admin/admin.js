// admin/admin.js - النسخة الآمنة والخاصة بكل مطعم

let currentUser = null;
let currentRestaurantData = {};
const loadingOverlay = document.getElementById('loadingOverlay');

// 1. التحقق من هوية صاحب المطعم
auth.onAuthStateChanged(async (user) => {
    if (user) {
        currentUser = user;
        console.log("تم التعرف على المطعم:", user.uid); 
        
        try {
            await loadRestaurantData(user.uid);
            if(loadingOverlay) loadingOverlay.style.display = 'none';
        } catch (err) {
            console.error(err);
            alert("حدث خطأ في جلب البيانات: " + err.message);
        }
    } else {
        window.location.href = 'login.html';
    }
});

// 2. تسجيل الخروج
function logout() {
    if(confirm('هل تريد الخروج من لوحة التحكم؟')) {
        auth.signOut().then(() => window.location.href = 'login.html');
    }
}

// 3. جلب بيانات المطعم (تم التحديث لدعم ميزة الطلبات)
async function loadRestaurantData(uid) {
    const docRef = db.collection('restaurants').doc(uid);
    const doc = await docRef.get();

    if (!doc.exists) {
        const defaultData = {
            owner_id: uid,
            name: "مطعم جديد",
            whatsapp: "",
            currency: "ر.س",
            status: "open",
            ordering_enabled: true, // الافتراضي مفعل
            categories: ["عام"]
        };
        await docRef.set(defaultData);
        currentRestaurantData = defaultData;
    } else {
        currentRestaurantData = doc.data();
    }

    // تعبئة الحقول
    document.getElementById('restName').value = currentRestaurantData.name || '';
    document.getElementById('restWhatsapp').value = currentRestaurantData.whatsapp || '';
    document.getElementById('restCurrency').value = currentRestaurantData.currency || 'ر.س';
    document.getElementById('restStatus').value = currentRestaurantData.status || 'open';

    // تعبئة حالة نظام الطلبات
    const isOrderingEnabled = currentRestaurantData.ordering_enabled !== false; 
    document.getElementById('orderingStatus').value = isOrderingEnabled ? "true" : "false";

    // تحديث الأقسام والمنتجات
    renderAdminCategories();
    renderAdminProducts();
}

// 4. عرض المنتجات
function renderAdminProducts() {
    const tbody = document.getElementById('adminProductsTable');
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center">جاري جلب منتجاتك...</td></tr>';

    db.collection('products')
      .where('restaurant_id', '==', currentUser.uid) 
      .get()
      .then((querySnapshot) => {
          tbody.innerHTML = '';
          let count = 0;
          
          if (querySnapshot.empty) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:20px; color:#888;">لا يوجد منتجات، أضف أول منتج لك!</td></tr>';
          }

          querySnapshot.forEach((doc) => {
              const p = doc.data();
              count++;
              const img = p.image || 'https://via.placeholder.com/150?text=No+Img';
              
              tbody.innerHTML += `
                <tr>
                    <td><img src="${img}" style="width:50px; height:50px; border-radius:5px;"></td>
                    <td>${p.name}</td>
                    <td>${p.category}</td>
                    <td>${p.price} ${currentRestaurantData.currency}</td>
                    <td>
                        <button class="btn btn-danger" onclick="deleteProduct('${doc.id}')" style="padding:5px 10px;">حذف</button>
                    </td>
                </tr>
              `;
          });
          document.getElementById('totalProductsCount').innerText = count;
      });
}

// 5. إضافة منتج
async function addProduct(event) {
    event.preventDefault();
    
    const btn = event.target.querySelector('button[type="submit"]');
    btn.innerText = "جاري الحفظ...";
    btn.disabled = true;

    try {
        await db.collection('products').add({
            restaurant_id: currentUser.uid, 
            name: document.getElementById('pName').value,
            price: parseFloat(document.getElementById('pPrice').value),
            category: document.getElementById('pCategory').value,
            image: document.getElementById('pImage').value, // سنعتمد الرابط هنا
            created_at: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        document.getElementById('addProductModal').style.display = 'none';
        event.target.reset();
        renderAdminProducts();
        alert("تمت الإضافة بنجاح!");

    } catch (error) {
        alert("خطأ: " + error.message);
    } finally {
        btn.innerText = "حفظ المنتج";
        btn.disabled = false;
    }
}

// 6. حذف منتج
function deleteProduct(docId) {
    if(confirm('حذف هذا المنتج؟')) {
        db.collection('products').doc(docId).delete().then(() => renderAdminProducts());
    }
}

// 7. إدارة الأقسام
function renderAdminCategories() {
    const list = document.getElementById('adminCategoriesList');
    const select = document.getElementById('pCategory');
    const cats = currentRestaurantData.categories || [];
    
    document.getElementById('totalCategoriesCount').innerText = cats.length;

    list.innerHTML = cats.map(cat => `
        <div style="display:flex; justify-content:space-between; padding:10px; border-bottom:1px solid #eee;">
            <span>${cat}</span>
            <button class="btn btn-danger" onclick="deleteCategory('${cat}')" style="padding:2px 8px;">×</button>
        </div>
    `).join('');

    select.innerHTML = cats.map(cat => `<option value="${cat}">${cat}</option>`).join('');
}

async function addCategory() {
    const newCat = document.getElementById('newCatName').value;
    if(newCat && !currentRestaurantData.categories.includes(newCat)) {
        const newCats = [...currentRestaurantData.categories, newCat];
        await db.collection('restaurants').doc(currentUser.uid).update({ categories: newCats });
        currentRestaurantData.categories = newCats;
        renderAdminCategories();
        document.getElementById('newCatName').value = '';
    }
}

async function deleteCategory(catName) {
    if(confirm(`حذف قسم ${catName}؟`)) {
        const newCats = currentRestaurantData.categories.filter(c => c !== catName);
        await db.collection('restaurants').doc(currentUser.uid).update({ categories: newCats });
        currentRestaurantData.categories = newCats;
        renderAdminCategories();
    }
}

// 8. حفظ الإعدادات (تم التحديث لحفظ حالة الطلبات)
async function saveSettings() {
    const btn = document.querySelector('button[onclick="saveSettings()"]');
    btn.innerText = "جاري الحفظ...";
    btn.disabled = true;

    const updatedData = {
        name: document.getElementById('restName').value,
        whatsapp: document.getElementById('restWhatsapp').value,
        currency: document.getElementById('restCurrency').value,
        status: document.getElementById('restStatus').value,
        ordering_enabled: document.getElementById('orderingStatus').value === "true"
    };
    
    await db.collection('restaurants').doc(currentUser.uid).update(updatedData);
    currentRestaurantData = {...currentRestaurantData, ...updatedData};
    
    btn.innerHTML = '<i class="fas fa-save"></i> حفظ كافة التغييرات';
    btn.disabled = false;
    alert("تم حفظ الإعدادات!");
}

// 9. توليد الرابط
function generateQR() {
    const baseUrl = window.location.origin + window.location.pathname.replace('/admin/index.html', '').replace('/admin/', '') + '/menu.html';
    const finalUrl = `${baseUrl}?id=${currentUser.uid}`;
    
    document.getElementById('qrContainer').innerHTML = `
        <div style="text-align:center; padding:20px; background:#f9f9f9; border:1px solid #ddd; border-radius:10px;">
            <img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(finalUrl)}" alt="QR Code">
            <br><br>
            <a href="${finalUrl}" target="_blank" style="color:blue; font-weight:bold;">${finalUrl}</a>
        </div>
    `;
}