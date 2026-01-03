
import React, { useState, useMemo, useEffect } from 'react';
import { 
  Building2, Box, Users, ShoppingCart, LogOut, Menu, X, 
  Plus, Edit, Trash2, Camera, Check, Send, AlertCircle, FileText, Search,
  Clock, Bell, Truck, MapPin, Save, XCircle, Mail, Shirt, AlertTriangle, UserCheck, Loader, RefreshCw, Database, Image as ImageIcon, Minus, Key, Wrench, CheckCircle2
} from 'lucide-react';
import { 
  Role, User, Product, Structure, InventoryReport, Order, 
  OrderStatus, InventoryItem, ItemType, DamageReport 
} from './types';
import { supabase } from './supabaseClient';

// --- Helpers to map snake_case (DB) to camelCase (App) ---

const mapUser = (u: any): User => ({
  id: u.id, name: u.name, email: u.email, role: u.role as Role, password: u.password
});

const mapStructure = (s: any): Structure => ({
  id: s.id, name: s.name, address: s.address, access_codes: s.access_codes, imageUrl: s.image_url
});

const mapProduct = (p: any): Product => ({
  id: p.id, name: p.name, category: p.category, unit: p.unit, type: p.type
});

const mapInventory = (i: any): InventoryReport => ({
  id: i.id, structureId: i.structure_id, operator_id: i.operator_id, date: i.date, items: i.items, signature_url: i.signature_url, photo_url: i.photo_url, notes: i.notes, type: i.type
});

const mapOrder = (o: any): Order => ({
  id: o.id, structureId: o.structure_id, requester_id: o.requester_id, date_created: o.date_created, date_sent: o.date_sent, sent_to_email: o.sent_to_email, items: o.items, status: o.status, type: o.type
});

const mapDamageReport = (d: any): DamageReport => ({
  id: d.id, structureId: d.structure_id, reporter_id: d.reporter_id, date: d.date, items: d.items, notes: d.notes, status: d.status
});

// --- Main App ---

