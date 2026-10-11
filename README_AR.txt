أستاذي - مشروع Android
منشئ البرنامج: أ. بلال كاظم الزركاني

هذا المشروع يغلف نسخة HTML داخل تطبيق Android WebView.

الخصائص المضافة على مستوى Android:
- حفظ localStorage داخل WebView.
- اختيار ملفات PDF / Word / Excel من الهاتف عبر مدير الملفات.
- فتح روابط واتساب خارج التطبيق.
- دعم نافذة الطباعة الأصلية في Android للأوامر التي تستخدم window.print().
- صلاحية الإنترنت لأن بعض مكتبات الاستيراد في النسخة الحالية محملة من CDN.

لبناء APK من Android Studio:
1) افتح مجلد OstathiAndroid كمشروع.
2) اترك Android Studio يعمل Sync ويثبت SDK المطلوب إن لم يكن مثبتا.
3) من Build اختر Build APK(s).
4) ملف debug الناتج يكون عادة داخل app/build/outputs/apk/debug/app-debug.apk

اسم الحزمة:
com.bilalkazim.ostathi

ملاحظة:
هذه الجلسة لا تحتوي Android SDK ولا اتصالا خارجيا يسمح بتنزيله، لذلك تم تجهيز مشروع البناء كاملا لكن لم يمكن إخراج APK ثنائي فعلي هنا.
