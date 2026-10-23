import fs from 'node:fs';
import path from 'node:path';

async function verify() {
  console.log('🔍 جاري التحقق الصارم من مخرجات بناء الإنتاج (dist)...');
  const distDir = path.join(process.cwd(), 'dist');

  if (!fs.existsSync(distDir)) {
    console.error('❌ مجلد dist غير موجود! يرجى تنفيذ vite build أولاً.');
    process.exit(1);
  }

  // 1) التحقق من وجود index.json
  const indexPath = path.join(distDir, 'data', 'index.json');
  if (!fs.existsSync(indexPath)) {
    console.error('❌ ملف dist/data/index.json غير موجود!');
    process.exit(1);
  }

  let indexData = [];
  try {
    indexData = JSON.parse(fs.readFileSync(indexPath, 'utf-8'));
  } catch (e) {
    console.error('❌ تعذر تحليل ملف dist/data/index.json كـ JSON صالح:', e.message);
    process.exit(1);
  }

  if (!Array.isArray(indexData) || indexData.length === 0) {
    console.error('❌ ملف dist/data/index.json فارغ أو ليس مصفوفة!');
    process.exit(1);
  }

  // التحقق من أن كل ملف سياسة في الفهرس موجود فعلياً في dist
  for (const item of indexData) {
    if (!item.file) {
      console.error(`❌ عنصر في الفهرس (${item.id}) بدون مسار ملف file!`);
      process.exit(1);
    }
    // مسار الملف نسبي يبدأ بـ /data/policies/...
    const cleanRelPath = item.file.startsWith('/') ? item.file.slice(1) : item.file;
    const policyPath = path.join(distDir, cleanRelPath);
    if (!fs.existsSync(policyPath)) {
      console.error(`❌ ملف السياسة المشار إليه في الفهرس غير موجود: ${policyPath}`);
      process.exit(1);
    }
  }
  console.log(`   ✓ فحص الفهرس سليم (${indexData.length} سياسة وكل ملفاتها موجودة).`);

  // 2) التحقق من version.json و search.json
  const versionPath = path.join(distDir, 'data', 'version.json');
  if (!fs.existsSync(versionPath)) {
    console.error('❌ ملف dist/data/version.json غير موجود!');
    process.exit(1);
  }

  const searchPath = path.join(distDir, 'data', 'search.json');
  if (!fs.existsSync(searchPath)) {
    console.error('❌ ملف dist/data/search.json غير موجود!');
    process.exit(1);
  }
  console.log('   ✓ فحص version.json و search.json سليم.');

  // 3) التحقق من عدم وجود modulepreload لـ vendor-firebase أو vendor-docs في dist/index.html
  const htmlPath = path.join(distDir, 'index.html');
  if (!fs.existsSync(htmlPath)) {
    console.error('❌ ملف dist/index.html غير موجود!');
    process.exit(1);
  }
  const htmlContent = fs.readFileSync(htmlPath, 'utf-8');

  // Regex checking for modulepreload with vendor-firebase or vendor-docs
  const preloadFirebaseRegex = /<link[^>]+rel=["']modulepreload["'][^>]+href=["'][^"']*vendor-firebase[^"']*["']/i;
  const preloadDocsRegex = /<link[^>]+rel=["']modulepreload["'][^>]+href=["'][^"']*vendor-docs[^"']*["']/i;

  if (preloadFirebaseRegex.test(htmlContent)) {
    console.error('❌ خطأ أداء حرج: تم العثور على modulepreload لحزمة vendor-firebase في index.html الرئيسي!');
    process.exit(1);
  }

  if (preloadDocsRegex.test(htmlContent)) {
    console.error('❌ خطأ أداء حرج: تم العثور على modulepreload لحزمة vendor-docs في index.html الرئيسي!');
    process.exit(1);
  }
  console.log('   ✓ index.html خالٍ من التحميل المسبق لمكتبات Firebase و Docs الثقيلة.');

  // 4) التحقق من عدم وجود firestore.googleapis.com في حزمة الدخول الأولى dist/assets/index-*.js
  const assetsDir = path.join(distDir, 'assets');
  const assetFiles = fs.readdirSync(assetsDir);
  const indexJsFiles = assetFiles.filter((f) => f.startsWith('index-') && f.endsWith('.js'));

  if (indexJsFiles.length === 0) {
    console.error('❌ لم يتم العثور على ملف index-*.js في dist/assets!');
    process.exit(1);
  }

  for (const jsFile of indexJsFiles) {
    const jsContent = fs.readFileSync(path.join(assetsDir, jsFile), 'utf-8');
    if (jsContent.includes('firestore.googleapis.com')) {
      console.error(`❌ خطأ أداء حرج: الحزمة الابتدائية ${jsFile} تتضمن اتصالاً مباشراً بـ firestore.googleapis.com!`);
      process.exit(1);
    }
  }
  console.log('   ✓ الحزمة الابتدائية نقية تماماً وخالية من مكتبات Firestore.');

  console.log('\n🎉 جميع فحوصات verify:dist نجحت بتفوق بنسبة 100%!');
}

verify();
