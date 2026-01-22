let currentUser = null;
let currentRestaurantData = {};

// عنصر شاشة التحميل
const loadingOverlay = document.getElementById('loadingOverlay');

// admin/admin.js - التعديل في الجزء العلوي فقط

auth.onAuthStateChanged(async (user) => {
    if (user) {
        currentUser = user;
        console.log("تم تسجيل الدخول: ", user.email);
        
        try {
            // محاولة جلب البيانات
            await loadRestaurantData(user.uid);
            
            // إذا وصلنا هنا يعني البيانات وصلت بنجاح
            if(loadingOverlay) loadingOverlay.style.display = 'none';
            
        } catch (error) {
            // هنا سيظهر سبب المشكلة في رسالة منبثقة
            alert("حدث خطأ أثناء جلب البيانات:\n" + error.message);
            console.error(error);
            if(loadingOverlay) loadingOverlay.innerHTML = "❌ حدث خطأ: " + error.message;
        }

    } else {
        window.location.href = 'login.html';
    }
});

// 2. تسجيل الخروج
function logout() {
    if(confirm('هل تريد تسجيل الخروج؟')) {
        auth.signOut().then(() => {
            window.location.href = 'login.html';
        });
    }
}

// 3. جلب بيانات المطعم أو إنشاؤها لأول مرة
async function loadRestaurantData(uid) {
    const docRef = db.collection('restaurants').doc(uid);
    const doc = await docRef.get();

    if (!doc.exists) {
        // إذا كان هذا أول دخول للمطعم، ننشئ له ملفاً جديداً
        const defaultData = {
            owner_id: uid,
            name: "مطعم جديد",
            whatsapp: "",
            currency: "ر.س",
            status: "open",
            categories: ["عام"]
        };
        await docRef.set(defaultData);
        currentRestaurantData = defaultData;
    } else {
        currentRestaurantData = doc.data();
    }

    // تعبئة البيانات في صفحة الإعدادات
    if(document.getElementById('restName')) {
        document.getElementById('restName').value = currentRestaurantData.name || '';
        document.getElementById('restWhatsapp').value = currentRestaurantData.whatsapp || '';
        document.getElementById('restCurrency').value = currentRestaurantData.currency || 'ر.س';
        document.getElementById('restStatus').value = currentRestaurantData.status || 'open';
    }

    // تحديث الجداول
    renderAdminCategories();
    renderAdminProducts();
}

// 4. عرض المنتجات (قراءة من قاعدة البيانات)
function renderAdminProducts() {
    const tbody = document.getElementById('adminProductsTable');
    if(!tbody) return;

    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center">جاري جلب المنتجات...</td></tr>';

    db.collection('products')
      .where('restaurant_id', '==', currentUser.uid) // شرط مهم: جلب منتجات هذا المطعم فقط
      .get()
      .then((querySnapshot) => {
          tbody.innerHTML = '';
          let count = 0;
          
          if (querySnapshot.empty) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 20px; color: #888;">لا يوجد منتجات حالياً. أضف منتجك الأول!</td></tr>';
          }

          querySnapshot.forEach((doc) => {
              const p = doc.data();
              count++;
              // صورة افتراضية
              const img = p.image || 'https://via.placeholder.com/150?text=No+Image';
              
              tbody.innerHTML += `
                <tr>
                    <td><img src="${img}" style="width:50px; height:50px; border-radius:5px; object-fit:cover;"></td>
                    <td>${p.name}</td>
                    <td>${p.category}</td>
                    <td>${p.price} ${currentRestaurantData.currency}</td>
                    <td>
                        <button class="btn btn-danger" onclick="deleteProduct('${doc.id}')" style="padding:5px 10px; font-size:0.8rem;">حذف</button>
                    </td>
                </tr>
              `;
          });
          
          // تحديث العداد في الأعلى
          if(document.getElementById('totalProductsCount')) 
              document.getElementById('totalProductsCount').innerText = count;
      });
}

