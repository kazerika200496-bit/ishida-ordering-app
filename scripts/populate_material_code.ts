import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('--- 資材ID (materialCode) 初期化スクリプト ---');

  // 1. 全品目を取得
  const items = await prisma.item.findMany();
  console.log(`全品目数: ${items.length}`);

  // 2. materialCode が未設定（null または空）の品目を抽出
  const targets = items.filter(item => !item.materialCode || item.materialCode.trim() === '');
  
  if (targets.length === 0) {
    console.log('未設定の品目はありません。処理を終了します。');
    return;
  }

  console.log(`未設定の品目数: ${targets.length}`);

  // 3. 重複チェック
  // materialCode に設定しようとしている id が、すでに他の品目の materialCode として使われていないか
  const allExistingCodes = new Set(
    items
      .map(i => i.materialCode)
      .filter((code): code is string => code !== null && code !== '')
  );

  const duplicates: string[] = [];
  const toUpdate: typeof targets = [];

  for (const item of targets) {
    if (allExistingCodes.has(item.id)) {
      duplicates.push(`${item.name} (ID: ${item.id})`);
    } else {
      toUpdate.push(item);
    }
  }

  if (duplicates.length > 0) {
    console.error('⚠️ 以下の品目は ID がすでに他の資材IDとして使用されているため、自動設定できません:');
    duplicates.forEach(d => console.error(`  - ${d}`));
    console.error('処理を中断します。手動で資材IDを設定してください。');
    return;
  }

  console.log(`更新対象件数: ${toUpdate.length}`);
  console.log('更新を開始します...');

  let successCount = 0;
  let failCount = 0;

  for (const item of toUpdate) {
    try {
      await prisma.item.update({
        where: { id: item.id },
        data: { materialCode: item.id }
      });
      successCount++;
    } catch (err) {
      console.error(`更新失敗: ${item.name} (${item.id})`, err);
      failCount++;
    }
  }

  console.log('--- 実行結果 ---');
  console.log(`成功: ${successCount} 件`);
  if (failCount > 0) {
    console.log(`失敗: ${failCount} 件`);
  }
  console.log('完了しました。');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
