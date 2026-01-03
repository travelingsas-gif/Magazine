export enum Role {
  ADMIN = 'ADMIN',
  RECEPTION = 'RECEPTION',
  OPERATOR = 'OPERATOR',
  SUPPLIER = 'SUPPLIER'
}

export type ItemType = 'PRODUCT' | 'LINEN';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  password?: string;
}

export interface Product {
  id: string;
  name: string;
  category: 'CLEANING' | 'FOOD' | 'AMENITIES' | 'LINEN_BED' | 'LINEN_BATH' | 'OTHER';
  unit: string;
  type: ItemType;
}

export interface Structure {
  id: string;
  name: string;
  address: string;
  accessCodes: string;
  imageUrl?: string;
}

export interface InventoryItem {
  productId: string;
  quantity: number;
}

export interface InventoryReport {
  id: string;
  structureId: string;
  operatorId: string;
  date: string;
  items: InventoryItem[];
  signatureUrl: string;
  photoUrl?: string;
  notes?: string;
  type: ItemType;
}

export interface DamageReport {
  id: string;
  structureId: string;
  reporterId: string;
  date: string;
  items: InventoryItem[];
  notes?: string;
  status: 'OPEN' | 'RESOLVED' | 'ARCHIVED';
}

export interface UnusedLinenReport {
  id: string;
  structureId: string;
  operatorId: string;
  date: string;
  dirtyItems: InventoryItem[];
  unusedItems: InventoryItem[];
  brokenItems: InventoryItem[];
  notes?: string;
  signatureUrl?: string;
}

export enum OrderStatus {
  PENDING = 'PENDING',
  SENT = 'SENT',
  DELIVERED = 'DELIVERED'
}

export interface Order {
  id: string;
  structureId: string;
  requesterId: string;
  approverId?: string;
  dateCreated: string;
  dateSent?: string;
  sentToEmail?: string;
  items: InventoryItem[];
  status: OrderStatus;
  type: ItemType;
  signatureUrl?: string;
}