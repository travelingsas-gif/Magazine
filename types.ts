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
  type: ItemType; // Discriminate between consumable products and linen
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
  signatureUrl: string; // Now holds the text name
  photoUrl?: string;
  notes?: string;
  type: ItemType; // Inventory is specific to a type
}

export interface DamageReport {
  id: string;
  structureId: string;
  reporterId: string;
  date: string;
  items: InventoryItem[]; // Items damaged/dirty
  notes?: string;
  status: 'OPEN' | 'RESOLVED';
}

export interface Order {
  id: string;
  structureId: string;
  requesterId: string;
  approverId?: string;
  dateCreated: string;
  dateSent?: string;
  sentToEmail?: string; // Track who it was emailed to
  items: InventoryItem[];
  status: OrderStatus;
  type: ItemType; // Order is specific to a type
}

export enum OrderStatus {
  PENDING = 'PENDING',
  SENT = 'SENT',
  DELIVERED = 'DELIVERED'
}

// --- NEW TYPES FOR LINEN ISSUES ---
export interface LinenIssueItem {
  productId: string;
  dirty: number;   // Sporca
  broken: number;  // Rotta
  unused: number;  // Inutilizzata
}

export interface LinenIssueReport {
  id: string;
  structureId: string;
  reporterId: string;
  date: string;
  items: LinenIssueItem[];
  notes?: string;
}

export interface MockDatabase {
  users: User[];
  products: Product[];
  structures: Structure[];
  inventories: InventoryReport[];
  orders: Order[];
  damageReports: DamageReport[];
  currentUser: User | null;
}