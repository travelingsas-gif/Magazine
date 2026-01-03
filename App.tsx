
import React, { useState, useMemo, useEffect } from 'react';
import { 
  Building2, Box, ShoppingCart, LogOut, Menu, X, 
  Plus, Send, AlertCircle, Clock, Bell, Truck, MapPin, 
  RefreshCw, Shirt, AlertTriangle, UserCheck, Loader, 
  Download, Trash, CheckCircle2, History, Minus, Key, Calendar, Save
} from 'lucide-react';
import { 
  Role, User, Product, Structure, InventoryReport, Order, 
  OrderStatus, InventoryItem, ItemType, DamageReport, UnusedLinenReport 
} from './types';
import { supabase } from './supabaseClient';

// --- Mapping Helpers (DB -> App) ---
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
  id: i.id, structureId: i.structure_id, operatorId: i.operator_id, date: i.date, 
  items: i.items, signatureUrl: i.signature_url, photoUrl: i.photo_url, notes: i.notes, type: i.type 
});
const mapOrder = (o: any): Order => ({ 
  id: o.id, structureId: o.structure_id, requesterId: o.requester_id, 
  dateCreated: o.date_created, dateSent: o.date_sent, sentToEmail: o.sent_to_email, 
  items: o.items, status: o.status as OrderStatus, type: o.type as ItemType, signatureUrl: o.signature_url 
});
const mapDamageReport = (d: any): DamageReport => ({ 
  id: d.id, structureId: d.structure_id, reporterId: d.reporter_id, 
  date: d.date, items: d.items, notes: d.notes, status: d.status 
});
const mapUnusedLinen = (l: any): UnusedLinenReport => ({ 
  id: l.id, structureId: l.structure_id, operatorId: l.operator_id, date: l.date, 
  dirtyItems: l.dirty_items || [], unusedItems: l.unused_items || [], 
  brokenItems: l.broken_items || [], notes: l.notes, signatureUrl: l.signature_url 
});

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<User[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [structures, setStructures] = useState<Structure[]>([]);
  const [inventories, setInventories] = useState<InventoryReport[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [damageReports, setDamageReports] = useState<DamageReport[]>([]);
  const [unusedLinenReports, setUnusedLinenReports] = useState<UnusedLinenReport[]>([]);

  const [currentView, setCurrentView] = useState<string>('login');
  const [selectedStructureId, setSelectedStructureId] = useState<string | null>(null);
  const [activeItemType, setActiveItemType] = useState<ItemType>('PRODUCT'); 
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Modal State
  const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean, title: string, message: string, onConfirm: () => void } | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
       const [resUsers, resProds, resStructs, resInv, resOrd, resDmg, resLin] = await Promise.all([
         supabase.from('users').select('*'),
         supabase.from('products').select('*'),
         supabase.from('structures').select('*'),
         supabase.from('inventories').select('*'),
         supabase.from('orders').select('*'),
         supabase.from('damage_reports').select('*'),
         supabase.from('unused_linen_reports').select('*')
       ]);

       if (resUsers.error) throw resUsers.error;
       setUsers(resUsers.data.map(mapUser));
       if (resProds.error) throw resProds.error;
       setProducts(resProds.data.map(mapProduct));
       if (resStructs.error) throw resStructs.error;
       setStructures(resStructs.data.map(mapStructure));
       if (resInv.data) setInventories(resInv.data.map(mapInventory));
       if (resOrd.data) setOrders(resOrd.data.map(mapOrder));
       if (resDmg.data) setDamageReports(resDmg.data.map(mapDamageReport));
       if (resLin.data) setUnusedLinenReports(resLin.data.map(mapUnusedLinen));

    } catch (err: any) {
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleLogin = (email: string, pass: string) => {
    const user = users.find(u => u.email === email && u.password === pass);
    if (user) {
      setCurrentUser(user);
      setCurrentView(user.role === Role.SUPPLIER ? 'supplier-dashboard' : 'dashboard');
    } else alert('Credenziali non valide');
  };

  const handleLogout = () => { setCurrentUser(null); setCurrentView('login'); setIsMenuOpen(false); };

  const getUnreadOrdersCount = (type?: ItemType) => {
    if (currentUser?.role === Role.RECEPTION || currentUser?.role === Role.ADMIN) {
      return orders.filter(o => o.status === OrderStatus.PENDING && (!type || o.type === type)).length;
    }
    return 0;
  };

  const openConfirm = (title: string, message: string, onConfirm: () => void) => {
    setConfirmModal({ isOpen: true, title, message, onConfirm });
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50 flex-col gap-4"><Loader className="animate-spin text-emerald-600" size={48} /><p className="font-black text-slate-800 uppercase tracking-widest text-sm">Caricamento Sistema...</p></div>;
  if (!currentUser || currentView === 'login') return <LoginView onLogin={handleLogin} />;

  const renderContent = () => {
    switch (currentView) {
      case 'dashboard':
        return <DashboardView 
                  structures={structures} 
                  onSelectStructure={(id) => { setSelectedStructureId(id); setCurrentView('structure-detail'); }}
                  role={currentUser.role}
                  pendingOrdersCount={getUnreadOrdersCount()}
                  onNavigateToOrders={() => setCurrentView('orders-products')}
                  onAddStructure={() => setCurrentView('structure-add')}
               />;
      case 'structure-add':
        return <AddStructureView 
                  onSave={async (s) => {
                    openConfirm("Nuova Struttura", `Vuoi aggiungere ${s.name}?`, async () => {
                      const { data, error } = await supabase.from('structures').insert({
                        name: s.name, address: s.address, access_codes: s.accessCodes
                      }).select().single();
                      if (!error && data) { 
                        setStructures([...structures, mapStructure(data)]); 
                        setCurrentView('dashboard'); 
                        fetchData();
                      }
                      setConfirmModal(null);
                    });
                  }}
                  onCancel={() => setCurrentView('dashboard')}
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
                  onReportDamage={() => setCurrentView('damage-report-new')}
                  onReportLinen={() => setCurrentView('unused-linen-new')}
                  onUpdateDamageStatus={async (id, status) => {
                    const { error } = await supabase.from('damage_reports').update({ status }).eq('id', id);
                    if (!error) setDamageReports(damageReports.map(d => d.id === id ? { ...d, status } : d));
                  }}
               />;
      case 'inventory-new':
        return <NewInventoryView 
                  structureId={selectedStructureId!} currentUser={currentUser} products={products} type={activeItemType}
                  onSave={async (inv) => {
                    openConfirm("Salva Inventario", "Confermi il salvataggio dei dati?", async () => {
                      const { data, error } = await supabase.from('inventories').insert({
                        structure_id: inv.structureId, operator_id: inv.operatorId,
                        date: inv.date, items: inv.items, signature_url: inv.signatureUrl, photo_url: inv.photoUrl,
                        notes: inv.notes, type: inv.type
                      }).select().single();
                      if(!error && data) { 
                        setInventories([...inventories, mapInventory(data)]); 
                        setCurrentView('structure-detail'); 
                        fetchData(); 
                      }
                      setConfirmModal(null);
                    });
                  }}
                  onCancel={() => setCurrentView('structure-detail')}
               />;
      case 'order-new':
        return <NewOrderView 
                  structureId={selectedStructureId!} currentUser={currentUser} products={products} type={activeItemType}
                  onSave={async (ord) => {
                    openConfirm("Invia Richiesta Ordine", "La richiesta verrà notificata alla Reception. Confermi?", async () => {
                      const { data, error } = await supabase.from('orders').insert({
                        structure_id: ord.structureId, requester_id: ord.requesterId,
                        date_created: ord.dateCreated, items: ord.items, status: ord.status, type: ord.type, signature_url: ord.signatureUrl
                      }).select().single();
                      if (!error && data) { 
                        setOrders([...orders, mapOrder(data)]); 
                        setCurrentView('structure-detail'); 
                        fetchData(); 
                      }
                      setConfirmModal(null);
                    });
                  }}
                  onCancel={() => setCurrentView('structure-detail')}
               />;
      case 'damage-report-new':
        return <NewDamageReportView
                structureId={selectedStructureId!} currentUser={currentUser}
                onSave={async (rep) => {
                  openConfirm("Segnala Guasto", "Vuoi confermare la segnalazione alla direzione?", async () => {
                    const { data, error } = await supabase.from('damage_reports').insert({
                       structure_id: rep.structureId, reporter_id: rep.reporterId,
                       date: rep.date, items: rep.items, notes: rep.notes, status: rep.status
                    }).select().single();
                    if(!error && data) { 
                      setDamageReports([...damageReports, mapDamageReport(data)]); 
                      setCurrentView('structure-detail'); 
                      fetchData(); 
                    }
                    setConfirmModal(null);
                  });
                }}
                onCancel={() => setCurrentView('structure-detail')}
              />;
      case 'unused-linen-new':
        return <NewUnusedLinenView 
                structureId={selectedStructureId!} currentUser={currentUser} products={products}
                onSave={async (rep) => {
                  openConfirm("Salva Report Biancheria", "Tutti i dati verranno salvati nello storico. Confermi?", async () => {
                    const { data, error } = await supabase.from('unused_linen_reports').insert({
                      structure_id: rep.structureId, operator_id: rep.operatorId,
                      date: rep.date, dirty_items: rep.dirtyItems, unused_items: rep.unusedItems, broken_items: rep.brokenItems,
                      notes: rep.notes, signature_url: rep.signatureUrl
                    }).select().single();
                    if (!error && data) { 
                      setUnusedLinenReports([...unusedLinenReports, mapUnusedLinen(data)]); 
                      setCurrentView('structure-detail'); 
                      fetchData(); 
                    }
                    setConfirmModal(null);
                  });
                }}
                onCancel={() => setCurrentView('structure-detail')}
              />;
      case 'admin-linen-summary':
        return <AdminLinenSummaryView reports={unusedLinenReports} products={products} structures={structures} users={users} onBack={() => setCurrentView('dashboard')} />;
      case 'orders-products': 
        return <ManageOrdersView orders={orders} structures={structures} products={products} users={users} currentUser={currentUser} targetType="PRODUCT" onUpdateOrder={async (o) => { await supabase.from('orders').update({ items: o.items, status: o.status }).eq('id', o.id); fetchData(); }} onDeleteOrder={async (id) => { await supabase.from('orders').delete().eq('id', id); fetchData(); }} />;
      case 'orders-linen': 
        return <ManageOrdersView orders={orders} structures={structures} products={products} users={users} currentUser={currentUser} targetType="LINEN" onUpdateOrder={async (o) => { await supabase.from('orders').update({ items: o.items, status: o.status }).eq('id', o.id); fetchData(); }} onDeleteOrder={async (id) => { await supabase.from('orders').delete().eq('id', id); fetchData(); }} />;
      case 'supplier-dashboard':
        return <SupplierDashboardView orders={orders} structures={structures} products={products} currentUser={currentUser} onOrderDelivered={() => fetchData()} />;
      default:
        return <DashboardView structures={structures} onSelectStructure={(id) => { setSelectedStructureId(id); setCurrentView('structure-detail'); }} role={currentUser.role} pendingOrdersCount={0} onNavigateToOrders={() => {}} onAddStructure={() => {}} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
      {confirmModal?.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 animate-fade-in backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl border border-white/20">
            <div className="bg-emerald-100 w-16 h-16 rounded-full flex items-center justify-center mb-6 mx-auto text-emerald-600">
              <CheckCircle2 size={32} />
            </div>
            <h3 className="text-2xl font-black text-center text-slate-800 mb-2">{confirmModal.title}</h3>
            <p className="text-gray-500 text-center mb-8 font-medium">{confirmModal.message}</p>
            <div className="flex gap-3">
              <button onClick={confirmModal.onConfirm} className="flex-1 bg-emerald-600 text-white py-4 rounded-2xl font-black shadow-lg shadow-emerald-200 active:scale-95 transition-all">CONFERMA</button>
              <button onClick={() => setConfirmModal(null)} className="flex-1 bg-slate-100 text-slate-500 py-4 rounded-2xl font-black active:scale-95 transition-all">ANNULLA</button>
            </div>
          </div>
        </div>
      )}

      <div className="md:hidden bg-white shadow-sm p-4 flex justify-between items-center sticky top-0 z-20">
        <h1 className="text-xl font-black text-emerald-700 uppercase tracking-tighter">CleanManage</h1>
        <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-2 bg-slate-100 rounded-xl">{isMenuOpen ? <X /> : <Menu />}</button>
      </div>
      
      <aside className={`fixed inset-y-0 left-0 transform ${isMenuOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0 transition duration-300 ease-in-out w-72 bg-slate-900 text-white p-8 flex flex-col z-30 shadow-2xl`}>
        <div className="hidden md:flex items-center gap-3 mb-12">
          <div className="bg-emerald-500 p-2 rounded-xl shadow-lg shadow-emerald-500/20"><Building2 size={24} className="text-white" /></div>
          <span className="text-2xl font-black tracking-tight">CleanManage</span>
        </div>
        
        <nav className="flex-1 space-y-3">
          {currentUser.role !== Role.SUPPLIER && (
            <NavItem icon={<Building2 size={22} />} label="Proprietà" active={currentView === 'dashboard' || currentView === 'structure-detail'} onClick={() => { setCurrentView('dashboard'); setIsMenuOpen(false); }} />
          )}
          {(currentUser.role === Role.ADMIN || currentUser.role === Role.RECEPTION) && (
            <>
              <div className="pt-8 pb-3 text-[10px] text-slate-500 uppercase font-black tracking-[0.2em]">Magazzino Centrale</div>
              <NavItem icon={<ShoppingCart size={22} />} label="Ordini Prodotti" badge={getUnreadOrdersCount('PRODUCT')} active={currentView === 'orders-products'} onClick={() => { setCurrentView('orders-products'); setIsMenuOpen(false); }} />
              <NavItem icon={<Shirt size={22} />} label="Ordini Lavanderia" badge={getUnreadOrdersCount('LINEN')} active={currentView === 'orders-linen'} onClick={() => { setCurrentView('orders-linen'); setIsMenuOpen(false); }} />
            </>
          )}
          {currentUser.role === Role.ADMIN && (
            <NavItem icon={<History size={22} />} label="Report Biancheria" active={currentView === 'admin-linen-summary'} onClick={() => { setCurrentView('admin-linen-summary'); setIsMenuOpen(false); }} />
          )}
          {currentUser.role === Role.SUPPLIER && (
            <NavItem icon={<Truck size={22} />} label="Pannello Consegne" active={currentView === 'supplier-dashboard'} onClick={() => { setCurrentView('supplier-dashboard'); setIsMenuOpen(false); }} />
          )}
        </nav>

        <div className="mt-auto pt-8 border-t border-slate-800">
          <div className="flex items-center gap-3 mb-6 p-2 bg-slate-800/50 rounded-2xl border border-white/5">
            <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center font-black text-white uppercase">{currentUser.name[0]}</div>
            <div className="overflow-hidden">
              <p className="font-bold text-sm truncate">{currentUser.name}</p>
              <p className="text-[10px] text-slate-500 uppercase font-black">{currentUser.role}</p>
            </div>
          </div>
          <button onClick={handleLogout} className="w-full flex items-center gap-3 text-slate-400 hover:text-red-400 font-bold transition-colors p-2"><LogOut size={20} /><span>Esci</span></button>
        </div>
      </aside>
      
      <main className="flex-1 p-4 md:p-10 overflow-y-auto h-screen bg-[#F8FAFC]">{renderContent()}</main>
    </div>
  );
};

// --- SubComponents ---

const NavItem: React.FC<{ icon: any, label: string, active?: boolean, onClick: () => void, badge?: number }> = ({ icon, label, active, onClick, badge }) => (
  <button onClick={onClick} className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all duration-200 group ${active ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20' : 'hover:bg-slate-800 text-slate-400 hover:text-slate-100'}`}>
    <div className="flex items-center gap-4">
      <div className={`${active ? 'text-white' : 'text-slate-500 group-hover:text-emerald-400'} transition-colors`}>{icon}</div>
      <span className="font-bold text-sm tracking-tight">{label}</span>
    </div>
    {badge ? <span className="bg-red-500 text-white text-[10px] px-2.5 py-1 rounded-full font-black animate-pulse shadow-lg shadow-red-500/20">{badge}</span> : null}
  </button>
);

const LoginView: React.FC<{ onLogin: (e: string, p: string) => void }> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4">
      <div className="bg-white p-10 rounded-[3rem] shadow-2xl w-full max-w-md border border-slate-100 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-full -mr-16 -mt-16"></div>
        <div className="relative">
          <div className="flex justify-center mb-8"><div className="bg-emerald-100 p-5 rounded-[2rem] text-emerald-600"><Building2 size={48} /></div></div>
          <h2 className="text-3xl font-black text-center text-slate-900 mb-2 uppercase tracking-tighter">CleanManage</h2>
          <p className="text-center text-slate-400 mb-10 font-medium uppercase text-xs tracking-widest">Login Portale Gestionale</p>
          <form onSubmit={(e) => { e.preventDefault(); onLogin(email, password); }} className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-slate-400 px-1 tracking-widest">Email</label>
              <input className="w-full border-2 border-slate-50 p-4 rounded-2xl focus:border-emerald-500 focus:bg-white bg-slate-50 transition-all outline-none font-bold" type="email" placeholder="nome@azienda.it" value={email} onChange={e => setEmail(e.target.value)} required />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-slate-400 px-1 tracking-widest">Password</label>
              <input className="w-full border-2 border-slate-50 p-4 rounded-2xl focus:border-emerald-500 focus:bg-white bg-slate-50 transition-all outline-none font-bold" type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required />
            </div>
            <button className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black shadow-xl shadow-slate-900/20 hover:bg-emerald-600 transition-all active:scale-95 mt-6 uppercase tracking-widest">ACCEDI ORA</button>
          </form>
        </div>
      </div>
    </div>
  );
};

