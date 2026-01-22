// js/firebase-config.js

// إعدادات مشروعك (مأخوذة من الكود الذي أرسلته)
const firebaseConfig = {
    apiKey: "AIzaSyByJyNzm3_W1fIKzjpX-CCJGvUqCN24mkQ",
    authDomain: "menu-24143.firebaseapp.com",
    projectId: "menu-24143",
    storageBucket: "menu-24143.firebasestorage.app",
    messagingSenderId: "161361127888",
    appId: "1:161361127888:web:2402fffb40eec9cf7a31d5",
    measurementId: "G-7F62J82R3E"
};

// تهيئة فايربيس
firebase.initializeApp(firebaseConfig);

// تعريف المتغيرات لتكون متاحة في كل المشروع
const db = firebase.firestore();
const auth = firebase.auth();
const analytics = firebase.analytics(); // اختياري