export type LocationType = '店舗' | '工場';
export type SupplierType = '工場' | '業者';

export interface Location {
    id: string;
    name: string;
    type: LocationType;
    defaultSupplierId?: string;
}

export interface Supplier {
    id: string;
    name: string;
    type: SupplierType;
    officialName?: string;
    zip?: string;
    address?: string;
    tel?: string;
    fax?: string;
    method?: string;
    // 業者マスタ拡張
    deliveryDayOfWeek?: string;
    cutoffDayOfWeek?: string;
    cutoffTime?: string;
}

export interface Item {
    id: string;
    materialCode?: string | null;
    category: string;
    name: string;
    unit: string;
    displayName?: string;
    price?: number;
    imageUrl?: string; // サムネイル
    defaultSupplierId?: string;
}

export interface OrderItem {
    itemId: string;
    quantity: number;
    itemName: string;
    displayName?: string;
    unit: string;
    price: number;
}

export interface Order {
    id: string;
    date: string;
    sourceId: string;
    destinationId: string;
    items: OrderItem[];
    totalAmount: number;
    status: 'pending' | 'evaluated' | 'approved' | 'shipping' | 'completed';
    desiredDeliveryDate?: string;
    remarks?: string;
}

export type VendorOrderStatus = 'DRAFT' | 'CONFIRMED' | 'SENT';

export interface VendorOrderLine {
    id: number;
    orderId: string;
    itemId: string;
    itemName: string;
    qty: number;
    unit: string;
    price: number;
    note?: string;
    createdBy?: string;
    requestedBy?: string;
    locationId?: string;
    addedAt: string;
    updatedAt: string;
    item?: Item;
}

export interface VendorOrder {
    id: string;
    vendorId: string;
    periodStart: string;
    periodEnd: string;
    deliveryDate?: string;
    cutoffAt?: string;
    status: VendorOrderStatus;
    isLocked: boolean;
    confirmedAt?: string;
    confirmedBy?: string;
    createdAt: string;
    updatedAt: string;
    lines: VendorOrderLine[];
    vendor: Supplier;
}
