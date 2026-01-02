import React, { useState, useMemo, useEffect } from 'react';
import { 
  Building2, Box, Users, ShoppingCart, LogOut, Menu, X, 
  Plus, Edit, Trash2, Camera, Check, Send, AlertCircle, FileText, Search,
  Clock, Bell, Truck, MapPin, Save, XCircle, Mail, Shirt, AlertTriangle, UserCheck, Loader, RefreshCw, Database, Image as ImageIcon, Minus, Key, Wrench, CheckCircle2, Download, ClipboardList, Calendar
} from 'lucide-react';
import { 
  Role, User, Product, Structure, InventoryReport, Order, 
  OrderStatus, InventoryItem, ItemType, DamageReport, LinenIssueReport, LinenIssueItem 
} from './types';
import { analyzeInventoryImage } from './services/geminiService';
import { supabase } from './supabaseClient';

// --- Helpers to map snake_case (DB) to camelCase (App) ---

const mapUser = (u: any): User => ({
  id: u.id, name: u.name, email: u.email, role: u.role as Role, password: u.password
});

const mapStructure = (s: any): Structure => ({
  id: s.id, name: s.name, address: s.address, accessCodes: s.access_codes, imageUrl: s.image_url
});

const mapProduct = (p: any): Product => ({
  id: p.id, name: p.name, category: p.category, unit: p.unit, type: p.type
});

const mapInventory = (i: any): InventoryReport => ({
  id: i.id, structureId: i.structure_id, operatorId: i.operator_id, date: i.date, items: i.items, signatureUrl: i.signature_url, photoUrl: i.photo_url, notes: i.notes, type: i.type
});

const mapOrder = (o: any): Order => ({
  id: o.id, structureId: o.structure_id, requesterId: o.requester_id, dateCreated: o.date_created, dateSent: o.date_sent, sentToEmail: o.sent_to_email, items: o.items, status: o.status, type: o.type
});

const mapDamageReport = (d: any): DamageReport => ({
  id: d.id, structureId: d.structure_id, reporterId: d.reporter_id, date: d.date, items: d.items, notes: d.notes, status: d.status
});