const DashboardView: React.FC<{ structures: Structure[], onSelectStructure: (id: string) => void, role: Role, pendingOrdersCount: number, onNavigateToOrders: () => void, onAddStructure: () => void }> = ({ structures, onSelectStructure, pendingOrdersCount, onNavigateToOrders, onAddStructure, role }) => (
  <div className="animate-fade-in max-w-7xl mx-auto">
    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
      <div>
        <h2 className="text-4xl font-black text-slate-900 tracking-tight">Zone e Strutture</h2>
        <p className="text-slate-400 font-medium text-lg mt-1">Seleziona una proprietà per operare.</p>
      </div>
      {role === Role.ADMIN && (
        <button onClick={onAddStructure} className="flex items-center gap-3 bg-emerald-600 text-white px-8 py-4 rounded-2xl font-black shadow-xl shadow-emerald-500/20 hover:bg-emerald-700 transition-all active:scale-95 uppercase text-xs tracking-widest">
          <Plus size={24} /> NUOVA STRUTTURA
        </button>
      )}
    </div>

    {pendingOrdersCount > 0 && (
      <div onClick={onNavigateToOrders} className="mb-10 bg-slate-900 text-white p-8 rounded-[2.5rem] flex items-center justify-between cursor-pointer hover:bg-emerald-600 transition-all shadow-2xl group border-4 border-emerald-500/20">
        <div className="flex items-center gap-6">
          <div className="bg-emerald-500 p-4 rounded-2xl group-hover:bg-white group-hover:text-emerald-600 transition-all">
            <Bell size={28} />
          </div>
          <div>
            <p className="text-2xl font-black">Ci sono {pendingOrdersCount} ordini in sospeso</p>
            <p className="text-emerald-400 font-bold group-hover:text-white transition-all uppercase text-xs tracking-widest">Revisione ordini operatori richiesta</p>
          </div>
        </div>
        <div className="bg-white/10 px-6 py-3 rounded-xl font-black group-hover:bg-white group-hover:text-emerald-600 transition-all">GESTISCI</div>
      </div>
    )}

    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
      {structures.map(s => (
        <div key={s.id} onClick={() => onSelectStructure(s.id)} className="bg-white rounded-[2.5rem] shadow-sm hover:shadow-2xl cursor-pointer border border-slate-100 overflow-hidden transition-all duration-300 group hover:-translate-y-2">
          <div className="relative h-56 overflow-hidden">
            <img src={s.imageUrl || `https://picsum.photos/seed/${s.id}/800/400`} className="h-full w-full object-cover group-hover:scale-110 transition-transform duration-700" alt={s.name} />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent"></div>
            <div className="absolute bottom-6 left-6 text-white">
              <h3 className="font-black text-2xl uppercase tracking-tighter">{s.name}</h3>
              <p className="text-white/70 text-xs font-bold flex items-center gap-1 mt-1 tracking-widest"><MapPin size={14} /> {s.address}</p>
            </div>
          </div>
          <div className="p-8 flex items-center justify-between">
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">Gestione Attiva</span>
            <div className="text-slate-900 font-black flex items-center gap-2 group-hover:text-emerald-600 transition-all uppercase text-[10px] tracking-widest">
              Dettagli <ArrowRight size={14} className="ml-1" />
            </div>
          </div>
        </div>
      ))}
    </div>
  </div>
);

