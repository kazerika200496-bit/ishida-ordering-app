import { Location, Supplier, Item, Order } from './types';

// --- Master Data ---

export const LOCATIONS: Location[] = [
    { id: 'F001', name: 'いしだクリーニング 本社工場', type: '工場' },
    { id: 'F002', name: 'パステルクリーニング 駅家工場', type: '工場' },
    { id: 'S001', name: 'パステルクリーニング アクロス神辺店', type: '店舗', defaultSupplierId: 'F001' },
    { id: 'S002', name: 'パステルクリーニング 多治米店', type: '店舗', defaultSupplierId: 'F001' },
    { id: 'S003', name: 'パステルクリーニング 新徳田店', type: '店舗', defaultSupplierId: 'F001' },
    { id: 'S004', name: 'パステルクリーニング ハローズ神辺店', type: '店舗', defaultSupplierId: 'F001' },
    { id: 'S005', name: 'パステルクリーニング 井原店', type: '店舗', defaultSupplierId: 'F001' },
    { id: 'S006', name: 'いしだクリーニング 千田店', type: '店舗', defaultSupplierId: 'F001' },
    { id: 'S007', name: 'いしだクリーニング サファ店', type: '店舗', defaultSupplierId: 'F001' },
    { id: 'S008', name: 'パステルクリーニング 野上店', type: '店舗', defaultSupplierId: 'F001' },
    { id: 'S009', name: 'パステルクリーニング 春日店', type: '店舗', defaultSupplierId: 'F001' },
    { id: 'S010', name: 'パステルクリーニング 福山北店', type: '店舗', defaultSupplierId: 'F001' },
    { id: 'S011', name: 'パステルクリーニング エブリイ駅家店', type: '店舗', defaultSupplierId: 'F002' },
];

export const SUPPLIERS: Supplier[] = [
    // External Suppliers
    {
        id: 'SUP001',
        name: '共和産業',
        type: '業者',
        officialName: '共和産業株式会社',
        method: '訪問',
        zip: '719-0232',
        address: '岡山県浅口市鴨方町本庄398-1',
        tel: '0865-44-1200',
        fax: '0865-44-1201',
        deliveryDayOfWeek: '火',
        cutoffDayOfWeek: '月',
        cutoffTime: '17:00'
    },
    {
        id: 'SUP002',
        name: 'MCS',
        type: '業者',
        officialName: '株式会社MCS 東部営業所',
        method: '訪問',
        address: '広島県福山市神村町26-1',
        tel: '084-939-5527',
        deliveryDayOfWeek: '水',
        cutoffDayOfWeek: '火',
        cutoffTime: '15:00'
    },
    {
        id: 'SUP003',
        name: '浅野通商',
        type: '業者',
        officialName: '株式会社アサショウ 広島営業所',
        method: '訪問',
        zip: '739-0321',
        address: '広島市安芸区中野5-13-15',
        tel: '082-892-9870',
        fax: '082-892-9871',
        deliveryDayOfWeek: '木',
        cutoffDayOfWeek: '水',
        cutoffTime: '17:00'
    },
    {
        id: 'SUP004',
        name: 'マルワパッケージ',
        type: '業者',
        officialName: '（有）マルワパッケージ',
        method: '訪問',
        zip: '710-0834',
        address: '岡山県倉敷市笹沖546-4',
        tel: '086-426-5687',
        deliveryDayOfWeek: '金',
        cutoffDayOfWeek: '木',
        cutoffTime: '12:00'
    },
    {
        id: 'SUP005',
        name: '新日本製紙',
        type: '業者',
        officialName: '新日本紙工株式会社',
        method: 'FAX',
        zip: '791-0205',
        address: '愛媛県東温市西岡367-1',
        tel: '089-964-5541',
        fax: '089-964-5548',
        deliveryDayOfWeek: '月',
        cutoffDayOfWeek: '金',
        cutoffTime: '17:00'
    },
    {
        id: 'SUP006',
        name: '石川島ボイラー',
        type: '業者',
        officialName: '株式会社IHI汎用ボイラ 西日本支店 福山営業所',
        method: 'TEL/FAX',
        zip: '720-0092',
        address: '広島県福山市山手町3-6-1',
        tel: '084-952-0041',
        fax: '084-952-0043',
        deliveryDayOfWeek: '不定',
        cutoffDayOfWeek: '不定',
        cutoffTime: '17:00'
    },
];