const App: React.FC = () => {
  // --- State ---
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Data
  const [users, setUsers] = useState<User[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [structures, setStructures] = useState<Structure[]>([]);
  const [inventories, setInventories] = useState<InventoryReport[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [damageReports, setDamageReports] = useState<DamageReport[]>([]);

  // Navigation state
  const [currentView, setCurrentView] = useState<string>('login');
  const [selectedStructureId, setSelectedStructureId] = useState<string | null>(null);
  
  const [activeItemType, setActiveItemType] = useState<ItemType>('PRODUCT'); 
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // --- Fetch Data on Mount ---

  const fetchData = async () => {
    setLoading(true);
    try {
       // Parallel fetching
       const [resUsers, resProds, resStructs, resInv, resOrd, resDmg] = await Promise.all([
         supabase.from('users').select('*'),
         supabase.from('products').select('*'),
         supabase.from('structures').select('*'),
         supabase.from('inventories').select('*'),
         supabase.from('orders').select('*'),
         supabase.from('damage_reports').select('*')
       ]);

       if (resUsers.error) throw resUsers.error;
       setUsers(resUsers.data.map(mapUser));

       if (resProds.error) throw resProds.error;
       setProducts(resProds.data.map(mapProduct));

       if (resStructs.error) throw resStructs.error;
       setStructures(resStructs.data.map(mapStructure));

       if (resInv.error) throw resInv.error;
       setInventories(resInv.data.map(mapInventory));

       if (resOrd.error) throw resOrd.error;
       setOrders(resOrd.data.map(mapOrder));

       if (resDmg.error) throw resDmg.error;
       setDamageReports(resDmg.data.map(mapDamageReport));

    } catch (err: any) {
      console.error("Error fetching data:", err);
      setError("Impossibile connettersi al database. Verifica la configurazione.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // --- Handlers (Now async with DB) ---

  const handleLogin = (email: string, pass: string) => {
    // Simple check against fetched users (Security note: implement proper Supabase Auth in production)
    const user = users.find(u => u.email === email && u.password === pass);
    if (user) {
      setCurrentUser(user);
      if (user.role === Role.SUPPLIER) {
        setCurrentView('supplier-dashboard');
      } else {
        setCurrentView('dashboard');
      }
    } else {
      alert('Credenziali non valide');
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setCurrentView('login');
    setIsMenuOpen(false);
  };

  const getUnreadOrdersCount = (type?: ItemType) => {
    if (currentUser?.role === Role.RECEPTION || currentUser?.role === Role.ADMIN) {
      if (type) {
        return orders.filter(o => o.status === OrderStatus.PENDING && o.type === type).length;
      }
      return orders.filter(o => o.status === OrderStatus.PENDING).length;
    }
    return 0;
  };

  // --- Render Functions ---

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 flex-col gap-4">
         <Loader className="animate-spin text-emerald-600" size={48} />
         <p className="text-gray-500 font-medium">Caricamento dati in corso...</p>
      </div>
    );
  }

  if (error) {
     return (
       <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
         <div className="bg-white p-6 rounded-lg shadow-lg border-l-4 border-red-500 max-w-md">
            <h2 className="text-xl font-bold text-red-600 mb-2">Errore di Connessione</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <p className="text-xs text-gray-400 mb-4">Assicurati di aver inserito le chiavi API corrette in supabaseClient.ts</p>
            <button onClick={() => window.location.reload()} className="bg-gray-200 px-4 py-2 rounded">Riprova</button>
         </div>
       </div>
     )
  }

  if (!currentUser || currentView === 'login') {
    return <LoginView onLogin={handleLogin} />;
  }

  const renderContent = () => {
    switch (currentView) {
      case 'dashboard':
        return <DashboardView 
                  structures={structures} 
                  onSelectStructure={(id) => { setSelectedStructureId(id); setCurrentView('structure-detail'); }}
                  onAddStructure={async (newS) => {
                    const { data, error } = await supabase.from('structures').insert({
                      id: newS.id, name: newS.name, address: newS.address, access_codes: newS.accessCodes
                    }).select().single();
                    if(!error && data) setStructures([...structures, mapStructure(data)]);
                  }}
                  onUpdateImage={async (id, url) => {
                    const { error } = await supabase.from('structures').update({ image_url: url }).eq('id', id);
                    if (!error) {
                      setStructures(prev => prev.map(s => s.id === id ? { ...s, imageUrl: url } : s));
                    }
                  }}
                  role={currentUser.role}
                  pendingOrdersCount={getUnreadOrdersCount()}
                  onNavigateToOrders={() => setCurrentView('orders-products')}
               />;
      case 'supplier-dashboard':
        return <SupplierDashboardView 
                  orders={orders}
                  structures={structures}
                  products={products}
                  users={users}
               />;
      case 'structure-detail':
        return <StructureDetailView 
                  structureId={selectedStructureId!}
                  currentUser={currentUser}
                  inventories={inventories}
                  orders={orders}
                  products={products}
                  structures={structures}
                  users={users}
                  damageReports={damageReports}
                  onBack={() => setCurrentView('dashboard')}
                  onNewInventory={(type) => { setActiveItemType(type); setCurrentView('inventory-new'); }}
                  onRequestOrder={(type) => { setActiveItemType(type); setCurrentView('order-new'); }}
                  onReportDamage={(type) => { setActiveItemType(type); setCurrentView('damage-report-new'); }}
                  onEditStructure={async (s) => {
                    const { error } = await supabase.from('structures').update({
                      name: s.name, address: s.address, access_codes: s.accessCodes
                    }).eq('id', s.id);
                    if(!error) {
                       setStructures(prev => prev.map(old => old.id === s.id ? s : old));
                       alert('Dati struttura aggiornati correttamente.');
                    }
                  }}
                  onResolveDamage={async (id) => {
                     const { error } = await supabase.from('damage_reports').update({ status: 'RESOLVED' }).eq('id', id);
                     if (!error) {
                       setDamageReports(prev => prev.map(d => d.id === id ? { ...d, status: 'RESOLVED' } : d));
                     }
                  }}
                  onDeleteDamage={async (id) => {
                     const { error } = await supabase.from('damage_reports').delete().eq('id', id);
                     if (!error) {
                       setDamageReports(prev => prev.filter(d => d.id !== id));
                     }
                  }}
               />;
      case 'inventory-new':
        return <NewInventoryView 
                  structureId={selectedStructureId!}
                  currentUser={currentUser}
                  products={products}
                  type={activeItemType}
                  onSave={async (inv) => {
                    const { data, error } = await supabase.from('inventories').insert({
                       id: inv.id, structure_id: inv.structureId, operator_id: inv.operatorId,
                       date: inv.date, items: inv.items, signature_url: inv.signatureUrl, photo_url: inv.photoUrl,
                       notes: inv.notes, type: inv.type
                    }).select().single();
                    if(!error && data) {
                       setInventories([...inventories, mapInventory(data)]);
                       setCurrentView('structure-detail');
                    }
                  }}
                  onCancel={() => setCurrentView('structure-detail')}
               />;
      case 'order-new':
        return <NewOrderView
                structureId={selectedStructureId!}
                currentUser={currentUser}
                products={products}
                inventories={inventories}
                type={activeItemType}
                onSave={async (ord) => {
                  const { data, error } = await supabase.from('orders').insert({
                     id: ord.id, structure_id: ord.structureId, requester_id: ord.requester_id,
                     date_created: ord.dateCreated, status: ord.status, items: ord.items, type: ord.type
                  }).select().single();
                  if(!error && data) {
                     setOrders([...orders, mapOrder(data)]);
                     setCurrentView('structure-detail');
                  }
                }}
                onCancel={() => setCurrentView('structure-detail')}
              />
      case 'damage-report-new':
        return <NewDamageReportView
                structureId={selectedStructureId!}
                currentUser={currentUser}
                products={products}
                type={activeItemType}
                onSave={async (rep) => {
                  const { data, error } = await supabase.from('damage_reports').insert({
                     id: rep.id, structure_id: rep.structureId, reporter_id: rep.reporterId,
                     date: rep.date, items: rep.items, notes: rep.notes, status: rep.status
                  }).select().single();
                  if(!error && data) {
                    setDamageReports([...damageReports, mapDamageReport(data)]);
                    setCurrentView('structure-detail');
                  }
                }}
                onCancel={() => setCurrentView('structure-detail')}
              />
      case 'orders-products': 
        return <ManageOrdersView 
                  orders={orders}
                  structures={structures}
                  products={products}
                  users={users}
                  currentUser={currentUser}
                  targetType="PRODUCT"
                  onUpdateOrder={async (updatedOrder) => {
                    const { error } = await supabase.from('orders').update({
                       items: updatedOrder.items, status: updatedOrder.status, 
                       date_sent: updatedOrder.dateSent, sent_to_email: updatedOrder.sentToEmail
                    }).eq('id', updatedOrder.id);
                    if(!error) setOrders(orders.map(o => o.id === updatedOrder.id ? updatedOrder : o));
                  }}
                  onDeleteOrder={async (id) => {
                    const { error } = await supabase.from('orders').delete().eq('id', id);
                    if(!error) setOrders(orders.filter(o => o.id !== id));
                  }}
               />
      case 'orders-linen': 
        return <ManageOrdersView 
                  orders={orders}
                  structures={structures}
                  products={products}
                  users={users}
                  currentUser={currentUser}
                  targetType="LINEN"
                  onUpdateOrder={async (updatedOrder) => {
                    const { error } = await supabase.from('orders').update({
                       items: updatedOrder.items, status: updatedOrder.status, 
                       date_sent: updatedOrder.dateSent, sent_to_email: updatedOrder.sentToEmail
                    }).eq('id', updatedOrder.id);
                    if(!error) setOrders(orders.map(o => o.id === updatedOrder.id ? updatedOrder : o));
                  }}
                  onDeleteOrder={async (id) => {
                     const { error } = await supabase.from('orders').delete().eq('id', id);
                     if(!error) setOrders(orders.filter(o => o.id !== id));
                  }}
               />
      case 'users':
        return <UserManagementView 
                  users={users} 
                  setUsers={setUsers} 
                  onAddUser={async (newUser) => {
                     const { data, error } = await supabase.from('users').insert({
                        id: newUser.id, name: newUser.name, email: newUser.email,
                        role: newUser.role, password: newUser.password
                     }).select().single();
                     if(!error && data) setUsers([...users, mapUser(data)]);
                  }}
                  onDeleteUser={async (id) => {
                     const { error } = await supabase.from('users').delete().eq('id', id);
                     if(!error) setUsers(users.filter(u => u.id !== id));
                  }}
               />;
      case 'products':
        return <ProductManagementView 
                  products={products} 
                  setProducts={setProducts} 
                  onAddProduct={async (newP) => {
                     const { data, error } = await supabase.from('products').insert({
                        id: newP.id, name: newP.name, category: newP.category,
                        unit: newP.unit, type: newP.type
                     }).select().single();
                     if(!error && data) setProducts([...products, mapProduct(data)]);
                  }}
                  onDeleteProduct={async (id) => {
                     const { error } = await supabase.from('products').delete().eq('id', id);
                     if(!error) setProducts(products.filter(p => p.id !== id));
                  }}
               />;
      default:
        // Default fallback
        if (currentUser.role === Role.SUPPLIER) return <SupplierDashboardView orders={orders} structures={structures} products={products} users={users} />;
        return <DashboardView structures={structures} onSelectStructure={() => {}} onAddStructure={async ()=>{}} onUpdateImage={async ()=>{}} role={currentUser.role} pendingOrdersCount={0} onNavigateToOrders={() => {}} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
      {/* Mobile Header */}
      <div className="md:hidden bg-white shadow-sm p-4 flex justify-between items-center sticky top-0 z-20">
        <h1 className="text-xl font-bold text-emerald-700">CleanManage</h1>
        <div className="flex items-center gap-4">
           {getUnreadOrdersCount() > 0 && currentUser.role !== Role.SUPPLIER && (
              <button onClick={() => setCurrentView('orders-products')} className="relative text-gray-600">
                <Bell size={24} />
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] w-4 h-4 flex items-center justify-center rounded-full">
                  {getUnreadOrdersCount()}
                </span>
              </button>
           )}
           <button onClick={() => setIsMenuOpen(!isMenuOpen)}>
             {isMenuOpen ? <X /> : <Menu />}
           </button>
        </div>
      </div>

      {/* Sidebar / Drawer */}
      <aside className={`
        fixed inset-y-0 left-0 transform ${isMenuOpen ? 'translate-x-0' : '-translate-x-full'}
        md:relative md:translate-x-0 transition duration-200 ease-in-out
        w-64 bg-slate-900 text-white p-6 flex flex-col z-10
      `}>
        <div className="hidden md:flex items-center gap-2 mb-10">
          <Building2 className="text-emerald-400" />
          <span className="text-xl font-bold">CleanManage</span>
        </div>
        
        <div className="mb-6">
           <div className="text-xs text-slate-400 uppercase font-bold tracking-wider mb-2">Utente</div>
           <div className="flex items-center gap-2">
             <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center text-sm font-bold">
               {currentUser.name.charAt(0)}
             </div>
             <div>
               <p className="text-sm font-medium">{currentUser.name}</p>
               <p className="text-xs text-slate-400 capitalize">{currentUser.role.toLowerCase()}</p>
             </div>
           </div>
        </div>

        <nav className="flex-1 space-y-2">
          {currentUser.role === Role.SUPPLIER ? (
            <NavItem 
              icon={<Truck size={20} />} 
              label="Pannello Fornitore" 
              active={currentView === 'supplier-dashboard'} 
              onClick={() => { setCurrentView('supplier-dashboard'); setIsMenuOpen(false); }} 
            />
          ) : (
            <>
              <NavItem 
                icon={<Building2 size={20} />} 
                label="Zone / Strutture" 
                active={currentView === 'dashboard' || currentView === 'structure-detail'} 
                onClick={() => { setCurrentView('dashboard'); setIsMenuOpen(false); }} 
              />
              
              {/* Sezione Ordini visibile a Admin, Reception E Operatori (per gestire i propri) */}
              {(currentUser.role === Role.ADMIN || currentUser.role === Role.RECEPTION || currentUser.role === Role.OPERATOR) && (
                <>
                  <div className="pt-4 pb-2 text-xs text-slate-500 uppercase font-bold tracking-wider">Ordini</div>
                  <NavItem 
                    icon={<ShoppingCart size={20} />} 
                    label="Ordini Prodotti" 
                    badge={getUnreadOrdersCount('PRODUCT')}
                    active={currentView === 'orders-products'} 
                    onClick={() => { setCurrentView('orders-products'); setIsMenuOpen(false); }} 
                  />
                  <NavItem 
                    icon={<Shirt size={20} />} 
                    label="Ordini Biancheria" 
                    badge={getUnreadOrdersCount('LINEN')}
                    active={currentView === 'orders-linen'} 
                    onClick={() => { setCurrentView('orders-linen'); setIsMenuOpen(false); }} 
                  />
                </>
              )}

              {currentUser.role === Role.ADMIN && (
                <>
                  <div className="pt-4 pb-2 text-xs text-slate-500 uppercase font-bold tracking-wider">Amministrazione</div>
                  <NavItem 
                    icon={<Box size={20} />} 
                    label="Prodotti" 
                    active={currentView === 'products'} 
                    onClick={() => { setCurrentView('products'); setIsMenuOpen(false); }} 
                  />
                  <NavItem 
                    icon={<Users size={20} />} 
                    label="Utenti" 
                    active={currentView === 'users'} 
                    onClick={() => { setCurrentView('users'); setIsMenuOpen(false); }} 
                  />
                </>
              )}
            </>
          )}
        </nav>

        <button 
          onClick={handleLogout}
          className="mt-auto flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
        >
          <LogOut size={20} />
          <span>Esci</span>
        </button>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto h-screen">
        {renderContent()}
      </main>
    </div>
  );
};

// --- Sub-Components ---

const NavItem: React.FC<{ icon: any, label: string, active?: boolean, onClick: () => void, badge?: number }> = ({ icon, label, active, onClick, badge }) => (
  <button 
    onClick={onClick}
    className={`w-full flex items-center justify-between p-3 rounded-lg transition-colors ${active ? 'bg-emerald-600 text-white' : 'hover:bg-slate-800 text-slate-300'}`}
  >
    <div className="flex items-center gap-3">
      {icon}
      <span>{label}</span>
    </div>
    {badge ? <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">{badge}</span> : null}
  </button>
);

const ConfirmationModal: React.FC<{
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  title: string;
  message: string;
}> = ({ isOpen, onConfirm, onCancel, title, message }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4 animate-fade-in">
      <div className="bg-white p-6 rounded-lg shadow-xl max-w-sm w-full">
        <h3 className="text-xl font-bold mb-2 text-gray-800">{title}</h3>
        <p className="mb-6 text-gray-600">{message}</p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition font-medium"
          >
            Annulla
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 font-bold shadow-sm transition flex items-center gap-2"
          >
            <Trash2 size={18} /> Elimina
          </button>
        </div>
      </div>
    </div>
  );
};

const LoginView: React.FC<{ onLogin: (e: string, p: string) => void }> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md">
        <div className="text-center mb-8">
          <div className="bg-emerald-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <Building2 className="text-emerald-600" size={32} />
          </div>
          <h2 className="text-2xl font-bold text-gray-800">CleanManage</h2>
          <p className="text-gray-500">Accesso portale turistico</p>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); onLogin(email, password); }} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input 
              type="email" 
              required
              className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-emerald-500 outline-none transition"
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input 
              type="password" 
              required
              className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-emerald-500 outline-none transition"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
          </div>
          <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-lg transition">
            Accedi
          </button>
        </form>
        <div className="mt-6 text-center text-xs text-gray-400">
           Verifica le credenziali create nel database.
        </div>
      </div>
    </div>
  );
};