const ArrowRight = ({ size, className }: { size: number, className: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M5 12h14M12 5l7 7-7 7" />
  </svg>
);

const AddStructureView: React.FC<{ onSave: (s: any) => void, onCancel: () => void }> = ({ onSave, onCancel }) => {
  const [form, setForm] = useState({ name: '', address: '', accessCodes: '' });
  return (
    <div className="max-w-2xl mx-auto bg-white p-12 rounded-[3rem] shadow-2xl border border-slate-100 animate-fade-in">
      <h2 className="text-3xl font-black text-slate-900 mb-2 uppercase tracking-tighter">Nuova Struttura</h2>
      <p className="text-slate-400 mb-10 font-medium uppercase text-xs tracking-widest">Aggiungi una nuova proprietà al sistema</p>
      <div className="space-y-6 mb-12">
        <div className="space-y-1">
          <label className="text-[10px] font-black uppercase text-slate-400 px-1 tracking-widest">Nome Proprietà</label>
          <input className="w-full border-2 border-slate-50 p-5 rounded-2xl focus:border-emerald-500 focus:bg-white bg-slate-50 transition-all outline-none font-bold" value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Es. Villa Paradiso" />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-black uppercase text-slate-400 px-1 tracking-widest">Indirizzo</label>
          <input className="w-full border-2 border-slate-50 p-5 rounded-2xl focus:border-emerald-500 focus:bg-white bg-slate-50 transition-all outline-none font-bold" value={form.address} onChange={e => setForm({...form, address: e.target.value})} placeholder="Via..." />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-black uppercase text-slate-400 px-1 tracking-widest">Accessi (Codici/Keybox)</label>
          <textarea className="w-full border-2 border-slate-50 p-5 rounded-2xl focus:border-emerald-500 focus:bg-white bg-slate-50 transition-all outline-none h-32 font-bold" value={form.accessCodes} onChange={e => setForm({...form, accessCodes: e.target.value})} placeholder="Es. Keybox: 1234" />
        </div>
      </div>
      <div className="flex gap-4">
        <button onClick={() => onSave(form)} className="flex-1 bg-slate-900 text-white py-5 rounded-2xl font-black shadow-xl hover:bg-emerald-600 transition-all active:scale-95 uppercase tracking-widest text-xs">SALVA</button>
        <button onClick={onCancel} className="px-10 bg-slate-100 text-slate-500 rounded-2xl font-black hover:bg-slate-200 transition-all uppercase text-xs tracking-widest">ANNULLA</button>
      </div>
    </div>
  );
};

const StructureDetailView: React.FC<{
  structureId: string; currentUser: User; inventories: InventoryReport[]; orders: Order[];
  products: Product[]; structures: Structure[]; users: User[]; damageReports: DamageReport[];
  onBack: () => void; onNewInventory: (t: ItemType) => void; onRequestOrder: (t: ItemType) => void;
  onReportDamage: () => void; onReportLinen: () => void; onUpdateDamageStatus: (id: string, s: any) => void;
}> = ({
  structureId, currentUser, structures, damageReports, users,
  onBack, onNewInventory, onRequestOrder, onReportDamage, onReportLinen, onUpdateDamageStatus
}) => {
  const structure = structures.find(s => s.id === structureId);
  const [activeTab, setActiveTab] = useState<'info' | 'damages' | 'history'>('info');

  if (!structure) return <div>Non trovato</div>;
  const structDamages = damageReports.filter(d => d.structureId === structure.id && d.status !== 'ARCHIVED');

  return (
    <div className="max-w-6xl mx-auto animate-fade-in">
      <button onClick={onBack} className="flex items-center gap-2 text-slate-400 mb-8 hover:text-emerald-600 font-black transition-all group uppercase text-[10px] tracking-widest">
        <div className="p-2 bg-white rounded-xl shadow-sm group-hover:shadow-md transition-all"><X size={18} /></div> TORNA ALLE PROPRIETÀ
      </button>
      
      <div className="bg-slate-900 p-10 rounded-[3rem] shadow-2xl mb-12 flex flex-col md:flex-row md:items-center justify-between gap-8 border-4 border-emerald-500/10 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full -mr-32 -mt-32"></div>
        <div className="relative">
          <h1 className="text-5xl font-black text-white tracking-tighter uppercase">{structure.name}</h1>
          <p className="text-emerald-400 font-bold text-lg mt-2 flex items-center gap-2 tracking-widest"><MapPin size={20} /> {structure.address}</p>
        </div>
        <div className="relative font-mono bg-white/5 backdrop-blur-md p-6 rounded-[2rem] border border-white/10 flex items-center gap-4 group">
          <div className="bg-emerald-500 p-3 rounded-xl shadow-lg text-white"><Key size={24} /></div>
          <div className="pr-4">
            <p className="text-[10px] text-white/40 uppercase font-black tracking-widest mb-1">Accesso Operatore</p>
            <span className="text-white font-black text-2xl tracking-[0.2em]">{structure.accessCodes}</span>
          </div>
        </div>
      </div>

      <div className="flex gap-12 mb-10 border-b-2 border-slate-100">
        <button onClick={() => setActiveTab('info')} className={`pb-4 whitespace-nowrap font-black transition-all relative text-xs tracking-widest uppercase ${activeTab === 'info' ? 'text-emerald-600' : 'text-slate-400'}`}>
          OPERAZIONI {activeTab === 'info' && <div className="absolute bottom-[-2px] left-0 w-full h-1 bg-emerald-600 rounded-full"></div>}
        </button>
        <button onClick={() => setActiveTab('damages')} className={`pb-4 whitespace-nowrap font-black transition-all relative text-xs tracking-widest uppercase ${activeTab === 'damages' ? 'text-emerald-600' : 'text-slate-400'}`}>
          GUASTI ({structDamages.filter(d=>d.status==='OPEN').length}) {activeTab === 'damages' && <div className="absolute bottom-[-2px] left-0 w-full h-1 bg-emerald-600 rounded-full"></div>}
        </button>
        <button onClick={() => setActiveTab('history')} className={`pb-4 whitespace-nowrap font-black transition-all relative text-xs tracking-widest uppercase ${activeTab === 'history' ? 'text-emerald-600' : 'text-slate-400'}`}>
          CRONOLOGIA {activeTab === 'history' && <div className="absolute bottom-[-2px] left-0 w-full h-1 bg-emerald-600 rounded-full"></div>}
        </button>
      </div>

      {activeTab === 'info' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <ActionCard icon={<Box className="text-emerald-600" />} title="Inventario Prodotti" desc="Conteggio consumabili" onClick={() => onNewInventory('PRODUCT')} />
          <ActionCard icon={<Shirt className="text-indigo-600" />} title="Conta Biancheria" desc="Report biancheria pulita" onClick={() => onNewInventory('LINEN')} />
          <ActionCard icon={<ShoppingCart className="text-amber-600" />} title="Ordine Prodotti" desc="Rifornimento magazzino" onClick={() => onRequestOrder('PRODUCT')} bg="bg-amber-50" border="border-amber-200" />
          <ActionCard icon={<Truck className="text-blue-600" />} title="Ordine Lavanderia" desc="Richiesta kit puliti" onClick={() => onRequestOrder('LINEN')} bg="bg-blue-50" border="border-blue-200" />
          <ActionCard icon={<RefreshCw className="text-purple-600" />} title="Report Lavanderia" desc="Sporco/Rotto/Inutilizzato" onClick={onReportLinen} bg="bg-purple-50" border="border-purple-200" />
          <ActionCard icon={<AlertTriangle className="text-red-600" />} title="Segnala Guasto" desc="Intervento manutenzione" onClick={onReportDamage} bg="bg-red-50" border="border-red-200" />
        </div>
      )}

      {activeTab === 'damages' && (
        <div className="space-y-6">
          {structDamages.length === 0 && <div className="text-center py-20 bg-white rounded-[3rem] text-slate-300 font-bold uppercase tracking-widest">Nessuna segnalazione</div>}
          {structDamages.map(d => (
            <div key={d.id} className={`p-8 rounded-[2.5rem] border-2 bg-white ${d.status === 'RESOLVED' ? 'opacity-60 bg-slate-50 border-slate-100' : 'border-slate-50 shadow-sm'}`}>
              <div className="flex justify-between items-start gap-6">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-4">
                    <span className={`text-[8px] px-2 py-1 rounded-full font-black uppercase tracking-widest ${d.status === 'OPEN' ? 'bg-red-500 text-white' : 'bg-emerald-500 text-white'}`}>{d.status}</span>
                    <span className="text-[10px] text-slate-400 font-black">{new Date(d.date).toLocaleString()}</span>
                  </div>
                  <p className="font-black text-slate-800 text-xl leading-tight mb-4 uppercase tracking-tighter">{d.notes}</p>
                  <p className="text-[10px] text-slate-400 font-bold">Segnalato da: <span className="text-slate-900 font-black">{users.find(u => u.id === d.reporterId)?.name}</span></p>
                </div>
                <div className="flex flex-col gap-2">
                  {d.status === 'OPEN' && (currentUser.role === Role.ADMIN || currentUser.role === Role.RECEPTION) && (
                    <button onClick={() => onUpdateDamageStatus(d.id, 'RESOLVED')} className="bg-emerald-600 text-white p-4 rounded-2xl shadow-lg active:scale-95"><CheckCircle2 size={24} /></button>
                  )}
                  {(currentUser.role === Role.ADMIN || currentUser.role === Role.RECEPTION) && (
                    <button onClick={() => onUpdateDamageStatus(d.id, 'ARCHIVED')} className="bg-slate-100 text-slate-400 p-4 rounded-2xl active:scale-95"><Trash size={24} /></button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {activeTab === 'history' && <div className="text-center py-24 bg-white rounded-[3rem] text-slate-300 font-black uppercase tracking-widest">Storico vuoto</div>}
    </div>
  );
};

const ActionCard: React.FC<{ icon: any, title: string, desc: string, onClick: () => void, bg?: string, border?: string }> = ({ icon, title, desc, onClick, bg = "bg-white", border = "border-slate-100" }) => (
  <div onClick={onClick} className={`cursor-pointer ${bg} p-10 rounded-[2.5rem] border-2 ${border} hover:shadow-xl transition-all flex flex-col items-center text-center gap-6 group active:scale-95`}>
    <div className="p-6 bg-white rounded-[2rem] shadow-md group-hover:scale-110 transition-transform">{React.cloneElement(icon, { size: 48 })}</div>
    <div><h3 className="font-black text-slate-800 text-sm uppercase tracking-widest mb-1">{title}</h3><p className="text-xs text-slate-400 font-medium">{desc}</p></div>
  </div>
);

const NewOrderView: React.FC<{ structureId: string, currentUser: User, products: Product[], type: ItemType, onSave: (o: any) => void, onCancel: () => void }> = ({ structureId, currentUser, products, type, onSave, onCancel }) => {
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [signer, setSigner] = useState(currentUser.name);
  const filtered = products.filter(p => p.type === type);

  return (
    <div className="max-w-3xl mx-auto bg-white p-12 rounded-[3rem] shadow-2xl animate-fade-in">
      <h2 className="text-4xl font-black text-slate-900 mb-2 uppercase tracking-tighter">Nuovo Ordine {type === 'LINEN' ? 'Lavanderia' : 'Prodotti'}</h2>
      <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest mb-10">Compila la richiesta di rifornimento</p>
      
      <div className="space-y-3 mb-12 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
        {filtered.map(p => (
          <div key={p.id} className="flex justify-between items-center p-5 bg-slate-50 rounded-2xl border-2 border-transparent hover:border-emerald-500 transition-all">
            <span className="font-black text-slate-700 uppercase text-lg tracking-tighter">{p.name} <span className="text-[10px] text-slate-400 block font-bold">{p.unit}</span></span>
            <div className="flex items-center gap-4">
              <button onClick={() => setQuantities({...quantities, [p.id]: Math.max(0, (quantities[p.id]||0) - 1)})} className="p-2 bg-white rounded-lg shadow-sm"><Minus size={18} /></button>
              <span className="font-black text-2xl w-10 text-center">{quantities[p.id] || 0}</span>
              <button onClick={() => setQuantities({...quantities, [p.id]: (quantities[p.id]||0) + 1})} className="p-2 bg-white rounded-lg shadow-sm"><Plus size={18} /></button>
            </div>
          </div>
        ))}
      </div>

      <div className="mb-10 bg-slate-900 p-8 rounded-[2rem]">
        <label className="block text-[8px] font-black text-emerald-400 uppercase tracking-[0.3em] mb-4">Convalida con Firma (Digita Nome)</label>
        <input className="w-full bg-white/5 border-2 border-white/10 p-4 rounded-2xl focus:border-emerald-500 outline-none font-black text-white text-2xl" value={signer} onChange={e => setSigner(e.target.value)} />
      </div>

      <div className="flex gap-4">
        <button 
          onClick={() => onSave({ structureId, requesterId: currentUser.id, dateCreated: new Date().toISOString(), items: (Object.entries(quantities) as [string, number][]).filter(([_, q]) => q > 0).map(([pid, q]) => ({ productId: pid, quantity: q })), status: OrderStatus.PENDING, type, signatureUrl: signer })} 
          className="flex-1 bg-emerald-600 text-white py-6 rounded-2xl font-black shadow-xl uppercase tracking-widest active:scale-95 transition-all text-xs"
        >
          INVIA RICHIESTA
        </button>
        <button onClick={onCancel} className="px-10 bg-slate-100 text-slate-500 rounded-2xl font-black uppercase tracking-widest text-xs">Annulla</button>
      </div>
    </div>
  );
};

const NewInventoryView: React.FC<{ structureId: string, currentUser: User, products: Product[], type: ItemType, onSave: (i: any) => void, onCancel: () => void }> = ({ structureId, currentUser, products, type, onSave, onCancel }) => {
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [signer, setSigner] = useState(currentUser.name);
  const filtered = products.filter(p => p.type === type);

  return (
    <div className="max-w-3xl mx-auto bg-white p-12 rounded-[3rem] shadow-2xl animate-fade-in">
      <h2 className="text-4xl font-black mb-10 text-slate-900 tracking-tighter uppercase tracking-widest">Inventario {type === 'LINEN' ? 'Biancheria' : 'Prodotti'}</h2>
      <div className="space-y-2 mb-10 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
        {filtered.map(p => (
          <div key={p.id} className="flex justify-between items-center p-5 border-2 border-slate-50 rounded-2xl bg-slate-50/50 hover:border-emerald-500 transition-all">
            <span className="font-black text-slate-700 uppercase text-lg tracking-tighter">{p.name} <span className="text-[10px] text-slate-300 block font-bold">{p.unit}</span></span>
            <input type="number" className="w-24 border-2 border-slate-200 rounded-xl p-4 text-center font-black text-xl outline-none focus:border-emerald-500" placeholder="0" onChange={e => setQuantities({...quantities, [p.id]: Math.max(0, parseInt(e.target.value)||0)})} />
          </div>
        ))}
      </div>
      
      <div className="mb-10 bg-slate-100 p-8 rounded-[2rem] border-2 border-slate-200">
        <label className="block text-[8px] font-black text-slate-400 uppercase mb-4 tracking-widest">Firma di Convalida (Digita Nome)</label>
        <input className="w-full border-2 border-white p-4 rounded-2xl focus:border-emerald-500 bg-white font-black text-2xl" value={signer} onChange={e => setSigner(e.target.value)} />
      </div>

      <div className="flex gap-4">
        <button onClick={() => onSave({ structureId, operatorId: currentUser.id, date: new Date().toISOString(), items: (Object.entries(quantities) as [string, number][]).filter(([_, q]) => q > 0).map(([pid, q]) => ({ productId: pid, quantity: q })), type, signatureUrl: signer })} className="flex-1 bg-emerald-600 text-white py-6 rounded-2xl font-black shadow-xl uppercase tracking-widest text-xs active:scale-95">SALVA INVENTARIO</button>
        <button onClick={onCancel} className="px-10 bg-slate-100 text-slate-500 rounded-2xl font-black uppercase tracking-widest text-xs">Annulla</button>
      </div>
    </div>
  );
};

const NewDamageReportView: React.FC<{ 
  structureId: string, currentUser: User, 
  onSave: (r: any) => void, onCancel: () => void 
}> = ({ structureId, currentUser, onSave, onCancel }) => {
  const [notes, setNotes] = useState('');
  
  return (
    <div className="max-w-3xl mx-auto bg-white p-12 rounded-[3rem] shadow-2xl animate-fade-in">
      <h2 className="text-4xl font-black text-slate-900 mb-10 uppercase tracking-tighter">Segnala Guasto</h2>
      <div className="space-y-6 mb-12">
        <textarea 
          className="w-full border-2 border-slate-50 p-6 rounded-2xl focus:border-red-500 bg-slate-50 transition-all outline-none h-48 font-bold text-lg uppercase tracking-tighter" 
          placeholder="Descrivi il guasto o il danno..."
          value={notes}
          onChange={e => setNotes(e.target.value)}
        />
      </div>

      <div className="flex gap-4">
        <button 
          onClick={() => onSave({ structureId, reporterId: currentUser.id, date: new Date().toISOString(), items: [], notes, status: 'OPEN' })} 
          className="flex-1 bg-red-600 text-white py-6 rounded-2xl font-black shadow-xl uppercase tracking-widest text-xs active:scale-95"
        >
          INVIA SEGNALAZIONE
        </button>
        <button onClick={onCancel} className="px-12 bg-slate-100 text-slate-500 rounded-2xl font-black uppercase tracking-widest text-xs">Annulla</button>
      </div>
    </div>
  );
};

const ManageOrdersView: React.FC<{ 
  orders: Order[], structures: Structure[], products: Product[], 
  users: User[], currentUser: User, targetType: ItemType, 
  onUpdateOrder: (o: Order) => void, onDeleteOrder: (id: string) => void 
}> = ({ orders, structures, products, users, targetType, onUpdateOrder, onDeleteOrder }) => {
  const filtered = orders.filter(o => o.type === targetType).sort((a,b) => new Date(b.dateCreated).getTime() - new Date(a.dateCreated).getTime());

  return (
    <div className="max-w-5xl mx-auto animate-fade-in">
      <h2 className="text-4xl font-black text-slate-900 mb-10 uppercase tracking-tighter">Ordini {targetType === 'LINEN' ? 'Lavanderia' : 'Prodotti'}</h2>
      <div className="space-y-6">
        {filtered.map(o => (
          <div key={o.id} className={`bg-white p-8 rounded-[3rem] border-2 shadow-sm ${o.status === OrderStatus.PENDING ? 'border-amber-500' : 'border-emerald-500'}`}>
            <div className="flex flex-col md:flex-row justify-between items-center gap-8">
              <div className="flex-1">
                <h3 className="font-black text-2xl text-slate-900 uppercase tracking-tighter mb-2">{structures.find(s => s.id === o.structureId)?.name}</h3>
                <p className="text-[10px] text-slate-400 font-bold mb-6 tracking-widest">
                  Richiesto da {users.find(u => u.id === o.requesterId)?.name} - {new Date(o.dateCreated).toLocaleDateString()}
                </p>
                <div className="flex flex-wrap gap-2">
                  {o.items.map(i => (
                    <div key={i.productId} className="bg-slate-50 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest">
                      {products.find(p=>p.id===i.productId)?.name}: {i.quantity}
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="flex gap-4">
                {o.status === OrderStatus.PENDING && (
                  <>
                    <button onClick={() => onUpdateOrder({...o, status: OrderStatus.SENT, dateSent: new Date().toISOString()})} className="bg-emerald-600 text-white px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest">CONVALIDA</button>
                    <button onClick={() => onDeleteOrder(o.id)} className="p-4 bg-red-50 text-red-600 rounded-2xl"><Trash size={20} /></button>
                  </>
                )}
                {o.status === OrderStatus.SENT && <span className="bg-emerald-100 text-emerald-600 px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest">INVIATO</span>}
              </div>
            </div>
          </div>
        ))}
        {filtered.length === 0 && <div className="text-center py-20 text-slate-300 font-black uppercase tracking-widest">Nessun ordine presente</div>}
      </div>
    </div>
  );
};

const NewUnusedLinenView: React.FC<{ structureId: string, currentUser: User, products: Product[], onSave: (r: any) => void, onCancel: () => void }> = ({ structureId, currentUser, products, onSave, onCancel }) => {
  const linen = products.filter(p => p.type === 'LINEN');
  const [dirty, setDirty] = useState<Record<string, number>>({});
  const [unused, setUnused] = useState<Record<string, number>>({});
  const [broken, setBroken] = useState<Record<string, number>>({});
  const [signer, setSigner] = useState(currentUser.name);

  return (
    <div className="max-w-4xl mx-auto bg-white p-12 rounded-[3rem] shadow-2xl animate-fade-in">
      <h2 className="text-4xl font-black text-slate-900 mb-10 uppercase tracking-tighter">Report Lavanderia</h2>
      <div className="space-y-4 mb-12 max-h-[500px] overflow-y-auto pr-4 custom-scrollbar">
        {linen.map(p => (
          <div key={p.id} className="p-8 border-2 border-slate-50 rounded-[2.5rem] bg-slate-50/50 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
            <span className="font-black text-slate-800 text-lg uppercase tracking-tighter">{p.name}</span>
            <div className="flex gap-4">
              <div className="text-center">
                <label className="text-[8px] font-black uppercase tracking-widest block mb-2 text-red-600">Sporca</label>
                <input type="number" className="w-16 border-2 border-slate-200 rounded-xl p-2 text-center font-black" placeholder="0" onChange={e => setDirty({...dirty, [p.id]: parseInt(e.target.value)||0})} />
              </div>
              <div className="text-center">
                <label className="text-[8px] font-black uppercase tracking-widest block mb-2 text-orange-600">Rotta</label>
                <input type="number" className="w-16 border-2 border-slate-200 rounded-xl p-2 text-center font-black" placeholder="0" onChange={e => setBroken({...broken, [p.id]: parseInt(e.target.value)||0})} />
              </div>
              <div className="text-center">
                <label className="text-[8px] font-black uppercase tracking-widest block mb-2 text-blue-600">Inutil.</label>
                <input type="number" className="w-16 border-2 border-slate-200 rounded-xl p-2 text-center font-black" placeholder="0" onChange={e => setUnused({...unused, [p.id]: parseInt(e.target.value)||0})} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mb-10 bg-slate-900 p-8 rounded-[2.5rem]">
        <label className="block text-[8px] font-black text-emerald-400 uppercase mb-4 tracking-widest">Firma Operatore (Digita Nome)</label>
        <input className="w-full bg-white/5 border-2 border-white/10 p-4 rounded-2xl font-black text-white text-3xl tracking-tighter" value={signer} onChange={e => setSigner(e.target.value)} />
      </div>

      <div className="flex gap-4">
        <button onClick={() => onSave({ structureId, operatorId: currentUser.id, date: new Date().toISOString(), dirtyItems: Object.entries(dirty).filter(([_,q])=>q>0).map(([p,q])=>({productId:p, quantity:q})), unusedItems: Object.entries(unused).filter(([_,q])=>q>0).map(([p,q])=>({productId:p, quantity:q})), brokenItems: Object.entries(broken).filter(([_,q])=>q>0).map(([p,q])=>({productId:p, quantity:q})), signatureUrl: signer })} className="flex-1 bg-indigo-600 text-white py-6 rounded-2xl font-black uppercase tracking-widest text-xs active:scale-95">SALVA REPORT</button>
        <button onClick={onCancel} className="px-12 bg-slate-100 text-slate-500 rounded-2xl font-black uppercase tracking-widest text-xs">Annulla</button>
      </div>
    </div>
  );
};

const AdminLinenSummaryView: React.FC<{ reports: UnusedLinenReport[], products: Product[], structures: Structure[], users: User[], onBack: () => void }> = ({ reports, products, onBack }) => {
  return (
    <div className="max-w-6xl mx-auto animate-fade-in">
      <button onClick={onBack} className="text-slate-400 font-black mb-8 uppercase text-[10px] tracking-widest flex items-center gap-2"><X size={16}/> Chiudi Report</button>
      <h2 className="text-4xl font-black text-slate-900 mb-10 uppercase tracking-tighter">Analisi Lavanderia</h2>
      <div className="bg-white rounded-[4rem] shadow-xl overflow-hidden p-10 border border-slate-100">
        <p className="text-slate-400 font-bold uppercase text-center text-xs tracking-[0.2em] mb-10">Riepilogo generale carichi lavanderia</p>
        <div className="text-center py-20 text-slate-300 font-black uppercase tracking-widest border-4 border-dashed border-slate-50 rounded-[3rem]">Analisi Dati in tempo reale</div>
      </div>
    </div>
  );
};

const SupplierDashboardView: React.FC<{ orders: Order[], structures: Structure[], products: Product[], currentUser: User, onOrderDelivered: () => void }> = ({ orders, structures, products, currentUser, onOrderDelivered }) => {
  const supplierOrders = orders.filter(o => o.status === OrderStatus.SENT && o.type === 'PRODUCT').sort((a,b) => new Date(b.dateCreated).getTime() - new Date(a.dateCreated).getTime());
  
  return (
    <div className="max-w-6xl mx-auto animate-fade-in">
      <div className="bg-slate-900 text-white p-12 rounded-[4rem] mb-12 flex flex-col justify-center border-b-[2rem] border-emerald-500">
        <h2 className="text-6xl font-black tracking-tighter uppercase">Consegne</h2>
        <p className="text-emerald-400 font-black text-2xl uppercase tracking-widest opacity-80">Fornitore: {currentUser.name}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {supplierOrders.map(o => (
          <div key={o.id} className="bg-white p-10 rounded-[3rem] shadow-xl border border-slate-50">
            <h3 className="text-3xl font-black text-slate-900 tracking-tighter uppercase mb-2">{structures.find(s => s.id === o.structureId)?.name}</h3>
            <p className="text-emerald-600 font-bold text-xs mb-8 flex items-center gap-2"><MapPin size={16} /> {structures.find(s => s.id === o.structureId)?.address}</p>
            
            <div className="bg-slate-50 p-6 rounded-2xl mb-8 space-y-2">
              {o.items.map(i => (
                <div key={i.productId} className="flex justify-between items-center text-xs font-black uppercase tracking-widest text-slate-500">
                  <span>{products.find(p=>p.id===i.productId)?.name}</span>
                  <span className="text-slate-900">x{i.quantity}</span>
                </div>
              ))}
            </div>
            
            <button onClick={async () => {
              await supabase.from('orders').update({ status: OrderStatus.DELIVERED }).eq('id', o.id);
              onOrderDelivered();
            }} className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black shadow-lg hover:bg-emerald-600 transition-all active:scale-95 uppercase tracking-widest text-[10px]">Consegna Completata</button>
          </div>
        ))}
        {supplierOrders.length === 0 && <div className="col-span-full text-center py-32 text-slate-300 font-black uppercase tracking-widest text-3xl italic">Nessun ordine pendente</div>}
      </div>
    </div>
  );
};

export default App;