// 5. إضافة منتج جديد (الكتابة في قاعدة البيانات)
async function addProduct(event) {
    event.preventDefault();
    
    const name = document.getElementById('pName').value;
    const price = parseFloat(document.getElementById('pPrice').value);
    const category = document.getElementById('pCategory').value;
    const image = document.getElementById('pImage').value; // نأخذ الرابط النصي

    const btn = event.target.querySelector('button[type="submit"]');
    const originalText = btn.innerText;
    btn.innerText = "جاري الحفظ...";
    btn.disabled = true;

    try {
        await db.collection('products').add({
            restaurant_id: currentUser.uid, // ربط المنتج بالمطعم
            name: name,
            price: price,
            category: category,
            image: image, 
            created_at: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        // إغلاق النافذة وتحديث الجدول
        document.getElementById('addProductModal').style.display = 'none';
        event.target.reset(); 
        renderAdminProducts(); 
        alert("✅ تم إضافة المنتج بنجاح!");

    } catch (error) {
        console.error(error);
        alert("❌ حدث خطأ: " + error.message);
    } finally {
        btn.innerText = originalText;
        btn.disabled = false;
    }
}

// 6. حذف منتج
function deleteProduct(docId) {
    if(confirm('هل أنت متأكد من حذف هذا المنتج نهائياً؟')) {
        db.collection('products').doc(docId).delete()
            .then(() => {
                renderAdminProducts(); // تحديث الجدول بعد الحذف
            })
            .catch(err => alert("خطأ في الحذف: " + err.message));
    }
}

// 7. إدارة الأقسام
function renderAdminCategories() {
    const list = document.getElementById('adminCategoriesList');
    const select = document.getElementById('pCategory');
    const cats = currentRestaurantData.categories || [];
    
    if(document.getElementById('totalCategoriesCount'))
        document.getElementById('totalCategoriesCount').innerText = cats.length;

    // تعبئة قائمة الحذف
    if(list) {
        list.innerHTML = cats.map(cat => `
            <div style="display:flex; justify-content:space-between; padding:10px; border-bottom:1px solid #eee;">
                <span>${cat}</span>
                <button class="btn btn-danger" onclick="deleteCategory('${cat}')" style="padding:2px 8px;">×</button>
            </div>
        `).join('');
    }

    // تعبئة القائمة المنسدلة لإضافة المنتجات
    if(select) {
        select.innerHTML = cats.map(cat => `<option value="${cat}">${cat}</option>`).join('');
    }
}

// إضافة قسم
async function addCategory() {
    const newCat = document.getElementById('newCatName').value;
    if(newCat && !currentRestaurantData.categories.includes(newCat)) {
        const newCats = [...currentRestaurantData.categories, newCat];
        
        // تحديث المصفوفة في فايربيس
        await db.collection('restaurants').doc(currentUser.uid).update({
            categories: newCats
        });
        
        currentRestaurantData.categories = newCats; // تحديث النسخة المحلية
        renderAdminCategories(); // تحديث الواجهة
        document.getElementById('newCatName').value = '';
    }
}

// حذف قسم
async function deleteCategory(catName) {
    if(confirm(`هل تريد حذف قسم "${catName}"؟`)) {
        const newCats = currentRestaurantData.categories.filter(c => c !== catName);
        
        await db.collection('restaurants').doc(currentUser.uid).update({
            categories: newCats
        });

        currentRestaurantData.categories = newCats;
        renderAdminCategories();
    }
}

// 8. حفظ الإعدادات العامة للمطعم
async function saveSettings() {
    const btn = document.querySelector('#settings button');
    btn.innerText = "جاري الحفظ...";
    btn.disabled = true;
    
    const updatedData = {
        name: document.getElementById('restName').value,
        whatsapp: document.getElementById('restWhatsapp').value,
        currency: document.getElementById('restCurrency').value,
        status: document.getElementById('restStatus').value
    };
    
    try {
        await db.collection('restaurants').doc(currentUser.uid).update(updatedData);
        // تحديث البيانات المحلية لضمان تطابقها
        currentRestaurantData = {...currentRestaurantData, ...updatedData};
        alert("✅ تم حفظ الإعدادات بنجاح!");
    } catch(err) {
        alert("خطأ: " + err.message);
    } finally {
        btn.innerText = "حفظ التغييرات";
        btn.disabled = false;
    }
}

// 9. توليد الرابط والباركود
function generateQR() {
    // بناء الرابط: نأخذ عنوان الموقع الحالي، نحذف admin/index.html ونضيف menu.html مع الآيدي
    const baseUrl = window.location.origin + window.location.pathname.replace('/admin/index.html', '').replace('/admin/', '') + '/menu.html';
    
    // الرابط النهائي يشبه: https://yoursite.com/menu.html?id=User_UID
    const finalUrl = `${baseUrl}?id=${currentUser.uid}`;
    
    const qrContainer = document.getElementById('qrContainer');
    qrContainer.innerHTML = `
        <div style="text-align:center; padding:20px; background:#f9f9f9; border-radius:10px; border: 1px solid #ddd;">
            <img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(finalUrl)}" alt="QR Code" style="margin-bottom:15px;">
            <br>
            <strong>رابط المنيو الخاص بك:</strong><br>
            <a href="${finalUrl}" target="_blank" style="color:var(--primary-color); word-break: break-all; font-weight:bold;">${finalUrl}</a>
            <p style="margin-top:10px; font-size:0.8rem; color:#666;">
                قم بنسخ الرابط وإرساله للزبائن، أو اطبع رمز الـ QR وضعه على الطاولات.
            </p>
        </div>
    `;
}