// --- Detailed Views ---

const StructureDetailView: React.FC<{
  structureId: string;
  currentUser: User;
  inventories: InventoryReport[];
  orders: Order[];
  products: Product[];
  structures: Structure[];
  users: User[];
  damageReports: DamageReport[];
  onBack: () => void;
  onNewInventory: (type: ItemType) => void;
  onRequestOrder: (type: ItemType) => void;
  onReportDamage: (type: ItemType) => void;
  onEditStructure: (s: Structure) => void;
  onResolveDamage: (id: string) => void;
  onDeleteDamage: (id: string) => void;
}> = ({
  structureId, currentUser, inventories, orders, products, structures, users, damageReports,
  onBack, onNewInventory, onRequestOrder, onReportDamage, onEditStructure, onResolveDamage, onDeleteDamage
}) => {
  const structure = structures.find(s => s.id === structureId);
  const [activeTab, setActiveTab] = useState<'info' | 'inventory' | 'orders' | 'damages'>('info');
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Structure | null>(null);

  useEffect(() => {
    if (structure) setEditForm(structure);
  }, [structure]);

  if (!structure) return <div>Struttura non trovata</div>;

  const structInventories = inventories.filter(i => i.structureId === structure.id).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const structOrders = orders.filter(o => o.structureId === structure.id).sort((a, b) => new Date(b.dateCreated).getTime() - new Date(a.dateCreated).getTime());
  const structDamages = damageReports.filter(d => d.structureId === structure.id).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const handleSaveEdit = () => {
    if (editForm) {
      onEditStructure(editForm);
      setIsEditing(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto pb-20">
      <button onClick={onBack} className="flex items-center gap-2 text-gray-500 mb-4 hover:text-emerald-600 transition">
        <Building2 size={18} /> Torna alla Dashboard
      </button>

      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          {isEditing && editForm ? (
            <div className="space-y-2">
              <input className="border p-2 rounded w-full font-bold text-2xl" value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} />
              <input className="border p-2 rounded w-full" value={editForm.address} onChange={e => setEditForm({...editForm, address: e.target.value})} />
              <input className="border p-2 rounded w-full font-mono" value={editForm.accessCodes} onChange={e => setEditForm({...editForm, accessCodes: e.target.value})} />
            </div>
          ) : (
            <>
              <h1 className="text-3xl font-bold text-gray-800">{structure.name}</h1>
              <p className="text-gray-500 flex items-center gap-2 mt-1"><MapPin size={16} /> {structure.address}</p>
              <div className="flex items-center gap-2 mt-2">
                 <span className="bg-gray-100 px-3 py-1 rounded text-sm font-mono border border-gray-200 text-gray-600 select-all">
                    Cod: {structure.accessCodes}
                 </span>
              </div>
            </>
          )}
        </div>
        {currentUser.role === Role.ADMIN && (
          <div>
            {isEditing ? (
              <div className="flex gap-2">
                <button onClick={handleSaveEdit} className="bg-emerald-600 text-white px-4 py-2 rounded">Salva</button>
                <button onClick={() => setIsEditing(false)} className="bg-gray-200 text-gray-700 px-4 py-2 rounded">Annulla</button>
              </div>
            ) : (
              <button onClick={() => setIsEditing(true)} className="flex items-center gap-2 text-emerald-600 bg-emerald-50 px-4 py-2 rounded-lg font-medium">
                <Edit size={18} /> Modifica Dati
              </button>
            )}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-6 border-b mb-6 overflow-x-auto">
        <button onClick={() => setActiveTab('info')} className={`pb-3 px-1 whitespace-nowrap font-medium ${activeTab === 'info' ? 'text-emerald-600 border-b-2 border-emerald-600' : 'text-gray-500'}`}>Panoramica</button>
        <button onClick={() => setActiveTab('inventory')} className={`pb-3 px-1 whitespace-nowrap font-medium ${activeTab === 'inventory' ? 'text-emerald-600 border-b-2 border-emerald-600' : 'text-gray-500'}`}>Storico Inventari</button>
        <button onClick={() => setActiveTab('orders')} className={`pb-3 px-1 whitespace-nowrap font-medium ${activeTab === 'orders' ? 'text-emerald-600 border-b-2 border-emerald-600' : 'text-gray-500'}`}>Ordini</button>
        <button onClick={() => setActiveTab('damages')} className={`pb-3 px-1 whitespace-nowrap font-medium ${activeTab === 'damages' ? 'text-emerald-600 border-b-2 border-emerald-600' : 'text-gray-500'}`}>Segnalazioni</button>
      </div>

      {/* Content */}
      <div className="space-y-6">
        {activeTab === 'info' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             {/* Inventario Prodotti: Visibile a tutti (Operatori, Admin, Reception) */}
             <div onClick={() => onNewInventory('PRODUCT')} className="cursor-pointer bg-emerald-50 border border-emerald-100 p-6 rounded-xl hover:shadow-md transition">
                <div className="bg-white w-12 h-12 rounded-full flex items-center justify-center text-emerald-600 mb-3 shadow-sm"><Box /></div>
                <h3 className="font-bold text-lg text-emerald-900">Inventario Prodotti</h3>
                <p className="text-emerald-700 text-sm">Controlla e registra i consumabili</p>
             </div>

             {/* Inventario Biancheria: Visibile a tutti (Operatori, Admin, Reception) */}
             <div onClick={() => onNewInventory('LINEN')} className="cursor-pointer bg-indigo-50 border border-indigo-100 p-6 rounded-xl hover:shadow-md transition">
                <div className="bg-white w-12 h-12 rounded-full flex items-center justify-center text-indigo-600 mb-3 shadow-sm"><Shirt /></div>
                <h3 className="font-bold text-lg text-indigo-900">Conta Biancheria</h3>
                <p className="text-indigo-700 text-sm">Gestione lavanderia e cambi</p>
             </div>

             {/* Ordina Forniture: Visibile a Admin, Reception, Operatore */}
             <div onClick={() => onRequestOrder('PRODUCT')} className="cursor-pointer bg-orange-50 border border-orange-100 p-6 rounded-xl hover:shadow-md transition">
                <div className="bg-white w-12 h-12 rounded-full flex items-center justify-center text-orange-600 mb-3 shadow-sm"><ShoppingCart /></div>
                <h3 className="font-bold text-lg text-orange-900">Ordina Forniture</h3>
                <p className="text-orange-700 text-sm">Richiedi prodotti mancanti</p>
             </div>

             {/* Ordina Biancheria: Visibile a Operatore, Reception, Admin */}
             <div onClick={() => onRequestOrder('LINEN')} className="cursor-pointer bg-sky-50 border border-sky-100 p-6 rounded-xl hover:shadow-md transition">
                <div className="bg-white w-12 h-12 rounded-full flex items-center justify-center text-sky-600 mb-3 shadow-sm"><Shirt /></div>
                <h3 className="font-bold text-lg text-sky-900">Ordina Biancheria</h3>
                <p className="text-sky-700 text-sm">Richiedi set biancheria</p>
             </div>

             {/* Segnalazione Danni: Visibile a tutti */}
             <div onClick={() => onReportDamage('PRODUCT')} className="cursor-pointer bg-red-50 border border-red-100 p-6 rounded-xl hover:shadow-md transition">
                <div className="bg-white w-12 h-12 rounded-full flex items-center justify-center text-red-600 mb-3 shadow-sm"><AlertTriangle /></div>
                <h3 className="font-bold text-lg text-red-900">Segnala Guasto</h3>
                <p className="text-red-700 text-sm">Manutenzione e danni</p>
             </div>
          </div>
        )}

        {activeTab === 'inventory' && (
          <div className="space-y-4">
            {structInventories.map(inv => (
              <div key={inv.id} className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                <div className="flex justify-between items-center mb-2">
                  <span className={`text-xs px-2 py-1 rounded font-bold ${inv.type === 'LINEN' ? 'bg-indigo-100 text-indigo-700' : 'bg-emerald-100 text-emerald-700'}`}>{inv.type}</span>
                  <span className="text-sm text-gray-500">{new Date(inv.date).toLocaleString()}</span>
                </div>
                <p className="font-bold text-gray-700">Operatore: <span className="font-normal">{users.find(u => u.id === inv.operatorId)?.name}</span></p>
                <div className="mt-3 text-sm text-gray-600">
                  {inv.items.slice(0, 3).map(item => {
                    const p = products.find(prod => prod.id === item.productId);
                    return p ? <span key={item.productId} className="mr-3 bg-gray-50 px-2 py-0.5 rounded">{p.name}: {item.quantity}</span> : null;
                  })}
                  {inv.items.length > 3 && <span className="text-gray-400">+{inv.items.length - 3} altri</span>}
                </div>
              </div>
            ))}
            {structInventories.length === 0 && <p className="text-gray-400 text-center py-8">Nessun inventario registrato</p>}
          </div>
        )}

        {activeTab === 'orders' && (
           <div className="space-y-4">
             {structOrders.map(ord => (
                <div key={ord.id} className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                   <div className="flex justify-between items-center mb-2">
                      <span className={`text-xs px-2 py-1 rounded font-bold ${ord.status === OrderStatus.DELIVERED ? 'bg-green-100 text-green-700' : ord.status === OrderStatus.SENT ? 'bg-blue-100 text-blue-700' : 'bg-yellow-100 text-yellow-700'}`}>
                        {ord.status}
                      </span>
                      <span className="text-sm text-gray-500">{new Date(ord.dateCreated).toLocaleDateString()}</span>
                   </div>
                   <p className="text-sm">Richiesto da: {users.find(u => u.id === ord.requesterId)?.name}</p>
                   <p className="text-xs text-gray-400 mt-1">{ord.items.length} articoli</p>
                </div>
             ))}
             {structOrders.length === 0 && <p className="text-gray-400 text-center py-8">Nessun ordine recente</p>}
           </div>
        )}

        {activeTab === 'damages' && (
          <div className="space-y-4">
             {structDamages.map(dmg => {
                const isResolved = dmg.status === 'RESOLVED';
                return (
                  <div key={dmg.id} className={`bg-white p-4 rounded-lg shadow-sm border-l-4 transition-all ${isResolved ? 'border-l-green-500 opacity-70' : 'border-l-red-500'}`}>
                     <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                          {isResolved ? <CheckCircle2 className="text-green-500" size={20} /> : <Wrench className="text-red-500" size={20} />}
                          <span className={`text-sm font-bold ${isResolved ? 'text-green-700' : 'text-red-700'}`}>
                            {isResolved ? 'Riparato / Risolto' : 'Guasto Aperto'}
                          </span>
                        </div>
                        <span className="text-xs text-gray-400">{new Date(dmg.date).toLocaleDateString()}</span>
                     </div>
                     <p className="text-gray-800 mb-3">{dmg.notes}</p>
                     <div className="flex justify-between items-center">
                        <p className="text-xs text-gray-400">Segnalato da: {users.find(u => u.id === dmg.reporterId)?.name}</p>
                        
                        {/* Action Buttons */}
                        {currentUser.role !== Role.SUPPLIER && (
                          <div className="flex gap-2">
                             {!isResolved && (
                                <button 
                                  onClick={() => onResolveDamage(dmg.id)}
                                  className="flex items-center gap-1 bg-green-50 text-green-700 px-3 py-1.5 rounded text-xs font-bold hover:bg-green-100 transition"
                                >
                                  <Check size={14} /> Segna Riparato
                                </button>
                             )}
                             {isResolved && (
                                <button 
                                  onClick={() => onDeleteDamage(dmg.id)}
                                  className="flex items-center gap-1 bg-gray-100 text-gray-600 px-3 py-1.5 rounded text-xs font-bold hover:bg-red-50 hover:text-red-600 transition"
                                >
                                  <Trash2 size={14} /> Cestina
                                </button>
                             )}
                          </div>
                        )}
                     </div>
                  </div>
                );
             })}
             {structDamages.length === 0 && <p className="text-gray-400 text-center py-8">Nessuna segnalazione guasti.</p>}
          </div>
        )}
      </div>
    </div>
  );
};

const NewInventoryView: React.FC<{
  structureId: string;
  currentUser: User;
  products: Product[];
  type: ItemType;
  onSave: (inv: any) => void;
  onCancel: () => void;
}> = ({ structureId, currentUser, products, type, onSave, onCancel }) => {
  const filteredProducts = products.filter(p => p.type === type);
  // Store quantities in a map: productId -> quantity
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [notes, setNotes] = useState('');
  // Now signature is just a text string for the name
  const [signature, setSignature] = useState('');

  const handleQuantityChange = (pid: string, val: number) => {
    setQuantities(prev => ({ ...prev, [pid]: val }));
  };

  const handleSubmit = () => {
    if (!signature.trim()) {
      alert("La firma (nome operatore) è obbligatoria.");
      return;
    }
    const items: InventoryItem[] = Object.entries(quantities)
      .filter(([_, q]) => q > 0)
      .map(([pid, q]) => ({ productId: pid, quantity: q }));

    if (items.length === 0) {
      alert("Inserisci almeno una quantità.");
      return;
    }

    onSave({
      id: `inv-${Date.now()}`,
      structureId,
      operatorId: currentUser.id,
      date: new Date().toISOString(),
      items,
      signatureUrl: signature, // Stores the text name
      notes,
      type
    });
  };

  return (
    <div className="max-w-2xl mx-auto bg-white p-6 rounded-xl shadow-lg">
       <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
         {type === 'PRODUCT' ? <Box className="text-emerald-600" /> : <Shirt className="text-indigo-600" />}
         Nuovo Inventario {type === 'PRODUCT' ? 'Prodotti' : 'Biancheria'}
       </h2>

       <div className="space-y-4 mb-6 max-h-[400px] overflow-y-auto pr-2">
         {filteredProducts.map(p => (
           <div key={p.id} className="flex justify-between items-center p-3 hover:bg-gray-50 rounded border-b border-gray-100">
              <div>
                 <p className="font-medium text-gray-800">{p.name}</p>
                 <p className="text-xs text-gray-400">{p.category}</p>
              </div>
              <div className="flex items-center gap-2">
                 <input 
                   type="number" 
                   min="0"
                   className="w-20 border rounded p-2 text-center font-mono"
                   value={quantities[p.id] || ''}
                   onChange={e => handleQuantityChange(p.id, parseInt(e.target.value) || 0)}
                   placeholder="0"
                 />
                 <span className="text-sm text-gray-500 w-8">{p.unit}</span>
              </div>
           </div>
         ))}
       </div>

       <textarea 
         className="w-full border p-3 rounded-lg mb-6 text-sm" 
         rows={3} 
         placeholder="Note aggiuntive..." 
         value={notes} 
         onChange={e => setNotes(e.target.value)}
       />

       <div className="mb-6">
         <label className="block text-sm font-bold text-gray-700 mb-2">Firma Operatore (Scrivi il tuo nome)</label>
         <input
            type="text"
            className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none transition"
            placeholder="Es. Mario Rossi"
            value={signature}
            onChange={(e) => setSignature(e.target.value)}
         />
       </div>

       <div className="flex gap-3 pt-4 border-t">
          <button onClick={handleSubmit} className="flex-1 bg-emerald-600 text-white py-3 rounded-lg font-bold hover:bg-emerald-700 transition">Salva Inventario</button>
          <button onClick={onCancel} className="px-6 py-3 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 font-medium">Annulla</button>
       </div>
    </div>
  );
};

const NewOrderView: React.FC<{
  structureId: string;
  currentUser: User;
  products: Product[];
  inventories: InventoryReport[];
  type: ItemType;
  onSave: (ord: any) => void;
  onCancel: () => void;
}> = ({ structureId, currentUser, products, inventories, type, onSave, onCancel }) => {
  const filteredProducts = products.filter(p => p.type === type);
  const [quantities, setQuantities] = useState<Record<string, number>>({});

  const handleSubmit = () => {
    const items: InventoryItem[] = Object.entries(quantities)
      .filter(([_, q]) => q > 0)
      .map(([pid, q]) => ({ productId: pid, quantity: q }));

    if (items.length === 0) {
       alert("Seleziona almeno un prodotto.");
       return;
    }

    onSave({
      id: `ord-${Date.now()}`,
      structureId,
      requesterId: currentUser.id,
      dateCreated: new Date().toISOString(),
      status: OrderStatus.PENDING,
      items,
      type
    });
  };

  return (
    <div className="max-w-2xl mx-auto bg-white p-6 rounded-xl shadow-lg">
      <h2 className="text-2xl font-bold mb-2 flex items-center gap-2">
        <ShoppingCart className="text-orange-500" /> Ordina {type === 'PRODUCT' ? 'Forniture' : 'Biancheria'}
      </h2>
      <p className="text-gray-500 mb-6">Seleziona gli articoli necessari per il riassortimento.</p>

      <div className="space-y-3 mb-8 max-h-[500px] overflow-y-auto">
        {filteredProducts.map(p => (
          <div key={p.id} className="flex justify-between items-center p-3 border rounded-lg hover:border-orange-300 transition-colors">
             <span className="font-medium">{p.name}</span>
             <div className="flex items-center gap-2">
                <input 
                  type="number"
                  min="0"
                  className="w-20 border p-2 rounded text-center"
                  placeholder="0"
                  value={quantities[p.id] || ''}
                  onChange={e => setQuantities({...quantities, [p.id]: parseInt(e.target.value) || 0})}
                />
                <span className="text-gray-400 text-sm w-8">{p.unit}</span>
             </div>
          </div>
        ))}
      </div>
      
      <div className="flex gap-3">
        <button onClick={handleSubmit} className="flex-1 bg-orange-600 text-white py-3 rounded-lg font-bold hover:bg-orange-700">Invia Ordine</button>
        <button onClick={onCancel} className="px-6 bg-gray-100 text-gray-700 rounded-lg font-medium">Annulla</button>
      </div>
    </div>
  );
};

const NewDamageReportView: React.FC<{
  structureId: string;
  currentUser: User;
  products: Product[];
  type: ItemType;
  onSave: (rep: any) => void;
  onCancel: () => void;
}> = ({ structureId, currentUser, products, type, onSave, onCancel }) => {
   const [notes, setNotes] = useState('');
   
   const handleSubmit = () => {
      if (!notes) {
        alert("Descrivi il problema.");
        return;
      }
      onSave({
        id: `dmg-${Date.now()}`,
        structureId,
        reporterId: currentUser.id,
        date: new Date().toISOString(),
        items: [], // For simplicity, just text report for now or can add item selector
        notes,
        status: 'OPEN'
      });
   };

   return (
     <div className="max-w-xl mx-auto bg-white p-6 rounded-xl shadow-lg">
        <h2 className="text-2xl font-bold text-red-600 mb-4 flex items-center gap-2"><AlertTriangle /> Segnala Problema</h2>
        <p className="mb-4 text-gray-600">Descrivi il guasto o l'oggetto danneggiato/mancante.</p>
        <textarea 
          className="w-full border p-4 rounded-lg h-40 mb-6 focus:ring-2 focus:ring-red-200 outline-none"
          placeholder="Esempio: La lampada sul comodino destro è rotta..."
          value={notes}
          onChange={e => setNotes(e.target.value)}
        />
        <div className="flex gap-3">
          <button onClick={handleSubmit} className="flex-1 bg-red-600 text-white py-3 rounded-lg font-bold hover:bg-red-700">Invia Segnalazione</button>
          <button onClick={onCancel} className="px-6 bg-gray-100 text-gray-700 rounded-lg font-medium">Annulla</button>
        </div>
     </div>
   );
};

const ManageOrdersView: React.FC<{
  orders: Order[];
  structures: Structure[];
  products: Product[];
  users: User[];
  currentUser: User;
  targetType: ItemType;
  onUpdateOrder: (o: Order) => void;
  onDeleteOrder: (id: string) => void;
}> = ({ orders, structures, products, users, currentUser, targetType, onUpdateOrder, onDeleteOrder }) => {
  const filteredOrders = orders.filter(o => o.type === targetType).sort((a,b) => new Date(b.dateCreated).getTime() - new Date(a.dateCreated).getTime());

  // Editing state for Reception/Admin
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  const [tempItems, setTempItems] = useState<InventoryItem[]>([]);

  const startEditing = (order: Order) => {
    setEditingOrderId(order.id);
    setTempItems([...order.items]);
  };

  const cancelEditing = () => {
    setEditingOrderId(null);
    setTempItems([]);
  };

  const saveEditing = (order: Order) => {
    // Filter out 0 quantities
    const finalItems = tempItems.filter(i => i.quantity > 0);
    if (finalItems.length === 0) {
      alert("L'ordine non può essere vuoto. Eliminalo se necessario.");
      return;
    }
    const updatedOrder = { ...order, items: finalItems };
    onUpdateOrder(updatedOrder);
    setEditingOrderId(null);
    setTempItems([]);
  };

  const updateTempItem = (productId: string, qty: number) => {
    setTempItems(prev => {
      const exists = prev.find(i => i.productId === productId);
      if (exists) {
        return prev.map(i => i.productId === productId ? { ...i, quantity: qty } : i);
      }
      return [...prev, { productId, quantity: qty }];
    });
  };

  const handleStatusChange = (order: Order, newStatus: OrderStatus) => {
    const updated = { 
      ...order, 
      status: newStatus,
      dateSent: newStatus === OrderStatus.SENT ? new Date().toISOString() : order.dateSent
    };
    onUpdateOrder(updated);
  };

  const canEdit = currentUser.role === Role.ADMIN || currentUser.role === Role.RECEPTION;
  const canSend = currentUser.role === Role.ADMIN || currentUser.role === Role.RECEPTION;
  
  // Operators can delete pending orders
  const canDelete = (order: Order) => {
     if (order.status !== OrderStatus.PENDING) return false;
     if (currentUser.role === Role.ADMIN || currentUser.role === Role.RECEPTION) return true;
     if (currentUser.role === Role.OPERATOR) return true; // As per requirement: "4 operatore , reception possono eliminare ordini"
     return false;
  }

  return (
    <div className="max-w-6xl mx-auto">
       <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
         {targetType === 'PRODUCT' ? <ShoppingCart /> : <Shirt />} 
         Gestione Ordini {targetType === 'PRODUCT' ? 'Prodotti' : 'Biancheria'}
       </h2>
       
       <div className="grid gap-4">
         {filteredOrders.map(order => {
           const struct = structures.find(s => s.id === order.structureId);
           const requester = users.find(u => u.id === order.requesterId);
           const isEditing = editingOrderId === order.id;

           return (
             <div key={order.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between gap-6">
                <div className="flex-1">
                   <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-bold text-lg">{struct?.name || 'Struttura sconosciuta'}</h3>
                      <span className={`text-xs px-2 py-1 rounded font-bold ${
                        order.status === OrderStatus.PENDING ? 'bg-yellow-100 text-yellow-700' :
                        order.status === OrderStatus.SENT ? 'bg-blue-100 text-blue-700' :
                        'bg-green-100 text-green-700'
                      }`}>{order.status}</span>
                   </div>
                   <p className="text-sm text-gray-500 mb-4">
                      Richiesto da {requester?.name} il {new Date(order.dateCreated).toLocaleDateString()}
                   </p>
                   
                   <div className="bg-gray-50 p-3 rounded-lg">
                      {isEditing ? (
                        <div className="space-y-2">
                          <p className="text-xs font-bold text-gray-500 mb-2">Modifica Quantità:</p>
                          {tempItems.map(item => {
                            const p = products.find(prod => prod.id === item.productId);
                            return (
                              <div key={item.productId} className="flex justify-between items-center">
                                <span>{p?.name}</span>
                                <div className="flex items-center gap-2">
                                   <input 
                                      type="number" 
                                      min="0" 
                                      className="w-16 border rounded p-1 text-center" 
                                      value={item.quantity}
                                      onChange={(e) => updateTempItem(item.productId, parseInt(e.target.value) || 0)}
                                   />
                                   <span className="text-xs text-gray-400">{p?.unit}</span>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      ) : (
                        <ul className="text-sm space-y-1">
                          {order.items.map(item => {
                             const p = products.find(prod => prod.id === item.productId);
                             return <li key={item.productId} className="flex justify-between">
                                <span>{p?.name}</span>
                                <span className="font-mono font-bold">{item.quantity} {p?.unit}</span>
                             </li>
                          })}
                        </ul>
                      )}
                   </div>
                </div>
                
                <div className="flex flex-col justify-center gap-2 min-w-[150px]">
                   {order.status === OrderStatus.PENDING ? (
                     <>
                        {isEditing ? (
                           <>
                             <button onClick={() => saveEditing(order)} className="bg-emerald-600 text-white py-2 rounded hover:bg-emerald-700 transition flex items-center justify-center gap-1">
                               <Save size={16}/> Salva
                             </button>
                             <button onClick={cancelEditing} className="bg-gray-200 text-gray-700 py-2 rounded hover:bg-gray-300 transition flex items-center justify-center gap-1">
                               <XCircle size={16}/> Annulla
                             </button>
                           </>
                        ) : (
                           <>
                             {/* Reception/Admin Action: Send to Supplier */}
                             {canSend && (
                               <button onClick={() => handleStatusChange(order, OrderStatus.SENT)} className="bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition flex items-center justify-center gap-2">
                                  <Send size={16} /> {order.type === 'LINEN' ? 'Invia in Lavanderia' : 'Approva e Invia'}
                                </button>
                             )}
                             
                             {/* Reception/Admin Action: Modify before sending */}
                             {canEdit && (
                               <button onClick={() => startEditing(order)} className="border border-gray-300 text-gray-700 py-2 rounded hover:bg-gray-50 transition flex items-center justify-center gap-2">
                                  <Edit size={16} /> Modifica
                               </button>
                             )}

                             {/* Delete Action: Operator/Reception/Admin */}
                             {canDelete(order) && (
                               <button onClick={() => onDeleteOrder(order.id)} className="border border-red-200 text-red-600 py-2 rounded hover:bg-red-50 transition flex items-center justify-center gap-2">
                                  <Trash2 size={16} /> Elimina
                               </button>
                             )}
                           </>
                        )}
                     </>
                   ) : (
                     /* Logic for SENT orders */
                     <>
                       {order.status === OrderStatus.SENT && canSend && (
                         <button onClick={() => handleStatusChange(order, OrderStatus.DELIVERED)} className="bg-green-600 text-white py-2 rounded hover:bg-green-700 transition">
                            Segna Consegnato
                         </button>
                       )}
                     </>
                   )}
                </div>
             </div>
           );
         })}
         {filteredOrders.length === 0 && (
           <div className="text-center py-10 bg-white rounded-xl text-gray-400">Nessun ordine trovato.</div>
         )}
       </div>
    </div>
  );
};

const SupplierDashboardView: React.FC<{
  orders: Order[];
  structures: Structure[];
  products: Product[];
  users: User[];
}> = ({ orders, structures, products, users }) => {
  const [activeTab, setActiveTab] = useState<'orders' | 'access'>('orders');

  // Only show PRODUCT orders to supplier (Alfonso), exclude LINEN
  const myOrders = orders.filter(o => o.status !== OrderStatus.PENDING && o.type === 'PRODUCT');

  return (
    <div className="max-w-6xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">Pannello Fornitore</h2>
      
      {/* TABS */}
      <div className="flex gap-6 border-b mb-6">
        <button 
          onClick={() => setActiveTab('orders')}
          className={`pb-3 px-1 font-medium transition ${activeTab === 'orders' ? 'text-emerald-600 border-b-2 border-emerald-600' : 'text-gray-500 hover:text-gray-700'}`}
        >
          Ordini Ricevuti
        </button>
        <button 
          onClick={() => setActiveTab('access')}
          className={`pb-3 px-1 font-medium transition ${activeTab === 'access' ? 'text-emerald-600 border-b-2 border-emerald-600' : 'text-gray-500 hover:text-gray-700'}`}
        >
          Codici Accesso Strutture
        </button>
      </div>

      {activeTab === 'orders' ? (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="p-4">Data</th>
                <th className="p-4">Struttura</th>
                <th className="p-4">Articoli</th>
                <th className="p-4">Stato</th>
              </tr>
            </thead>
            <tbody>
              {myOrders.map(order => {
                const struct = structures.find(s => s.id === order.structureId);
                return (
                  <tr key={order.id} className="border-b">
                    <td className="p-4">{new Date(order.dateCreated).toLocaleDateString()}</td>
                    <td className="p-4">{struct?.name}</td>
                    <td className="p-4">
                      <ul className="list-disc pl-4 text-sm">
                        {order.items.map((item, idx) => {
                           const prod = products.find(p => p.id === item.productId);
                           return <li key={idx}>{prod?.name}: {item.quantity} {prod?.unit}</li>
                        })}
                      </ul>
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded text-xs font-bold ${order.status === 'DELIVERED' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                        {order.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {myOrders.length === 0 && (
                  <tr><td colSpan={4} className="p-8 text-center text-gray-500">Nessun ordine assegnato.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {structures.map(struct => (
             <div key={struct.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="h-32 bg-gray-200 relative">
                   <img src={struct.imageUrl || `https://picsum.photos/seed/${struct.id}/800/400`} alt={struct.name} className="w-full h-full object-cover"/>
                   <div className="absolute inset-0 bg-black/30 flex items-end p-4">
                      <h3 className="text-white font-bold text-lg shadow-black drop-shadow-md">{struct.name}</h3>
                   </div>
                </div>
                <div className="p-5">
                   <p className="text-gray-500 text-sm mb-4 flex items-center gap-2"><MapPin size={16}/> {struct.address}</p>
                   <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-3 flex items-start gap-3">
                      <div className="bg-white p-2 rounded-full text-emerald-600 shadow-sm">
                        <Key size={18} />
                      </div>
                      <div>
                        <p className="text-xs text-emerald-600 font-bold uppercase mb-1">Codici d'ingresso</p>
                        <p className="font-mono text-lg text-gray-800 select-all font-medium">{struct.accessCodes}</p>
                      </div>
                   </div>
                </div>
             </div>
          ))}
          {structures.length === 0 && <p className="text-gray-500">Nessuna struttura disponibile.</p>}
        </div>
      )}
    </div>
  );
};

const DashboardView: React.FC<{
  structures: Structure[];
  onSelectStructure: (id: string) => void;
  onAddStructure: (s: any) => Promise<void>;
  onUpdateImage: (id: string, url: string) => Promise<void>;
  role: Role;
  pendingOrdersCount: number;
  onNavigateToOrders: () => void;
}> = ({ structures, onSelectStructure, onAddStructure, onUpdateImage, role, pendingOrdersCount, onNavigateToOrders }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newStruct, setNewStruct] = useState({ name: '', address: '', accessCodes: '' });

  const handleAdd = async () => {
    if(!newStruct.name || !newStruct.address) return;
    await onAddStructure({
      id: `s-${Date.now()}`,
      ...newStruct,
      imageUrl: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=800&q=80' // default
    });
    setIsAdding(false);
    setNewStruct({ name: '', address: '', accessCodes: '' });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, id: string) => {
    const file = e.target.files?.[0];
    if (file) {
       const reader = new FileReader();
       reader.onloadend = () => {
          onUpdateImage(id, reader.result as string);
       };
       reader.readAsDataURL(file);
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Zone e Strutture</h1>
          <p className="text-gray-500 mt-1">Gestisci le proprietà e monitora lo stato.</p>
        </div>
        {role === Role.ADMIN && (
          <button onClick={() => setIsAdding(true)} className="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 flex items-center gap-2 transition shadow-sm">
            <Plus size={20} /> Aggiungi Struttura
          </button>
        )}
      </div>

      {pendingOrdersCount > 0 && (
         <div onClick={onNavigateToOrders} className="cursor-pointer bg-orange-50 border border-orange-200 p-4 rounded-xl mb-8 flex items-center justify-between hover:bg-orange-100 transition shadow-sm">
            <div className="flex items-center gap-3">
               <div className="bg-orange-100 p-2 rounded-full text-orange-600">
                  <ShoppingCart size={24} />
               </div>
               <div>
                  <h3 className="font-bold text-orange-800">Ci sono ordini in attesa!</h3>
                  <p className="text-orange-700 text-sm">Hai {pendingOrdersCount} richieste da approvare.</p>
               </div>
            </div>
            <div className="bg-white px-4 py-2 rounded-lg text-orange-600 font-bold text-sm shadow-sm">Vedi Ordini</div>
         </div>
      )}

      {isAdding && (
         <div className="bg-white p-6 rounded-xl shadow-lg mb-8 border border-emerald-100 animate-fade-in-down">
            <h3 className="font-bold text-lg mb-4">Nuova Struttura</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
               <input placeholder="Nome struttura" className="border p-2 rounded" value={newStruct.name} onChange={e => setNewStruct({...newStruct, name: e.target.value})} />
               <input placeholder="Indirizzo" className="border p-2 rounded" value={newStruct.address} onChange={e => setNewStruct({...newStruct, address: e.target.value})} />
               <input placeholder="Codici Accesso" className="border p-2 rounded" value={newStruct.accessCodes} onChange={e => setNewStruct({...newStruct, accessCodes: e.target.value})} />
            </div>
            <div className="flex justify-end gap-2">
               <button onClick={() => setIsAdding(false)} className="px-4 py-2 text-gray-500 hover:bg-gray-100 rounded">Annulla</button>
               <button onClick={handleAdd} className="px-4 py-2 bg-emerald-600 text-white rounded font-bold">Salva</button>
            </div>
         </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {structures.map(structure => (
          <div key={structure.id} className="group bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 overflow-hidden cursor-pointer" onClick={() => onSelectStructure(structure.id)}>
             <div className="h-48 bg-gray-200 relative overflow-hidden">
                <img 
                  src={structure.imageUrl || `https://picsum.photos/seed/${structure.id}/800/600`} 
                  alt={structure.name} 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-6">
                   <h3 className="text-white font-bold text-xl drop-shadow-md">{structure.name}</h3>
                </div>
                {role === Role.ADMIN && (
                   <label className="absolute top-2 right-2 bg-white/90 p-2 rounded-full cursor-pointer hover:bg-white transition" onClick={e => e.stopPropagation()}>
                      <ImageIcon size={16} className="text-gray-600" />
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, structure.id)} />
                   </label>
                )}
             </div>
             <div className="p-6">
                <div className="flex items-start gap-3 mb-4 text-gray-500">
                   <MapPin size={18} className="mt-1 flex-shrink-0 text-emerald-500" />
                   <p className="text-sm leading-relaxed">{structure.address}</p>
                </div>
                <div className="flex justify-between items-center border-t border-gray-100 pt-4 mt-2">
                   <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Gestisci</span>
                   <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                      <Users size={16} />
                   </div>
                </div>
             </div>
          </div>
        ))}
        {structures.length === 0 && (
           <div className="col-span-full text-center py-20 text-gray-400 bg-white rounded-2xl border border-dashed border-gray-300">
              <Building2 size={48} className="mx-auto mb-4 opacity-50" />
              <p>Nessuna struttura presente. Aggiungine una per iniziare.</p>
           </div>
        )}
      </div>
    </div>
  );
};

const UserManagementView: React.FC<{
  users: User[];
  setUsers: (u: User[]) => void;
  onAddUser: (u: any) => Promise<void>;
  onDeleteUser: (id: string) => Promise<void>;
}> = ({ users, onAddUser, onDeleteUser }) => {
   const [newUser, setNewUser] = useState({ name: '', email: '', role: Role.OPERATOR, password: '' });

   const handleAdd = async () => {
      if(!newUser.name || !newUser.email || !newUser.password) return;
      await onAddUser({ id: `u-${Date.now()}`, ...newUser });
      setNewUser({ name: '', email: '', role: Role.OPERATOR, password: '' });
   };

   return (
      <div className="max-w-4xl mx-auto">
         <h2 className="text-2xl font-bold mb-6 flex items-center gap-2"><Users /> Gestione Utenti</h2>

         <div className="bg-white p-6 rounded-xl shadow-sm mb-8 border border-gray-100">
            <h3 className="font-bold mb-4">Aggiungi Utente</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
               <input placeholder="Nome" className="border p-2 rounded" value={newUser.name} onChange={e => setNewUser({...newUser, name: e.target.value})} />
               <input placeholder="Email" className="border p-2 rounded" value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})} />
               <input placeholder="Password" type="password" className="border p-2 rounded" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} />
               <select className="border p-2 rounded" value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value as Role})}>
                  {Object.values(Role).map(r => <option key={r} value={r}>{r}</option>)}
               </select>
            </div>
            <button onClick={handleAdd} className="bg-emerald-600 text-white px-4 py-2 rounded font-bold hover:bg-emerald-700 w-full md:w-auto">Aggiungi</button>
         </div>

         <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <table className="w-full text-left">
               <thead className="bg-gray-50 border-b">
                  <tr>
                     <th className="p-4">Nome</th>
                     <th className="p-4">Email</th>
                     <th className="p-4">Ruolo</th>
                     <th className="p-4 w-20">Azioni</th>
                  </tr>
               </thead>
               <tbody>
                  {users.map(u => (
                     <tr key={u.id} className="border-b last:border-0 hover:bg-gray-50">
                        <td className="p-4 font-medium">{u.name}</td>
                        <td className="p-4 text-gray-500">{u.email}</td>
                        <td className="p-4"><span className="bg-gray-100 px-2 py-1 rounded text-xs font-bold">{u.role}</span></td>
                        <td className="p-4 text-center">
                           <button onClick={() => onDeleteUser(u.id)} className="text-red-500 hover:bg-red-50 p-2 rounded"><Trash2 size={18} /></button>
                        </td>
                     </tr>
                  ))}
               </tbody>
            </table>
         </div>
      </div>
   );
};

const ProductManagementView: React.FC<{
  products: Product[];
  setProducts: (p: Product[]) => void;
  onAddProduct: (p: any) => Promise<void>;
  onDeleteProduct: (id: string) => Promise<void>;
}> = ({ products, onAddProduct, onDeleteProduct }) => {
   const [newProd, setNewProd] = useState<Partial<Product>>({ name: '', category: 'CLEANING', unit: 'Pz', type: 'PRODUCT' });

   const handleAdd = async () => {
      if(!newProd.name) return;
      await onAddProduct({ id: `p-${Date.now()}`, ...newProd });
      setNewProd({ name: '', category: 'CLEANING', unit: 'Pz', type: 'PRODUCT' });
   };

   return (
      <div className="max-w-4xl mx-auto">
         <h2 className="text-2xl font-bold mb-6 flex items-center gap-2"><Box /> Catalogo Prodotti</h2>

         <div className="bg-white p-6 rounded-xl shadow-sm mb-8 border border-gray-100">
            <h3 className="font-bold mb-4">Nuovo Prodotto</h3>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
               <input placeholder="Nome Prodotto" className="border p-2 rounded col-span-2" value={newProd.name} onChange={e => setNewProd({...newProd, name: e.target.value})} />
               <select className="border p-2 rounded" value={newProd.category} onChange={e => setNewProd({...newProd, category: e.target.value as any})}>
                  <option value="CLEANING">Pulizia</option>
                  <option value="FOOD">Cibo/Bevande</option>
                  <option value="AMENITIES">Amenities</option>
                  <option value="LINEN_BED">Biancheria Letto</option>
                  <option value="LINEN_BATH">Biancheria Bagno</option>
                  <option value="OTHER">Altro</option>
               </select>
               <select className="border p-2 rounded" value={newProd.type} onChange={e => setNewProd({...newProd, type: e.target.value as any})}>
                  <option value="PRODUCT">Consumabile</option>
                  <option value="LINEN">Biancheria</option>
               </select>
               <input placeholder="Unità (es. Pz, Lt)" className="border p-2 rounded" value={newProd.unit} onChange={e => setNewProd({...newProd, unit: e.target.value})} />
            </div>
            <button onClick={handleAdd} className="bg-emerald-600 text-white px-4 py-2 rounded font-bold hover:bg-emerald-700 w-full md:w-auto">Aggiungi a Catalogo</button>
         </div>

         <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <table className="w-full text-left">
               <thead className="bg-gray-50 border-b">
                  <tr>
                     <th className="p-4">Prodotto</th>
                     <th className="p-4">Categoria</th>
                     <th className="p-4">Tipo</th>
                     <th className="p-4">Unità</th>
                     <th className="p-4 w-20">Azioni</th>
                  </tr>
               </thead>
               <tbody>
                  {products.map(p => (
                     <tr key={p.id} className="border-b last:border-0 hover:bg-gray-50">
                        <td className="p-4 font-medium">{p.name}</td>
                        <td className="p-4 text-sm text-gray-500">{p.category}</td>
                        <td className="p-4"><span className={`px-2 py-1 rounded text-xs font-bold ${p.type === 'LINEN' ? 'bg-indigo-100 text-indigo-700' : 'bg-green-100 text-green-700'}`}>{p.type}</span></td>
                        <td className="p-4 text-sm text-gray-500">{p.unit}</td>
                        <td className="p-4 text-center">
                           <button onClick={() => onDeleteProduct(p.id)} className="text-red-500 hover:bg-red-50 p-2 rounded"><Trash2 size={18} /></button>
                        </td>
                     </tr>
                  ))}
               </tbody>
            </table>
         </div>
      </div>
   );
};

export default App;
