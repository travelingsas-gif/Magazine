
import React, { useState, useMemo, useEffect } from 'react';
import { 
  Building2, Box, ShoppingCart, LogOut, Menu, X, 
  Plus, Send, AlertCircle, Clock, Bell, Truck, MapPin, 
  RefreshCw, Shirt, AlertTriangle, UserCheck, Loader, 
  Download, Trash, CheckCircle2, History, Minus, Key, Calendar, Save, List, Check
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
  const [showSuccess, setShowSuccess] = useState(false);
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

  const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean, title: string, message: string, onConfirm: () => void } | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
       const [resUsers, resProds, resStructs, resInv, resOrd, resDmg, resLin] = await Promise.all([
         supabase.from('users').select('*'),
         supabase.from('products').select('*').order('name'),
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
    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const triggerSuccess = () => {
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 2000);
  };

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

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50 flex-col gap-4"><Loader className="animate-spin text-emerald-600" size={24} /><p className="font-black text-slate-800 uppercase tracking-widest text-[9px]">Caricamento...</p></div>;
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
                    openConfirm("Nuova Struttura", `Confermi l'aggiunta di ${s.name}?`, async () => {
                      const { data, error } = await supabase.from('structures').insert({
                        id: crypto.randomUUID(), name: s.name, address: s.address, access_codes: s.accessCodes
                      }).select().single();
                      if (!error && data) { 
                        setStructures([...structures, mapStructure(data)]); 
                        setCurrentView('dashboard'); 
                        fetchData();
                        triggerSuccess();
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
                  damageReports={damageReports}
                  structures={structures}
                  users={users}
                  onBack={() => setCurrentView('dashboard')}
                  onNewInventory={(type) => { setActiveItemType(type); setCurrentView('inventory-new'); }}
                  onRequestOrder={(type) => { setActiveItemType(type); setCurrentView('order-new'); }}
                  onReportDamage={() => setCurrentView('damage-report-new')}
                  onReportLinen={() => setCurrentView('unused-linen-new')}
                  onUpdateDamageStatus={async (id, status) => {
                    openConfirm("Aggiorna Stato", "Vuoi cambiare lo stato di questa segnalazione?", async () => {
                      const { error } = await supabase.from('damage_reports').update({ status }).eq('id', id);
                      if (!error) {
                        setDamageReports(damageReports.map(d => d.id === id ? { ...d, status } : d));
                        triggerSuccess();
                      }
                      setConfirmModal(null);
                    });
                  }}
               />;
      case 'inventory-new':
        return <NewInventoryView 
                  structureId={selectedStructureId!} currentUser={currentUser} products={products} type={activeItemType}
                  onSave={async (inv) => {
                    openConfirm("Salva Inventario", "Confermi il salvataggio dei dati dell'inventario?", async () => {
                      const { data, error } = await supabase.from('inventories').insert({
                        id: crypto.randomUUID(), structure_id: inv.structureId, operator_id: inv.operatorId,
                        date: inv.date, items: inv.items, signature_url: inv.signatureUrl, photo_url: inv.photoUrl,
                        notes: inv.notes, type: inv.type
                      }).select().single();
                      if(!error && data) { 
                        setCurrentView('structure-detail'); 
                        fetchData(); 
                        triggerSuccess();
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
                    openConfirm("Invia Ordine", "Vuoi inoltrare questa richiesta d'ordine alla reception?", async () => {
                      const { data, error } = await supabase.from('orders').insert({
                        id: crypto.randomUUID(), structure_id: ord.structureId, requester_id: ord.requesterId,
                        date_created: ord.dateCreated, items: ord.items, status: ord.status, type: ord.type, signature_url: ord.signatureUrl
                      }).select().single();
                      if (!error && data) { 
                        setCurrentView('structure-detail'); 
                        fetchData(); 
                        triggerSuccess();
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
                  openConfirm("Segnala Guasto", "Vuoi inoltrare la segnalazione di guasto?", async () => {
                    const { data, error } = await supabase.from('damage_reports').insert({
                       id: crypto.randomUUID(), structure_id: rep.structureId, reporter_id: rep.reporterId,
                       date: rep.date, items: rep.items, notes: rep.notes, status: rep.status
                    }).select().single();
                    if(!error && data) { 
                      setCurrentView('structure-detail'); 
                      fetchData(); 
                      triggerSuccess();
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
                  openConfirm("Invia Report Biancheria", "Confermi l'invio del report biancheria?", async () => {
                    const { data, error } = await supabase.from('unused_linen_reports').insert({
                      id: crypto.randomUUID(), structure_id: rep.structureId, operator_id: rep.operatorId,
                      date: rep.date, dirty_items: rep.dirtyItems, unused_items: rep.unusedItems, broken_items: rep.brokenItems,
                      notes: rep.notes, signature_url: rep.signatureUrl
                    }).select().single();
                    if (!error && data) { 
                      setCurrentView('structure-detail'); 
                      fetchData(); 
                      triggerSuccess();
                    }
                    setConfirmModal(null);
                  });
                }}
                onCancel={() => setCurrentView('structure-detail')}
              />;
      case 'products-management':
        return <ProductManagementView 
                  products={products} 
                  onSave={async (p) => {
                    openConfirm("Aggiungi Prodotto", `Vuoi aggiungere ${p.name} al catalogo?`, async () => {
                      const { error } = await supabase.from('products').insert({ id: crypto.randomUUID(), ...p });
                      if (!error) {
                        fetchData();
                        triggerSuccess();
                      }
                      setConfirmModal(null);
                    });
                  }}
                  onDelete={async (id) => {
                    openConfirm("Elimina Prodotto", "Vuoi rimuovere questo articolo dal catalogo?", async () => {
                      const { error } = await supabase.from('products').delete().eq('id', id);
                      if (!error) {
                        fetchData();
                        triggerSuccess();
                      }
                      setConfirmModal(null);
                    });
                  }}
                  onBack={() => setCurrentView('dashboard')}
                />;
      case 'admin-linen-summary':
        return <AdminLinenSummaryView onBack={() => setCurrentView('dashboard')} />;
      case 'orders-products': 
        return <ManageOrdersView orders={orders} structures={structures} products={products} users={users} currentUser={currentUser} targetType="PRODUCT" onUpdateOrder={async (o, s) => { openConfirm("Aggiorna Ordine", "Confermi l'aggiornamento dello stato dell'ordine?", async () => { await supabase.from('orders').update({ items: o.items, status: s, date_sent: s === OrderStatus.SENT ? new Date().toISOString() : o.dateSent }).eq('id', o.id); fetchData(); triggerSuccess(); setConfirmModal(null); }); }} onDeleteOrder={async (id) => { openConfirm("Elimina Ordine", "Vuoi cancellare definitivamente questo ordine?", async () => { await supabase.from('orders').delete().eq('id', id); fetchData(); triggerSuccess(); setConfirmModal(null); }); }} />;
      case 'orders-linen': 
        return <ManageOrdersView orders={orders} structures={structures} products={products} users={users} currentUser={currentUser} targetType="LINEN" onUpdateOrder={async (o, s) => { openConfirm("Aggiorna Ordine", "Confermi l'aggiornamento dello stato dell'ordine?", async () => { await supabase.from('orders').update({ items: o.items, status: s, date_sent: s === OrderStatus.SENT ? new Date().toISOString() : o.dateSent }).eq('id', o.id); fetchData(); triggerSuccess(); setConfirmModal(null); }); }} onDeleteOrder={async (id) => { openConfirm("Elimina Ordine", "Vuoi cancellare definitivamente questo ordine?", async () => { await supabase.from('orders').delete().eq('id', id); fetchData(); triggerSuccess(); setConfirmModal(null); }); }} />;
      case 'supplier-dashboard':
        return <SupplierDashboardView orders={orders} structures={structures} products={products} currentUser={currentUser} onOrderDelivered={() => { fetchData(); triggerSuccess(); }} />;
      default:
        return <DashboardView structures={structures} onSelectStructure={(id) => { setSelectedStructureId(id); setCurrentView('structure-detail'); }} role={currentUser.role} pendingOrdersCount={0} onNavigateToOrders={() => {}} onAddStructure={() => {}} />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row text-slate-800 text-[13px]">
      {showSuccess && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[200] bg-emerald-600 text-white px-5 py-2.5 rounded-full shadow-2xl flex items-center gap-2 border border-emerald-500 animate-bounce">
           <Check size={16} />
           <span className="font-black text-[10px] uppercase tracking-widest">Fatto</span>
        </div>
      )}

      {confirmModal?.isOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white rounded-xl p-5 max-w-[300px] w-full shadow-2xl border border-slate-100">
            <h3 className="text-base font-black text-slate-900 mb-1 uppercase tracking-tighter">{confirmModal.title}</h3>
            <p className="text-slate-500 mb-5 font-medium text-[11px] leading-relaxed">{confirmModal.message}</p>
            <div className="flex gap-2">
              <button onClick={confirmModal.onConfirm} className="flex-1 bg-emerald-600 text-white py-2.5 rounded-lg font-black text-[9px] uppercase tracking-widest active:scale-95 transition-all">CONFERMA</button>
              <button onClick={() => setConfirmModal(null)} className="flex-1 bg-slate-100 text-slate-500 py-2.5 rounded-lg font-black text-[9px] uppercase tracking-widest active:scale-95">ANNULLA</button>
            </div>
          </div>
        </div>
      )}

      <div className="md:hidden bg-white border-b border-slate-200 p-3 flex justify-between items-center sticky top-0 z-20">
        <h1 className="text-sm font-black text-emerald-700 uppercase tracking-tighter">CleanManage</h1>
        <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-1.5 bg-slate-50 rounded-lg border border-slate-200">{isMenuOpen ? <X size={16}/> : <Menu size={16}/>}</button>
      </div>
      
      <aside className={`fixed inset-y-0 left-0 transform ${isMenuOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0 transition duration-300 ease-in-out w-56 bg-slate-900 text-white p-4 flex flex-col z-30 shadow-xl`}>
        <div className="hidden md:flex items-center gap-2 mb-6">
          <div className="bg-emerald-500 p-1 rounded-md"><Building2 size={16} className="text-white" /></div>
          <span className="text-base font-black tracking-tight">CleanManage</span>
        </div>
        
        <nav className="flex-1 space-y-1">
          {currentUser.role !== Role.SUPPLIER && (
            <NavItem icon={<Building2 size={15} />} label="Proprietà" active={currentView === 'dashboard' || currentView === 'structure-detail'} onClick={() => { setCurrentView('dashboard'); setIsMenuOpen(false); }} />
          )}
          {(currentUser.role === Role.ADMIN || currentUser.role === Role.RECEPTION) && (
            <>
              <div className="pt-4 pb-1 text-[7px] text-slate-500 uppercase font-black tracking-[0.2em] ml-2">Area Magazzino</div>
              <NavItem icon={<ShoppingCart size={15} />} label="Ordini Prodotti" badge={getUnreadOrdersCount('PRODUCT')} active={currentView === 'orders-products'} onClick={() => { setCurrentView('orders-products'); setIsMenuOpen(false); }} />
              <NavItem icon={<Shirt size={15} />} label="Ordini Lavanderia" badge={getUnreadOrdersCount('LINEN')} active={currentView === 'orders-linen'} onClick={() => { setCurrentView('orders-linen'); setIsMenuOpen(false); }} />
            </>
          )}
          {currentUser.role === Role.ADMIN && (
            <>
              <div className="pt-4 pb-1 text-[7px] text-slate-500 uppercase font-black tracking-[0.2em] ml-2">Amministrazione</div>
              <NavItem icon={<List size={15} />} label="Catalogo" active={currentView === 'products-management'} onClick={() => { setCurrentView('products-management'); setIsMenuOpen(false); }} />
              <NavItem icon={<History size={15} />} label="Log Report" active={currentView === 'admin-linen-summary'} onClick={() => { setCurrentView('admin-linen-summary'); setIsMenuOpen(false); }} />
            </>
          )}
          {currentUser.role === Role.SUPPLIER && (
            <NavItem icon={<Truck size={15} />} label="Mie Consegne" active={currentView === 'supplier-dashboard'} onClick={() => { setCurrentView('supplier-dashboard'); setIsMenuOpen(false); }} />
          )}
        </nav>

        <div className="mt-auto pt-4 border-t border-slate-800 text-[10px]">
          <div className="flex items-center gap-2 mb-3 p-1.5 bg-slate-800/30 rounded-lg">
            <div className="w-6 h-6 rounded bg-emerald-500 flex items-center justify-center font-black text-white uppercase text-[9px]">{currentUser.name[0]}</div>
            <div className="overflow-hidden">
              <p className="font-bold truncate leading-none">{currentUser.name}</p>
              <p className="text-[7px] text-slate-500 uppercase font-black mt-0.5">{currentUser.role}</p>
            </div>
          </div>
          <button onClick={handleLogout} className="w-full flex items-center gap-2 text-slate-400 hover:text-red-400 font-bold p-1 transition-colors"><LogOut size={13} /><span>Esci</span></button>
        </div>
      </aside>
      
      <main className="flex-1 p-4 md:p-6 overflow-y-auto h-screen bg-slate-50">{renderContent()}</main>
    </div>
  );
};

// --- SubComponents ---

const NavItem: React.FC<{ icon: any, label: string, active?: boolean, onClick: () => void, badge?: number }> = ({ icon, label, active, onClick, badge }) => (
  <button onClick={onClick} className={`w-full flex items-center justify-between p-2 rounded-lg transition-all duration-200 group ${active ? 'bg-emerald-600 text-white shadow' : 'hover:bg-slate-800 text-slate-400 hover:text-slate-100'}`}>
    <div className="flex items-center gap-2">
      <div className={`${active ? 'text-white' : 'text-slate-500 group-hover:text-emerald-400'}`}>{icon}</div>
      <span className="font-bold text-[11px] tracking-tight">{label}</span>
    </div>
    {badge ? <span className="bg-red-500 text-white text-[7px] px-1.5 py-0.5 rounded-full font-black">{badge}</span> : null}
  </button>
);

const LoginView: React.FC<{ onLogin: (e: string, p: string) => void }> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  return (
    <div className="min-h-screen flex items-center justify-center bg-white p-4">
      <div className="w-full max-w-[320px] p-6 border border-slate-200 rounded-xl shadow-sm">
        <div className="flex justify-center mb-5"><div className="bg-emerald-50 p-3 rounded-xl text-emerald-600 border border-emerald-100"><Building2 size={24} /></div></div>
        <h2 className="text-lg font-black text-center text-slate-900 mb-1 uppercase tracking-tighter">CleanManage</h2>
        <p className="text-center text-slate-400 mb-6 font-medium uppercase text-[8px] tracking-[0.2em]">Gestione Operativa</p>
        <form onSubmit={(e) => { e.preventDefault(); onLogin(email, password); }} className="space-y-3">
          <div className="space-y-1">
            <label className="text-[7px] font-black uppercase text-slate-400 px-1 tracking-widest">Email</label>
            <input className="w-full border border-slate-200 p-2 rounded-lg bg-slate-50 text-[11px] font-bold outline-none focus:border-emerald-500 focus:bg-white" type="email" placeholder="email@azienda.it" value={email} onChange={e => setEmail(e.target.value)} required />
          </div>
          <div className="space-y-1">
            <label className="text-[7px] font-black uppercase text-slate-400 px-1 tracking-widest">Password</label>
            <input className="w-full border border-slate-200 p-2 rounded-lg bg-slate-50 text-[11px] font-bold outline-none focus:border-emerald-500 focus:bg-white" type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required />
          </div>
          <button className="w-full bg-slate-900 text-white py-3 rounded-lg font-black shadow-lg hover:bg-emerald-600 transition-all uppercase tracking-widest text-[9px] mt-2">ACCEDI</button>
        </form>
      </div>
    </div>
  );
};

const ProductManagementView: React.FC<{ products: Product[], onSave: (p: any) => Promise<void>, onDelete: (id: string) => Promise<void>, onBack: () => void }> = ({ products, onSave, onDelete, onBack }) => {
  const [name, setName] = useState('');
  const [category, setCategory] = useState<Product['category']>('OTHER');
  const [unit, setUnit] = useState('Pz');
  const [type, setType] = useState<ItemType>('PRODUCT');

  return (
    <div className="animate-fade-in max-w-4xl mx-auto">
      <button onClick={onBack} className="flex items-center gap-1.5 text-slate-400 mb-4 hover:text-emerald-600 font-black uppercase text-[8px] tracking-widest">
        <div className="p-1 bg-white rounded border border-slate-200"><X size={10} /></div> CHIUDI
      </button>
      <h2 className="text-xl font-black text-slate-900 mb-6 uppercase tracking-tighter">Catalogo Aziendale</h2>
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 mb-6">
        <h3 className="font-black text-[9px] uppercase tracking-widest mb-3 text-emerald-600">Aggiungi Nuovo Articolo</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <input className="border border-slate-200 p-2 rounded-lg text-[11px] font-bold outline-none bg-slate-50 focus:border-emerald-500 focus:bg-white" value={name} onChange={e => setName(e.target.value)} placeholder="Nome articolo..." />
          <select className="border border-slate-200 p-2 rounded-lg text-[11px] font-bold outline-none bg-slate-50" value={category} onChange={e => setCategory(e.target.value as any)}>
            <option value="CLEANING">Pulizia</option>
            <option value="FOOD">Food</option>
            <option value="AMENITIES">Kit Benvenuto</option>
            <option value="LINEN_BED">Letto</option>
            <option value="LINEN_BATH">Bagno</option>
            <option value="OTHER">Altro</option>
          </select>
          <input className="border border-slate-200 p-2 rounded-lg text-[11px] font-bold outline-none bg-slate-50" value={unit} onChange={e => setUnit(e.target.value)} placeholder="Unità (Pz, Lt)" />
          <select className="border border-slate-200 p-2 rounded-lg text-[11px] font-bold outline-none bg-slate-50" value={type} onChange={e => setType(e.target.value as any)}>
            <option value="PRODUCT">Consumabile</option>
            <option value="LINEN">Biancheria</option>
          </select>
        </div>
        <button onClick={() => { if(name) { onSave({ name, category, unit, type }); setName(''); } }} className="mt-4 bg-slate-900 text-white px-4 py-2 rounded-lg font-black text-[8px] tracking-widest uppercase shadow active:scale-95 transition-all">REGISTRA PRODOTTO</button>
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 text-[8px] font-black uppercase text-slate-400 tracking-widest border-b border-slate-200">
            <tr><th className="p-3">Articolo</th><th className="p-3">Tipo</th><th className="p-3">Unità</th><th className="p-3 text-right">Azioni</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-[11px]">
            {products.map(p => (
              <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                <td className="p-3 font-black uppercase tracking-tight">{p.name} <span className="text-[7px] text-slate-400 ml-1 italic">{p.category}</span></td>
                <td className="p-3"><span className={`px-1.5 py-0.5 rounded text-[7px] font-black uppercase tracking-widest ${p.type === 'LINEN' ? 'bg-indigo-50 text-indigo-600' : 'bg-emerald-50 text-emerald-600'}`}>{p.type === 'LINEN' ? 'Lavanderia' : 'Prodotto'}</span></td>
                <td className="p-3 text-slate-400 font-bold uppercase">{p.unit}</td>
                <td className="p-3 text-right"><button onClick={() => onDelete(p.id)} className="p-1 text-slate-300 hover:text-red-500"><Trash size={14}/></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const DashboardView: React.FC<{ structures: Structure[], onSelectStructure: (id: string) => void, role: Role, pendingOrdersCount: number, onNavigateToOrders: () => void, onAddStructure: () => void }> = ({ structures, onSelectStructure, pendingOrdersCount, onNavigateToOrders, onAddStructure, role }) => (
  <div className="animate-fade-in max-w-6xl mx-auto">
    <div className="flex flex-col md:flex-row md:items-end justify-between gap-3 mb-6">
      <div><h2 className="text-xl font-black text-slate-900 tracking-tight">Proprietà</h2><p className="text-slate-400 font-medium text-[10px] uppercase tracking-widest">Scegli la struttura su cui operare</p></div>
      {role === Role.ADMIN && <button onClick={onAddStructure} className="flex items-center gap-1.5 bg-emerald-600 text-white px-3 py-2 rounded-lg font-black shadow active:scale-95 uppercase text-[8px] tracking-widest"><Plus size={14} /> NUOVA PROPRIETÀ</button>}
    </div>
    {pendingOrdersCount > 0 && (
      <div onClick={onNavigateToOrders} className="mb-6 bg-slate-900 text-white p-4 rounded-xl flex items-center justify-between cursor-pointer hover:bg-emerald-600 shadow-xl group border border-white/5 transition-all">
        <div className="flex items-center gap-3"><div className="bg-emerald-500 p-2 rounded-lg"><Bell size={18} /></div><div><p className="text-sm font-black uppercase tracking-tight">Hai {pendingOrdersCount} nuovi ordini in coda</p><p className="text-emerald-400 font-bold uppercase text-[7px] tracking-widest">Azione richiesta</p></div></div>
        <div className="bg-white/10 px-2 py-1 rounded text-[8px] font-black uppercase tracking-widest group-hover:bg-white group-hover:text-emerald-600 transition-all">GESTISCI</div>
      </div>
    )}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {structures.map(s => (
        <div key={s.id} onClick={() => onSelectStructure(s.id)} className="bg-white rounded-xl shadow-sm hover:shadow-lg cursor-pointer border border-slate-200 overflow-hidden group transition-all hover:-translate-y-0.5">
          <div className="relative h-32 overflow-hidden border-b border-slate-100">
            <img src={s.imageUrl || `https://picsum.photos/seed/${s.id}/800/400`} className="h-full w-full object-cover group-hover:scale-105 transition-all duration-700 opacity-80" alt={s.name} />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 to-transparent"></div>
            <div className="absolute bottom-2.5 left-3 text-white">
              <h3 className="font-black text-sm uppercase tracking-tighter leading-none">{s.name}</h3>
              <p className="text-white/70 text-[7px] font-bold flex items-center gap-1 mt-0.5 tracking-widest uppercase"><MapPin size={10} /> {s.address}</p>
            </div>
          </div>
          <div className="p-3.5 flex items-center justify-between"><span className="text-[7px] font-black uppercase text-slate-400 tracking-widest">Attivo</span><div className="text-slate-900 font-black flex items-center gap-1.5 group-hover:text-emerald-600 transition-all uppercase text-[7px] tracking-widest">Vai alla gestione <ArrowRight size={9}/></div></div>
        </div>
      ))}
    </div>
  </div>
);

const ArrowRight = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
);

const StructureDetailView: React.FC<{
  structureId: string; currentUser: User; damageReports: DamageReport[]; structures: Structure[]; users: User[];
  onBack: () => void; onNewInventory: (t: ItemType) => void; onRequestOrder: (t: ItemType) => void;
  onReportDamage: () => void; onReportLinen: () => void; onUpdateDamageStatus: (id: string, s: any) => void;
}> = ({ structureId, structures, damageReports, users, onBack, onNewInventory, onRequestOrder, onReportDamage, onReportLinen, onUpdateDamageStatus }) => {
  const structure = structures.find(s => s.id === structureId);
  const [activeTab, setActiveTab] = useState<'info' | 'damages'>('info');
  if (!structure) return null;
  const structDamages = damageReports.filter(d => d.structureId === structure.id && d.status !== 'ARCHIVED');

  return (
    <div className="max-w-5xl mx-auto animate-fade-in">
      <button onClick={onBack} className="flex items-center gap-1 text-slate-400 mb-4 hover:text-emerald-600 font-black uppercase text-[8px] tracking-widest">
        <div className="p-1 bg-white rounded border border-slate-200 shadow-sm"><X size={10} /></div> TORNA ALLE PROPRIETÀ
      </button>
      <div className="bg-slate-900 p-5 rounded-xl shadow-xl mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4 border border-white/5 relative overflow-hidden">
        <div><h1 className="text-2xl font-black text-white tracking-tighter uppercase leading-none">{structure.name}</h1><p className="text-emerald-400 font-bold text-[10px] mt-1 tracking-widest uppercase flex items-center gap-1.5 opacity-80"><MapPin size={12} /> {structure.address}</p></div>
        <div className="relative bg-white/5 border border-white/10 p-3 rounded-lg flex items-center gap-3">
          <div className="bg-emerald-500 p-1.5 rounded text-white"><Key size={16} /></div>
          <div><p className="text-[6px] text-white/40 uppercase font-black tracking-widest mb-0.5">Note Accesso</p><span className="text-white font-black text-base tracking-wider">{structure.accessCodes}</span></div>
        </div>
      </div>
      <div className="flex gap-6 mb-6 border-b border-slate-200 text-[9px] font-black uppercase tracking-widest">
        <button onClick={() => setActiveTab('info')} className={`pb-2.5 relative ${activeTab === 'info' ? 'text-emerald-600' : 'text-slate-400'}`}>Operatività {activeTab === 'info' && <div className="absolute bottom-[-1px] left-0 w-full h-0.5 bg-emerald-600 rounded-full"></div>}</button>
        <button onClick={() => setActiveTab('damages')} className={`pb-2.5 relative ${activeTab === 'damages' ? 'text-emerald-600' : 'text-slate-400'}`}>Guasti ({structDamages.filter(d=>d.status==='OPEN').length}) {activeTab === 'damages' && <div className="absolute bottom-[-1px] left-0 w-full h-0.5 bg-emerald-600 rounded-full"></div>}</button>
      </div>
      {activeTab === 'info' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <ActionCard icon={<Box size={22} className="text-emerald-600" />} title="Inventario Prodotti" desc="Conteggio consumabili" onClick={() => onNewInventory('PRODUCT')} />
          <ActionCard icon={<Shirt size={22} className="text-indigo-600" />} title="Inventario Lavanderia" desc="Conta biancheria pulita" onClick={() => onNewInventory('LINEN')} />
          <ActionCard icon={<ShoppingCart size={22} className="text-amber-600" />} title="Ordina Prodotti" desc="Rifornimento articoli" onClick={() => onRequestOrder('PRODUCT')} bg="bg-amber-50" />
          <ActionCard icon={<Truck size={22} className="text-blue-600" />} title="Ordina Biancheria" desc="Richiesta kit puliti" onClick={() => onRequestOrder('LINEN')} bg="bg-blue-50" />
          <ActionCard icon={<RefreshCw size={22} className="text-purple-600" />} title="Resi Lavanderia" desc="Sporco / Anomalie" onClick={onReportLinen} bg="bg-purple-50" />
          <ActionCard icon={<AlertTriangle size={22} className="text-red-600" />} title="Nuovo Guasto" desc="Urgente manutenzione" onClick={onReportDamage} bg="bg-red-50" />
        </div>
      )}
      {activeTab === 'damages' && (
        <div className="space-y-2.5">
          {structDamages.length === 0 && <div className="text-center py-10 bg-white rounded-xl text-slate-300 font-bold uppercase tracking-widest text-[9px] border border-slate-200">Nessuna segnalazione aperta</div>}
          {structDamages.map(d => (
            <div key={d.id} className={`p-4 rounded-xl border bg-white shadow-sm ${d.status === 'RESOLVED' ? 'opacity-50 grayscale bg-slate-50' : 'border-slate-200'}`}>
              <div className="flex justify-between items-start gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-1.5 mb-1.5"><span className={`text-[6px] px-1.5 py-0.5 rounded font-black uppercase tracking-widest ${d.status === 'OPEN' ? 'bg-red-600 text-white' : 'bg-emerald-600 text-white'}`}>{d.status}</span><span className="text-[8px] text-slate-400 font-black">{new Date(d.date).toLocaleDateString()}</span></div>
                  <p className="font-black text-slate-800 text-xs leading-tight uppercase tracking-tight mb-2">{d.notes}</p>
                  <p className="text-[8px] text-slate-400 font-bold uppercase flex items-center gap-1.5">Da: <span className="text-slate-900 font-black">{users.find(u => u.id === d.reporterId)?.name}</span></p>
                </div>
                <div className="flex flex-col gap-1.5">
                  {d.status === 'OPEN' && (
                    <button 
                      onClick={() => onUpdateDamageStatus(d.id, 'RESOLVED')} 
                      className="p-1.5 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded hover:bg-emerald-600 hover:text-white transition-colors"
                    >
                      <Check size={12}/>
                    </button>
                  )}
                  <button onClick={() => onUpdateDamageStatus(d.id, 'ARCHIVED')} className="p-1.5 bg-slate-50 text-slate-400 border border-slate-200 rounded hover:text-red-500"><Trash size={12}/></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const ActionCard: React.FC<{ icon: any, title: string, desc: string, onClick: () => void, bg?: string }> = ({ icon, title, desc, onClick, bg = "bg-white" }) => (
  <div onClick={onClick} className={`cursor-pointer ${bg} p-4 rounded-xl border border-slate-200 hover:shadow shadow-sm transition-all flex flex-col items-center text-center gap-3 group active:scale-95`}>
    <div className="p-3 bg-white rounded-lg shadow-sm group-hover:scale-105 transition-transform border border-slate-50">{icon}</div>
    <div><h3 className="font-black text-slate-800 text-[10px] uppercase tracking-widest mb-0.5 leading-none">{title}</h3><p className="text-[9px] text-slate-400 font-medium leading-tight">{desc}</p></div>
  </div>
);

const NewOrderView: React.FC<{ structureId: string, currentUser: User, products: Product[], type: ItemType, onSave: (o: any) => void, onCancel: () => void }> = ({ structureId, currentUser, products, type, onSave, onCancel }) => {
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const filtered = products.filter(p => p.type === type);
  const [signer, setSigner] = useState(currentUser.name);

  return (
    <div className="max-w-xl mx-auto bg-white p-6 rounded-xl shadow-xl border border-slate-200 animate-fade-in">
      <h2 className="text-lg font-black text-slate-900 mb-1 uppercase tracking-tighter leading-none">Nuovo Ordine {type === 'LINEN' ? 'Lavanderia' : 'Prodotti'}</h2>
      <p className="text-slate-400 font-bold uppercase text-[7px] tracking-[0.2em] mb-5">Elenco completo catalogo attivo</p>
      <div className="space-y-1.5 mb-6 max-h-[300px] overflow-y-auto pr-1.5 custom-scrollbar text-[11px]">
        {filtered.map(p => (
          <div key={p.id} className="flex justify-between items-center p-2.5 bg-slate-50 rounded-lg border border-slate-100">
            <span className="font-black text-slate-700 uppercase tracking-tight">{p.name} <span className="text-[7px] text-slate-400 block font-bold italic">{p.unit}</span></span>
            <div className="flex items-center gap-2">
              <button onClick={() => setQuantities({...quantities, [p.id]: Math.max(0, (quantities[p.id]||0) - 1)})} className="p-1 bg-white rounded border border-slate-200"><Minus size={11} /></button>
              <span className="font-black w-6 text-center text-slate-900">{quantities[p.id] || 0}</span>
              <button onClick={() => setQuantities({...quantities, [p.id]: (quantities[p.id]||0) + 1})} className="p-1 bg-white rounded border border-slate-200"><Plus size={11} /></button>
            </div>
          </div>
        ))}
      </div>
      <div className="mb-6 bg-slate-900 p-4 rounded-lg"><label className="block text-[7px] font-black text-emerald-400 uppercase tracking-widest mb-1.5">Convalida Operatore</label><input className="w-full bg-white/5 border border-white/10 p-2 rounded focus:border-emerald-500 outline-none font-black text-white text-base tracking-tight" value={signer} onChange={e => setSigner(e.target.value)} /></div>
      <div className="flex gap-2"><button onClick={() => { const items = Object.entries(quantities).filter(([_,q])=>q>0).map(([pid, q]) => ({ productId: pid, quantity: q })); onSave({ structureId, requesterId: currentUser.id, dateCreated: new Date().toISOString(), items, status: OrderStatus.PENDING, type, signatureUrl: signer }); }} className="flex-1 bg-emerald-600 text-white py-3 rounded-lg font-black text-[9px] uppercase tracking-widest shadow active:scale-95">CONFERMA E INVIA</button><button onClick={onCancel} className="px-6 bg-slate-100 text-slate-500 rounded-lg font-black text-[9px] uppercase tracking-widest border border-slate-200 active:scale-95">CHIUDI</button></div>
    </div>
  );
};

const NewInventoryView: React.FC<{ structureId: string, currentUser: User, products: Product[], type: ItemType, onSave: (i: any) => void, onCancel: () => void }> = ({ structureId, currentUser, products, type, onSave, onCancel }) => {
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [signer, setSigner] = useState(currentUser.name);
  const filtered = products.filter(p => p.type === type);

  return (
    <div className="max-w-xl mx-auto bg-white p-6 rounded-xl shadow-xl animate-fade-in border border-slate-200">
      <h2 className="text-lg font-black text-slate-900 mb-6 uppercase tracking-widest leading-none text-center">Inventario {type === 'LINEN' ? 'Lavanderia' : 'Prodotti'}</h2>
      <div className="space-y-1.5 mb-6 max-h-[300px] overflow-y-auto pr-1.5 custom-scrollbar text-[11px]">
        {filtered.map(p => (
          <div key={p.id} className="flex justify-between items-center p-2.5 border border-slate-100 rounded-lg bg-slate-50/50">
            <span className="font-black text-slate-700 uppercase tracking-tight">{p.name} <span className="text-[7px] text-slate-300 block font-bold">{p.unit}</span></span>
            <input type="number" className="w-14 border border-slate-200 rounded p-1.5 text-center font-black text-[11px] outline-none focus:border-emerald-500 bg-white" placeholder="0" onChange={e => setQuantities({...quantities, [p.id]: Math.max(0, parseInt(e.target.value)||0)})} />
          </div>
        ))}
      </div>
      <div className="mb-6 bg-slate-50 p-4 rounded-lg border border-slate-200"><label className="block text-[7px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Convalida Nome</label><input className="w-full border border-slate-200 p-2 rounded focus:border-emerald-500 bg-white font-black text-base outline-none shadow-sm" value={signer} onChange={e => setSigner(e.target.value)} /></div>
      <div className="flex gap-2"><button onClick={() => { const items = Object.entries(quantities).filter(([_,q])=>q>0).map(([pid, q]) => ({ productId: pid, quantity: q })); onSave({ structureId, operatorId: currentUser.id, date: new Date().toISOString(), items, type, signatureUrl: signer }); }} className="flex-1 bg-emerald-600 text-white py-3 rounded-lg font-black text-[9px] uppercase tracking-widest shadow active:scale-95 transition-all">SALVA DATI</button><button onClick={onCancel} className="px-7 bg-slate-100 text-slate-500 rounded-lg font-black text-[9px] uppercase tracking-widest border border-slate-200">ANNULLA</button></div>
    </div>
  );
};

const NewDamageReportView: React.FC<{ structureId: string, currentUser: User, onSave: (r: any) => void, onCancel: () => void }> = ({ structureId, currentUser, onSave, onCancel }) => {
  const [notes, setNotes] = useState('');
  return (
    <div className="max-w-lg mx-auto bg-white p-6 rounded-xl shadow-xl border border-slate-200 animate-fade-in">
      <h2 className="text-lg font-black text-slate-900 mb-6 uppercase tracking-tighter">Segnalazione Malfunzionamento</h2>
      <textarea className="w-full border border-slate-200 p-3 rounded-lg focus:border-red-500 bg-slate-50 outline-none h-28 font-bold text-[11px] uppercase leading-tight mb-6" placeholder="Dettagli del guasto..." value={notes} onChange={e => setNotes(e.target.value)} />
      <div className="flex gap-2"><button onClick={() => onSave({ structureId, reporterId: currentUser.id, date: new Date().toISOString(), items: [], notes, status: 'OPEN' })} className="flex-1 bg-red-600 text-white py-3 rounded-lg font-black uppercase tracking-widest text-[9px] shadow active:scale-95 transition-all">INVIA REPORT</button><button onClick={onCancel} className="px-7 bg-slate-100 text-slate-500 rounded-lg font-black text-[9px] uppercase tracking-widest border border-slate-200 active:scale-95">CHIUDI</button></div>
    </div>
  );
};

const ManageOrdersView: React.FC<{ 
  orders: Order[], structures: Structure[], products: Product[], users: User[], currentUser: User, targetType: ItemType, 
  onUpdateOrder: (o: Order, s: OrderStatus) => void, onDeleteOrder: (id: string) => void 
}> = ({ orders, structures, products, users, targetType, onUpdateOrder, onDeleteOrder }) => {
  const filtered = orders.filter(o => o.type === targetType).sort((a,b) => new Date(b.dateCreated).getTime() - new Date(a.dateCreated).getTime());
  return (
    <div className="max-w-4xl mx-auto animate-fade-in">
      <h2 className="text-xl font-black text-slate-900 mb-6 uppercase tracking-tighter">Registro Ordini {targetType === 'LINEN' ? 'Lavanderia' : 'Prodotti'}</h2>
      <div className="space-y-3">
        {filtered.map(o => (
          <div key={o.id} className={`bg-white p-4 rounded-xl border shadow-sm ${o.status === OrderStatus.PENDING ? 'border-amber-300' : 'border-emerald-300'}`}>
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="flex-1"><h3 className="font-black text-base text-slate-900 uppercase tracking-tighter leading-none mb-1">{structures.find(s => s.id === o.structureId)?.name}</h3><p className="text-[7px] text-slate-400 font-bold mb-3 tracking-widest uppercase">Da: {users.find(u => u.id === o.requesterId)?.name} - {new Date(o.dateCreated).toLocaleDateString()}</p>
                <div className="flex flex-wrap gap-1">{o.items.map(i => (<div key={i.productId} className="bg-slate-50 border border-slate-100 px-1.5 py-0.5 rounded text-[7px] font-black uppercase text-slate-600">{products.find(p=>p.id===i.productId)?.name}: <span className="text-emerald-600">{i.quantity}</span></div>))}</div>
              </div>
              <div className="flex gap-1.5">
                {o.status === OrderStatus.PENDING && (
                  <><button onClick={() => onUpdateOrder(o, OrderStatus.SENT)} className="bg-emerald-600 text-white px-3 py-2 rounded font-black text-[8px] uppercase tracking-widest active:scale-95 transition-all">CONVALIDA</button>
                  <button onClick={() => onDeleteOrder(o.id)} className="p-2 bg-red-50 text-red-600 rounded active:scale-95 transition-all"><Trash size={13} /></button></>
                )}
                {o.status === OrderStatus.SENT && <span className="bg-emerald-50 text-emerald-600 px-3 py-2 rounded text-[8px] font-black uppercase tracking-widest border border-emerald-100 flex items-center gap-1.5"><Check size={12}/> INVIATO</span>}
              </div>
            </div>
          </div>
        ))}
        {filtered.length === 0 && <div className="text-center py-12 text-slate-300 font-black uppercase tracking-widest text-[8px] border border-dashed border-slate-200 rounded-xl bg-white shadow-sm">Nessun ordine presente</div>}
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
    <div className="max-w-2xl mx-auto bg-white p-6 rounded-xl shadow-xl animate-fade-in border border-slate-200">
      <h2 className="text-lg font-black text-slate-900 mb-6 uppercase tracking-widest leading-none text-center">Resoconto Carichi</h2>
      <div className="space-y-1.5 mb-6 max-h-[350px] overflow-y-auto pr-1 text-[11px] custom-scrollbar">
        {linen.map(p => (
          <div key={p.id} className="p-3.5 border border-slate-100 rounded-lg bg-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-sm hover:border-emerald-300 transition-all">
            <span className="font-black text-slate-800 uppercase tracking-tighter">{p.name}</span>
            <div className="flex gap-1.5 text-center">
              <div><label className="text-[6px] font-black uppercase block text-red-500 mb-0.5">Sporca</label><input type="number" className="w-9 border border-slate-200 rounded p-1 text-center font-black bg-white" placeholder="0" onChange={e => setDirty({...dirty, [p.id]: parseInt(e.target.value)||0})} /></div>
              <div><label className="text-[6px] font-black uppercase block text-orange-500 mb-0.5">Rotta</label><input type="number" className="w-9 border border-slate-200 rounded p-1 text-center font-black bg-white" placeholder="0" onChange={e => setBroken({...broken, [p.id]: parseInt(e.target.value)||0})} /></div>
              <div><label className="text-[6px] font-black uppercase block text-blue-500 mb-0.5">Intatta</label><input type="number" className="w-9 border border-slate-200 rounded p-1 text-center font-black bg-white" placeholder="0" onChange={e => setUnused({...unused, [p.id]: parseInt(e.target.value)||0})} /></div>
            </div>
          </div>
        ))}
      </div>
      <div className="mb-6 bg-slate-900 p-4 rounded-lg"><label className="block text-[7px] font-black text-emerald-400 uppercase tracking-widest mb-1">Firma Operatore</label><input className="w-full bg-white/5 border border-white/10 p-2 rounded focus:border-emerald-500 outline-none font-black text-white text-base tracking-tight" value={signer} onChange={e => setSigner(e.target.value)} /></div>
      <div className="flex gap-2"><button onClick={() => { const d = Object.entries(dirty).map(([p,q])=>({productId:p, quantity:q})); const u = Object.entries(unused).map(([p,q])=>({productId:p, quantity:q})); const b = Object.entries(broken).map(([p,q])=>({productId:p, quantity:q})); onSave({ structureId, operatorId: currentUser.id, date: new Date().toISOString(), dirtyItems: d, unusedItems: u, brokenItems: b, signatureUrl: signer }); }} className="flex-1 bg-indigo-600 text-white py-3 rounded-lg font-black uppercase tracking-widest text-[9px] active:scale-95 transition-all">SALVA REPORT</button><button onClick={onCancel} className="px-8 bg-slate-100 text-slate-500 rounded-lg font-black uppercase tracking-widest text-[9px] active:scale-95 border border-slate-200">CHIUDI</button></div>
    </div>
  );
};

const AdminLinenSummaryView: React.FC<{ onBack: () => void }> = ({ onBack }) => (
  <div className="max-w-4xl mx-auto animate-fade-in text-center">
    <button onClick={onBack} className="text-slate-400 font-black mb-5 uppercase text-[8px] tracking-widest flex items-center gap-1 border border-slate-200 p-1 bg-white rounded shadow-sm hover:text-emerald-600"><X size={12}/> CHIUDI LOG</button>
    <h2 className="text-xl font-black text-slate-900 mb-6 uppercase tracking-tighter">Archivio Report Lavanderia</h2>
    <div className="bg-white rounded-xl shadow p-8 border border-slate-200 text-slate-300 font-black uppercase tracking-widest text-[9px] bg-slate-50/20 italic">Storico attività amministrativa non ancora disponibile</div>
  </div>
);

const SupplierDashboardView: React.FC<{ orders: Order[], structures: Structure[], products: Product[], currentUser: User, onOrderDelivered: () => void }> = ({ orders, structures, products, currentUser, onOrderDelivered }) => {
  const supplierOrders = orders.filter(o => o.status === OrderStatus.SENT && o.type === 'PRODUCT').sort((a,b) => new Date(b.dateCreated).getTime() - new Date(a.dateCreated).getTime());
  return (
    <div className="max-w-4xl mx-auto animate-fade-in">
      <div className="bg-slate-900 text-white p-6 rounded-xl mb-6 border-b-4 border-emerald-500 shadow-xl">
        <h2 className="text-2xl font-black tracking-tighter uppercase leading-none">Ordini in Consegna</h2>
        <p className="text-emerald-400 font-black text-[10px] uppercase tracking-widest opacity-80 mt-1">Fornitore: {currentUser.name}</p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {supplierOrders.map(o => (
          <div key={o.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <h3 className="text-lg font-black text-slate-900 tracking-tighter uppercase mb-0.5">{structures.find(s => s.id === o.structureId)?.name}</h3>
            <p className="text-emerald-600 font-bold text-[8px] mb-4 flex items-center gap-1.5 uppercase tracking-widest opacity-80"><MapPin size={11} /> {structures.find(s => s.id === o.structureId)?.address}</p>
            <div className="bg-slate-50 p-3 rounded-lg mb-4 space-y-1 text-[10px] font-black uppercase border border-slate-100">
              {o.items.map(i => (
                <div key={i.productId} className="flex justify-between items-center text-slate-500">
                  <span>{products.find(p=>p.id===i.productId)?.name}</span><span className="text-slate-900 bg-white px-1.5 py-0.5 rounded border border-slate-100">x{i.quantity}</span>
                </div>
              ))}
            </div>
            <button onClick={async () => {
              await supabase.from('orders').update({ status: OrderStatus.DELIVERED }).eq('id', o.id);
              onOrderDelivered();
            }} className="w-full bg-slate-900 text-white py-3 rounded-lg font-black shadow-lg hover:bg-emerald-600 active:scale-95 transition-all uppercase tracking-widest text-[9px] flex items-center justify-center gap-1.5"><Check size={14}/> CONSEGNA COMPLETATA</button>
          </div>
        ))}
        {supplierOrders.length === 0 && <div className="col-span-full text-center py-16 text-slate-300 font-black uppercase tracking-widest text-xs border border-dashed border-slate-200 rounded-xl bg-white italic">Nessun ordine da consegnare al momento</div>}
      </div>
    </div>
  );
};

const AddStructureView: React.FC<{ onSave: (s: any) => void, onCancel: () => void }> = ({ onSave, onCancel }) => {
  const [form, setForm] = useState({ name: '', address: '', accessCodes: '' });
  return (
    <div className="max-w-lg mx-auto bg-white p-6 rounded-xl shadow-xl border border-slate-200 animate-fade-in text-[11px]">
      <h2 className="text-lg font-black text-slate-900 mb-0.5 uppercase tracking-tighter">Nuova Proprietà</h2>
      <p className="text-slate-400 mb-6 font-medium uppercase text-[8px] tracking-widest">Registra nuova anagrafica</p>
      <div className="space-y-4 mb-6">
        <div className="space-y-1"><label className="text-[7px] font-black uppercase text-slate-400 px-1 tracking-widest">Nome Struttura</label><input className="w-full border border-slate-200 p-2 rounded-lg bg-slate-50 font-bold outline-none focus:border-emerald-500" value={form.name} onChange={e => setForm({...form, name: e.target.value})} /></div>
        <div className="space-y-1"><label className="text-[7px] font-black uppercase text-slate-400 px-1 tracking-widest">Indirizzo</label><input className="w-full border border-slate-200 p-2 rounded-lg bg-slate-50 font-bold outline-none focus:border-emerald-500" value={form.address} onChange={e => setForm({...form, address: e.target.value})} /></div>
        <div className="space-y-1"><label className="text-[7px] font-black uppercase text-slate-400 px-1 tracking-widest">Accessi</label><textarea className="w-full border border-slate-200 p-2 rounded-lg bg-slate-50 font-bold outline-none h-20" value={form.accessCodes} onChange={e => setForm({...form, accessCodes: e.target.value})} placeholder="Es: Keybox 1234" /></div>
      </div>
      <div className="flex gap-2"><button onClick={() => onSave(form)} className="flex-1 bg-slate-900 text-white py-3 rounded-lg font-black shadow active:scale-95 transition-all uppercase tracking-widest text-[9px]">REGISTRA</button><button onClick={onCancel} className="px-7 bg-slate-100 text-slate-500 rounded-lg font-black hover:bg-slate-200 transition-all uppercase tracking-widest text-[9px]">ANNULLA</button></div>
    </div>
  );
};

export default App;