const mapLinenReport = (l: any): LinenIssueReport => ({
  id: l.id, structureId: l.structure_id, reporterId: l.reporter_id, date: l.date, items: l.items, notes: l.notes
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
  const [linenReports, setLinenReports] = useState<LinenIssueReport[]>([]);

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
       const [resUsers, resProds, resStructs, resInv, resOrd, resDmg, resLinen] = await Promise.all([
         supabase.from('users').select('*'),
         supabase.from('products').select('*'),
         supabase.from('structures').select('*'),
         supabase.from('inventories').select('*'),
         supabase.from('orders').select('*'),
         supabase.from('damage_reports').select('*'),
         supabase.from('linen_reports').select('*') // Assuming table exists
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

       if (!resLinen.error) {
         setLinenReports(resLinen.data.map(mapLinenReport));
       }

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
                  onLinenIssue={() => setCurrentView('linen-issue-new')}
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
                     id: ord.id, structure_id: ord.structureId, requester_id: ord.requesterId,
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
      case 'linen-issue-new':
        return <NewLinenIssueView
                structureId={selectedStructureId!}
                currentUser={currentUser}
                products={products}
                onSave={async (rep) => {
                   const { data, error } = await supabase.from('linen_reports').insert({
                      id: rep.id, structure_id: rep.structureId, reporter_id: rep.reporterId,
                      date: rep.date, items: rep.items, notes: rep.notes
                   }).select().single();
                   if(!error && data) {
                     setLinenReports([...linenReports, mapLinenReport(data)]);
                     setCurrentView('structure-detail');
                   }
                }}
                onCancel={() => setCurrentView('structure-detail')}
              />;
      case 'linen-issue-log':
         return <LinenIssuesLogView 
                  reports={linenReports}
                  structures={structures}
                  products={products}
                  users={users}
                  onUpdateReport={async (updated) => {
                     // Simplified edit: just re-save
                     const { error } = await supabase.from('linen_reports').update({
                       items: updated.items, notes: updated.notes
                     }).eq('id', updated.id);
                     if (!error) {
                        setLinenReports(prev => prev.map(r => r.id === updated.id ? updated : r));
                     }
                  }}
                  onDeleteReport={async (id) => {
                     const { error } = await supabase.from('linen_reports').delete().eq('id', id);
                     if(!error) setLinenReports(prev => prev.filter(r => r.id !== id));
                  }}
                />;
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
                  <div className="pt-4 pb-2 text-xs text-slate-500 uppercase font-bold tracking-wider">Operatività</div>
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
                   <NavItem 
                    icon={<ClipboardList size={20} />} 
                    label="Log Biancheria Sporca" 
                    active={currentView === 'linen-issue-log'} 
                    onClick={() => { setCurrentView('linen-issue-log'); setIsMenuOpen(false); }} 
                  />
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
  onLinenIssue: () => void;
  onEditStructure: (s: Structure) => void;
  onResolveDamage: (id: string) => void;
  onDeleteDamage: (id: string) => void;
}> = ({
  structureId, currentUser, inventories, orders, products, structures, users, damageReports,
  onBack, onNewInventory, onRequestOrder, onReportDamage, onLinenIssue, onEditStructure, onResolveDamage, onDeleteDamage
}) => {
  const structure = structures.find(s => s.id === structureId);
  const [activeTab, setActiveTab] = useState<'info' | 'inventory' | 'orders' | 'damages'>('info');
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Structure | null>(null);
  
  // Date filters for Inventory Tab
  const [invStartDate, setInvStartDate] = useState('');
  const [invEndDate, setInvEndDate] = useState('');

  useEffect(() => {
    if (structure) setEditForm(structure);
  }, [structure]);

  const structInventories = useMemo(() => {
    let res = inventories.filter(i => i.structureId === structureId);
    if (invStartDate) {
      res = res.filter(i => new Date(i.date) >= new Date(invStartDate));
    }
    if (invEndDate) {
       const end = new Date(invEndDate);
       end.setHours(23, 59, 59, 999);
       res = res.filter(i => new Date(i.date) <= end);
    }
    return res.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [inventories, structureId, invStartDate, invEndDate]);

  if (!structure) return <div>Struttura non trovata</div>;

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
             {/* Inventario Prodotti */}
             <div onClick={() => onNewInventory('PRODUCT')} className="cursor-pointer bg-emerald-50 border border-emerald-100 p-6 rounded-xl hover:shadow-md transition">
                <div className="bg-white w-12 h-12 rounded-full flex items-center justify-center text-emerald-600 mb-3 shadow-sm"><Box /></div>
                <h3 className="font-bold text-lg text-emerald-900">Inventario Prodotti</h3>
                <p className="text-emerald-700 text-sm">Controlla e registra i consumabili</p>
             </div>

             {/* Inventario Biancheria */}
             <div onClick={() => onNewInventory('LINEN')} className="cursor-pointer bg-indigo-50 border border-indigo-100 p-6 rounded-xl hover:shadow-md transition">
                <div className="bg-white w-12 h-12 rounded-full flex items-center justify-center text-indigo-600 mb-3 shadow-sm"><Shirt /></div>
                <h3 className="font-bold text-lg text-indigo-900">Conta Biancheria</h3>
                <p className="text-indigo-700 text-sm">Gestione lavanderia e cambi</p>
             </div>

             {/* Ordina Forniture */}
             <div onClick={() => onRequestOrder('PRODUCT')} className="cursor-pointer bg-orange-50 border border-orange-100 p-6 rounded-xl hover:shadow-md transition">
                <div className="bg-white w-12 h-12 rounded-full flex items-center justify-center text-orange-600 mb-3 shadow-sm"><ShoppingCart /></div>
                <h3 className="font-bold text-lg text-orange-900">Ordina Forniture</h3>
                <p className="text-orange-700 text-sm">Richiedi prodotti mancanti</p>
             </div>

             {/* Ordina Biancheria */}
             <div onClick={() => onRequestOrder('LINEN')} className="cursor-pointer bg-sky-50 border border-sky-100 p-6 rounded-xl hover:shadow-md transition">
                <div className="bg-white w-12 h-12 rounded-full flex items-center justify-center text-sky-600 mb-3 shadow-sm"><Shirt /></div>
                <h3 className="font-bold text-lg text-sky-900">Ordina Biancheria</h3>
                <p className="text-sky-700 text-sm">Richiedi set biancheria</p>
             </div>
             
             {/* Biancheria Sporca/Rotta */}
             <div onClick={onLinenIssue} className="cursor-pointer bg-purple-50 border border-purple-100 p-6 rounded-xl hover:shadow-md transition">
                <div className="bg-white w-12 h-12 rounded-full flex items-center justify-center text-purple-600 mb-3 shadow-sm"><ClipboardList /></div>
                <h3 className="font-bold text-lg text-purple-900">Biancheria Sporca/Rotta</h3>
                <p className="text-purple-700 text-sm">Dichiara biancheria inutilizzata</p>
             </div>

             {/* Segnalazione Danni */}
             <div onClick={() => onReportDamage('PRODUCT')} className="cursor-pointer bg-red-50 border border-red-100 p-6 rounded-xl hover:shadow-md transition">
                <div className="bg-white w-12 h-12 rounded-full flex items-center justify-center text-red-600 mb-3 shadow-sm"><AlertTriangle /></div>
                <h3 className="font-bold text-lg text-red-900">Segnala Guasto</h3>
                <p className="text-red-700 text-sm">Manutenzione e danni</p>
             </div>
          </div>
        )}

        {activeTab === 'inventory' && (
          <div className="space-y-4">
             {/* Filters */}
             <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 mb-4 flex flex-wrap gap-4 items-end">
               <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">Da:</label>
                  <input type="date" className="border p-2 rounded text-sm" value={invStartDate} onChange={e => setInvStartDate(e.target.value)} />
               </div>
               <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">A:</label>
                  <input type="date" className="border p-2 rounded text-sm" value={invEndDate} onChange={e => setInvEndDate(e.target.value)} />
               </div>
               {(invStartDate || invEndDate) && (
                 <button onClick={() => {setInvStartDate(''); setInvEndDate('');}} className="text-sm text-gray-500 underline pb-2">Resetta</button>
               )}
            </div>

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
            {structInventories.length === 0 && <p className="text-gray-400 text-center py-8">Nessun inventario registrato {invStartDate && 'in questo periodo'}.</p>}
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