export const ROUTE_MAP: Record<string, string[]> = {
    // 店舗 -> 工場
    'S001': ['F001'], 'S002': ['F001'], 'S003': ['F001'], 'S004': ['F001'], 'S005': ['F001'],
    'S006': ['F001'], 'S007': ['F001'], 'S008': ['F001'], 'S009': ['F001'], 'S010': ['F001'],
    'S011': ['F002'],

    // 工場 -> 業者 / 工場間
    // 本社工場 (F001): 共和産業, MCS, 浅野通商, マルワパッケージ, 新日本製紙, 石川島ボイラー
    'F001': ['SUP001', 'SUP002', 'SUP003', 'SUP004', 'SUP005', 'SUP006'],

    // 駅家工場 (F002): 共和産業, 石川島ボイラー, 浅野通商 + 本社工場(F001)
    'F002': ['SUP001', 'SUP006', 'SUP003', 'F001'],
};

// --- Items Master ---
export const ITEMS: Item[] = [
    { id: 'I0001', category: 'その他（店舗）', name: 'サービスバッグ大', unit: '枚', price: 15, defaultSupplierId: 'SUP004' },
    { id: 'I0002', category: 'その他（店舗）', name: 'サービスバッグ中', unit: '枚', price: 12, defaultSupplierId: 'SUP004' },
    { id: 'I0003', category: 'その他（店舗）', name: 'サービスバッグ特大', unit: '枚', price: 18, defaultSupplierId: 'SUP004' },
    { id: 'I0004', category: 'その他（店舗）', name: '忘れ物袋小', unit: '枚', price: 10, defaultSupplierId: 'SUP004' },
    { id: 'I0005', category: 'その他（店舗）', name: '忘れ物袋大', unit: '枚', price: 12, defaultSupplierId: 'SUP004' },
    { id: 'I0006', category: 'タグ類', name: 'H型①〜⑩カラータック ピンク', unit: '箱', price: 2500, defaultSupplierId: 'SUP003' },
    { id: 'I0007', category: 'タグ類', name: 'H型①〜⑩カラータック 上下紫ライン', unit: '箱', price: 2500, defaultSupplierId: 'SUP003' },
    { id: 'I0008', category: 'タグ類', name: 'NEW汗ぬきタグ', unit: '個', price: 500, defaultSupplierId: 'SUP003' },
    { id: 'I0009', category: 'タグ類', name: 'エリ・ライナー・フード・ベルト付属', unit: '個', price: 300, defaultSupplierId: 'SUP003' },
    { id: 'I0010', category: 'タグ類', name: 'おしゃれ着コースタグ', unit: '個', price: 300, defaultSupplierId: 'SUP003' },
    { id: 'I0011', category: 'タグ類', name: 'このシミは取れませんでした', unit: '個', price: 100, defaultSupplierId: 'SUP003' },
    { id: 'I0012', category: 'タグ類', name: 'しっかり洗い', unit: '個', price: 200, defaultSupplierId: 'SUP003' },
    { id: 'I0013', category: 'タグ類', name: 'シルク', unit: '個', price: 200, defaultSupplierId: 'SUP003' },
    { id: 'I0014', category: 'タグ類', name: 'シワ加工', unit: '個', price: 200, defaultSupplierId: 'SUP003' },
    { id: 'I0015', category: 'タグ類', name: 'ダウン', unit: '個', price: 500, defaultSupplierId: 'SUP003' },
    { id: 'I0016', category: 'タグ類', name: 'デラックス', unit: '個', price: 500, defaultSupplierId: 'SUP003' },
    { id: 'I0017', category: 'タグ類', name: 'メジャーカルテ', unit: '個', price: 1000, defaultSupplierId: 'SUP003' },
    { id: 'I0018', category: 'タグ類', name: 'リフォーム', unit: '個', price: 2000, defaultSupplierId: 'SUP003' },
    { id: 'I0019', category: 'タグ類', name: '汗ぬきタグ', unit: '個', price: 300, defaultSupplierId: 'SUP003' },
    { id: 'I0020', category: 'タグ類', name: '検品', unit: '個', price: 100, defaultSupplierId: 'SUP003' },
    { id: 'I0021', category: 'タグ類', name: '見積もり(内金・決定)', unit: '個', price: 100, defaultSupplierId: 'SUP003' },
    { id: 'I0022', category: 'タグ類', name: '合成皮革', unit: '個', price: 500, defaultSupplierId: 'SUP003' },
    { id: 'I0023', category: 'タグ類', name: '注', unit: '個', price: 50, defaultSupplierId: 'SUP003' },
    { id: 'I0024', category: 'タグ類', name: '特急', unit: '個', price: 300, defaultSupplierId: 'SUP003' },
    { id: 'I0025', category: 'タグ類', name: '皮製品', unit: '個', price: 1000, defaultSupplierId: 'SUP003' },
    { id: 'I0026', category: 'タグ類', name: '不織包装', unit: '個', price: 200, defaultSupplierId: 'SUP003' },
    { id: 'I0027', category: 'タグ類', name: '防ダニ加工', unit: '個', price: 300, defaultSupplierId: 'SUP003' },
    { id: 'I0028', category: 'タグ類', name: '防水タグ', unit: '個', price: 300, defaultSupplierId: 'SUP003' },
    { id: 'I0029', category: 'タグ類', name: '防虫加工', unit: '個', price: 300, defaultSupplierId: 'SUP003' },
    { id: 'I0030', category: 'タグ類', name: '無料シミ抜き', unit: '個', price: 0, defaultSupplierId: 'SUP003' },
    { id: 'I0031', category: 'タグ類', name: '毛玉とり', unit: '個', price: 200, defaultSupplierId: 'SUP003' },
    { id: 'I0032', category: 'タグ類', name: '有・なし', unit: '個', price: 0, defaultSupplierId: 'SUP003' },
    { id: 'I0033', category: 'タグ類', name: '有料シミ抜き', unit: '個', price: 500, defaultSupplierId: 'SUP003' },
    { id: 'I0034', category: 'タグ類', name: '要望', unit: '個', price: 0, defaultSupplierId: 'SUP003' },
    { id: 'I0035', category: 'タグ類', name: '立・平', unit: '個', price: 0, defaultSupplierId: 'SUP003' },
    { id: 'I0036', category: 'タグ類', name: '料金', unit: '個', price: 0, defaultSupplierId: 'SUP003' },
    { id: 'I0037', category: 'ハンガー', name: 'ウエーブハンガー', unit: '本', price: 4520, defaultSupplierId: 'SUP003' },
    { id: 'I0038', category: 'ハンガー', name: 'シルエットセーバー', unit: '本', price: 50, defaultSupplierId: 'SUP001' },
    { id: 'I0039', category: 'ハンガー', name: 'スポンジ', unit: '個', price: 10, defaultSupplierId: 'SUP001' },
    { id: 'I0040', category: 'ハンガー', name: 'ピンチハンガー黒', unit: '本', price: 60, defaultSupplierId: 'SUP001' },
    { id: 'I0041', category: 'ハンガー', name: 'プラハンガー100', unit: '箱', price: 4800, defaultSupplierId: 'SUP003' },
    { id: 'I0042', category: 'ハンガー', name: 'プラハンガー300', unit: '箱', price: 5480, defaultSupplierId: 'SUP003' },
    { id: 'I0043', category: 'ハンガー', name: 'プラハンガー405', unit: '本', price: 35, defaultSupplierId: 'SUP001' },
    { id: 'I0044', category: 'ハンガー', name: 'プラハンガー900', unit: '箱', price: 5616, defaultSupplierId: 'SUP003' },
    { id: 'I0045', category: 'ハンガー', name: 'ワイシャツハンガーD1黒', unit: '本', price: 25, defaultSupplierId: 'SUP001' },
    { id: 'I0046', category: 'ハンガー', name: '針金ハンガー ピンク', unit: '本', price: 15, defaultSupplierId: 'SUP001' },
    { id: 'I0047', category: 'ハンガー', name: '針金ハンガー 紫', unit: '本', price: 15, defaultSupplierId: 'SUP001' },
    { id: 'I0048', category: 'ハンガー', name: '針金ハンガー 青', unit: '本', price: 15, defaultSupplierId: 'SUP001' },
    { id: 'I0049', category: '機械メンテナンス', name: 'カーボンフィルター (エレメント４７０)', unit: '個', price: 15000, defaultSupplierId: 'SUP006' },
    { id: 'I0050', category: '機械メンテナンス', name: 'ボイラー薬液 (イシクリーンNー６００)', unit: '缶', price: 8000, defaultSupplierId: 'SUP006' },
    { id: 'I0051', category: '機械メンテナンス', name: 'ミツメクリンMPーFWSSN', unit: '缶', price: 12000, defaultSupplierId: 'SUP006' },
    { id: 'I0052', category: '機械メンテナンス', name: '粗挽き天日塩', unit: '袋', price: 2000, defaultSupplierId: 'SUP006' },
    { id: 'I0053', category: '機械メンテナンス', name: '粒状活性炭 5Lx3詰', unit: '箱', price: 18000, defaultSupplierId: 'SUP006' },
    { id: 'I0054', category: '工場備品', name: 'カラーホルダー', unit: '箱', price: 4800, defaultSupplierId: 'SUP004' },
    { id: 'I0055', category: '工場備品', name: 'クリーニングペン', unit: '箱', price: 1600, defaultSupplierId: 'SUP003' },
    { id: 'I0056', category: '工場備品', name: 'セロテープ', unit: '巻', price: 1050, defaultSupplierId: 'SUP003' },
    { id: 'I0057', category: '工場備品', name: 'ネクタイクリップ', unit: '袋', price: 500, defaultSupplierId: 'SUP003' },
    { id: 'I0058', category: '工場備品', name: 'ボステッチ針', unit: '箱', price: 460, defaultSupplierId: 'SUP002' },
    { id: 'I0059', category: '工場備品', name: 'ホッチキス針(事務用)', unit: '箱', price: 100, defaultSupplierId: 'SUP003' },
    { id: 'I0060', category: '工場備品', name: 'マイディア(ローラー)替', unit: '本', price: 500, defaultSupplierId: 'SUP003' },
    { id: 'I0061', category: '工場備品', name: '白紙ロール', unit: '巻', price: 300, defaultSupplierId: 'SUP003' },
    { id: 'I0062', category: '工場備品', name: '八切り紙(白)', unit: '包', price: 1500, defaultSupplierId: 'SUP003' },
    { id: 'I0063', category: '洗剤・溶剤', name: 'E・BCLEAN 防ダニ剤', unit: '缶', price: 15000, defaultSupplierId: 'SUP002' },
    { id: 'I0064', category: '書類・伝票', name: '入会申込書', unit: '冊', price: 4800, defaultSupplierId: 'SUP005' },
    { id: 'I0065', category: '書類・伝票', name: '入金伝票', unit: '冊', price: 300, defaultSupplierId: 'SUP005' },
    { id: 'I0066', category: '書類・伝票', name: '報告票', unit: '冊', price: 300, defaultSupplierId: 'SUP005' },
    { id: 'I0067', category: '書類・伝票', name: '料金請求票', unit: '冊', price: 500, defaultSupplierId: 'SUP005' },
    { id: 'I0068', category: '書類・伝票', name: '領収書', unit: '冊', price: 300, defaultSupplierId: 'SUP005' },
];


export const MOCK_ORDERS: Order[] = [
    {
        id: 'ORDER-20231201-001',
        date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(),
        sourceId: 'F001',
        destinationId: 'SUP006',
        items: [
            { itemId: 'I0049', itemName: 'カーボンフィルター (エレメント４７０)', quantity: 2, unit: '個', price: 15000 },
            { itemId: 'I0050', itemName: 'ボイラー薬液 (イシクリーンNー６００)', quantity: 1, unit: '缶', price: 8000 }
        ],
        totalAmount: 38000,
        status: 'completed',
        remarks: '午前中配送希望'
    },
    {
        id: 'ORDER-20231205-002',
        date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 1).toISOString(),
        sourceId: 'S001',
        destinationId: 'F001',
        items: [
            { itemId: 'I0001', itemName: 'サービスバッグ大', quantity: 100, unit: '枚', price: 15 },
            { itemId: 'I0006', itemName: 'H型①〜⑩カラータック ピンク', quantity: 2, unit: '箱', price: 2500 }
        ],
        totalAmount: 6500,
        status: 'pending'
    }
];
