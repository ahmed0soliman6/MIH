import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

function sha1(str) {
  return crypto.createHash('sha1').update(str).digest('hex');
}

/**
 * يكتب لقطة السياسات الثابتة في مجلد public/data/
 * @param {Array<Object>} rawPolicies مصفوفة السياسات
 * @param {Object} options خيارات إضافية (backup: boolean, targetDir?: string)
 */
export async function writeSnapshot(rawPolicies, options = {}) {
  if (!Array.isArray(rawPolicies) || rawPolicies.length === 0) {
    throw new Error('لا توجد سياسات صالحة لكتابة اللقطة الثابتة.');
  }

  const rootDir = process.cwd();
  const targetDir = options.targetDir || path.join(rootDir, 'public', 'data');
  const policiesDir = path.join(targetDir, 'policies');

  // تنظيف المجلد وإعادة إنشائه
  if (fs.existsSync(targetDir)) {
    fs.rmSync(targetDir, { recursive: true, force: true });
  }
  fs.mkdirSync(policiesDir, { recursive: true });

  // فرز السياسات بثبات: حسب التصنيف ثم الكود
  const policies = [...rawPolicies].sort((a, b) => {
    const catComp = (a.category || '').localeCompare(b.category || '');
    if (catComp !== 0) return catComp;
    return (a.code || '').localeCompare(b.code || '');
  });

  const indexList = [];
  const searchMap = {};
  let totalBytes = 0;

  for (const p of policies) {
    const id = String(p.id || '').trim();
    if (!id) {
      throw new Error('تم العثور على سياسة بدون معرّف (id).');
    }

    // تنظيف وتجهيز كائن السياسة الكامل
    const fullPolicy = {
      ...p,
      id,
      code: String(p.code || '').trim(),
      title: String(p.title || '').trim(),
      category: String(p.category || '').trim(),
      updated_at: typeof p.updated_at === 'object' && p.updated_at?.toISOString
        ? p.updated_at.toISOString()
        : String(p.updated_at || new Date().toISOString())
    };

    const jsonString = JSON.stringify(fullPolicy, null, 2);
    const slug = id.replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 60);
    const idHash = sha1(id).slice(0, 6);
    const contentHash = sha1(jsonString).slice(0, 10);
    const fileName = `${slug}.${idHash}.${contentHash}.json`;
    const relativeFilePath = `/data/policies/${fileName}`;

    // كتابة ملف السياسة المفرد
    const filePath = path.join(policiesDir, fileName);
    fs.writeFileSync(filePath, jsonString, 'utf-8');
    const fileBytes = Buffer.byteLength(jsonString, 'utf-8');
    totalBytes += fileBytes;

    // خريطة البحث
    if (p.plain_text) {
      searchMap[id] = p.plain_text;
    } else if (p.content_html) {
      searchMap[id] = p.content_html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    } else {
      searchMap[id] = p.title || '';
    }

    // بناء عنصر الفهرس الخفيف (بدون المحتويات الثقيلة)
    const summaryItem = {
      id,
      code: fullPolicy.code,
      title: fullPolicy.title,
      category: fullPolicy.category,
      file: relativeFilePath
    };

    if (fullPolicy.dept) summaryItem.dept = fullPolicy.dept;
    if (fullPolicy.version) summaryItem.version = fullPolicy.version;
    if (fullPolicy.date) summaryItem.date = fullPolicy.date;
    if (fullPolicy.purpose) summaryItem.purpose = fullPolicy.purpose;
    if (fullPolicy.effectiveDate) summaryItem.effectiveDate = fullPolicy.effectiveDate;
    if (fullPolicy.reviewDate) summaryItem.reviewDate = fullPolicy.reviewDate;
    if (fullPolicy.responsibilities) summaryItem.responsibilities = fullPolicy.responsibilities;
    if (fullPolicy.notes) summaryItem.notes = fullPolicy.notes;
    if (fullPolicy.source) summaryItem.source = fullPolicy.source;
    if (fullPolicy.updated_at) summaryItem.updated_at = fullPolicy.updated_at;

    const slidesCount = Array.isArray(fullPolicy.slides) ? fullPolicy.slides.length : 0;
    if (slidesCount > 0) summaryItem.slidesCount = slidesCount;

    indexList.push(summaryItem);
  }

  // 1) كتابة index.json
  const indexJsonStr = JSON.stringify(indexList, null, 2);
  const indexFilePath = path.join(targetDir, 'index.json');
  fs.writeFileSync(indexFilePath, indexJsonStr, 'utf-8');
  const indexBytes = Buffer.byteLength(indexJsonStr, 'utf-8');
  totalBytes += indexBytes;

  // 2) كتابة search.json
  const searchJsonStr = JSON.stringify(searchMap, null, 2);
  const searchFilePath = path.join(targetDir, 'search.json');
  fs.writeFileSync(searchFilePath, searchJsonStr, 'utf-8');
  totalBytes += Buffer.byteLength(searchJsonStr, 'utf-8');

  // 3) كتابة version.json
  const versionObj = {
    generatedAt: new Date().toISOString(),
    count: policies.length
  };
  const versionJsonStr = JSON.stringify(versionObj, null, 2);
  const versionFilePath = path.join(targetDir, 'version.json');
  fs.writeFileSync(versionFilePath, versionJsonStr, 'utf-8');
  totalBytes += Buffer.byteLength(versionJsonStr, 'utf-8');

  // نسخة احتياطية اختيارية
  let backupPath = null;
  if (options.backup) {
    const backupsDir = path.join(rootDir, 'backups');
    fs.mkdirSync(backupsDir, { recursive: true });
    const dateStr = new Date().toISOString().slice(0, 10);
    const bName = `policies-${dateStr}.json`;
    backupPath = path.join(backupsDir, bName);
    fs.writeFileSync(backupPath, JSON.stringify(policies, null, 2), 'utf-8');
  }

  console.log(`\n✅ تم توليد لقطة السياسات الثابتة بنجاح:`);
  console.log(`   - عدد السياسات: ${policies.length}`);
  console.log(`   - حجم الفهرس (index.json): ${(indexBytes / 1024).toFixed(1)} KB`);
  console.log(`   - إجمالي حجم اللقطة: ${(totalBytes / 1024).toFixed(1)} KB`);
  if (backupPath) {
    console.log(`   - نسخة احتياطية محفوظة في: ${backupPath}`);
  }

  return {
    count: policies.length,
    indexBytes,
    totalBytes,
    backupPath
  };
}
