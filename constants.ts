import { Role, Product, Structure, User, InventoryReport, Order, OrderStatus, DamageReport } from './types';

export const INITIAL_PRODUCTS: Product[] = [
  // Products
  { id: 'p1', name: 'Candeggina', category: 'CLEANING', unit: 'Pz', type: 'PRODUCT' },
  { id: 'p2', name: 'Sgrassatore', category: 'CLEANING', unit: 'Pz', type: 'PRODUCT' },
  { id: 'p3', name: 'Caffè Capsule', category: 'FOOD', unit: 'Pz', type: 'PRODUCT' },
  { id: 'p4', name: 'Zucchero', category: 'FOOD', unit: 'Pz', type: 'PRODUCT' },
  { id: 'p5', name: 'Carta Igienica', category: 'AMENITIES', unit: 'Pz', type: 'PRODUCT' },
  { id: 'p6', name: 'Sapone Mani', category: 'AMENITIES', unit: 'Pz', type: 'PRODUCT' },
  // Linen
  { id: 'l1', name: 'Lenzuola Matrimoniali', category: 'LINEN_BED', unit: 'Pz', type: 'LINEN' },
  { id: 'l2', name: 'Lenzuola Singole', category: 'LINEN_BED', unit: 'Pz', type: 'LINEN' },
  { id: 'l3', name: 'Federa Cuscino', category: 'LINEN_BED', unit: 'Pz', type: 'LINEN' },
  { id: 'l4', name: 'Asciugamano Viso', category: 'LINEN_BATH', unit: 'Pz', type: 'LINEN' },
  { id: 'l5', name: 'Asciugamano Doccia', category: 'LINEN_BATH', unit: 'Pz', type: 'LINEN' },
  { id: 'l6', name: 'Tappetino Bagno', category: 'LINEN_BATH', unit: 'Pz', type: 'LINEN' },
];

export const INITIAL_STRUCTURES: Structure[] = [
  { id: 's1', name: 'Villa Paradiso', address: 'Via Roma 10, Napoli', accessCodes: 'Keybox: 1234' },
  { id: 's2', name: 'Appartamento Sole', address: 'Via Toledo 55, Napoli', accessCodes: 'Alarm: 9988' },
  { id: 's3', name: 'Loft Vista Mare', address: 'Via Caracciolo 2, Napoli', accessCodes: 'Gate: 5555' },
];

export const INITIAL_USERS: User[] = [
  { id: 'u1', name: 'Mario Rossi', email: 'admin@hotel.com', role: Role.ADMIN, password: 'password' },
  { id: 'u2', name: 'Giulia Bianchi', email: 'reception@hotel.com', role: Role.RECEPTION, password: 'password' },
  { id: 'u3', name: 'Luca Verdi', email: 'op1@hotel.com', role: Role.OPERATOR, password: 'password' },
  { id: 'u4', name: 'Anna Neri', email: 'op2@hotel.com', role: Role.OPERATOR, password: 'password' },
  { id: 'u5', name: 'Alfonso Fornitore', email: 'alfonso@supply.com', role: Role.SUPPLIER, password: 'password' },
];

export const INITIAL_INVENTORIES: InventoryReport[] = [
  {
    id: 'inv1',
    structureId: 's1',
    operatorId: 'u3',
    date: new Date(Date.now() - 86400000).toISOString(),
    items: [
      { productId: 'p1', quantity: 2 },
      { productId: 'p3', quantity: 50 }
    ],
    signatureUrl: 'Luca Verdi', 
    notes: 'Initial count',
    type: 'PRODUCT'
  }
];

export const INITIAL_ORDERS: Order[] = [
  {
    id: 'ord1',
    structureId: 's1',
    requesterId: 'u3',
    dateCreated: new Date(Date.now() - 4000000).toISOString(),
    status: OrderStatus.PENDING,
    items: [
      { productId: 'p5', quantity: 10 }
    ],
    type: 'PRODUCT'
  }
];

export const INITIAL_DAMAGE_REPORTS: DamageReport[] = [];