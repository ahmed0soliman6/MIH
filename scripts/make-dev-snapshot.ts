import { DEFAULT_POLICIES } from '../src/data/defaultPolicies';
// @ts-ignore
import { writeSnapshot } from './lib/write-snapshot.mjs';

async function run() {
  console.log(`🔨 جاري إنشاء لقطة التطوير من السياسات الافتراضية (${DEFAULT_POLICIES.length} سياسة)...`);
  try {
    await writeSnapshot(DEFAULT_POLICIES);
    console.log('🎉 اكتمل إنشاء لقطة التطوير المحلية بنجاح.');
  } catch (err: any) {
    console.error('❌ خطأ أثناء إنشاء لقطة التطوير:', err.message || err);
    process.exit(1);
  }
}

run();
