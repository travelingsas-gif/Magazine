
import React, { useState, useMemo, useEffect } from 'react';
import { 
  Building2, Box, ShoppingCart, LogOut, Menu, X, 
  Plus, Send, AlertCircle, Clock, Bell, Truck, MapPin, 
  RefreshCw, Shirt, AlertTriangle, UserCheck, Loader, 
  Download, Trash, CheckCircle2, History, Minus, Key, Calendar, Save, Edit2, ArrowRight
} from 'lucide-react';
import { 
  Role, User, Product, Structure, InventoryReport, Order, 
  OrderStatus, InventoryItem, ItemType, DamageReport, UnusedLinenReport 
} from './types';
import { supabase } from './supabaseClient';

// --- Helpers ---
const mapUser = (u: any): User => ({ id: u.id, name: u.name, email: u.email, role: u.role as Role, password: u.password });
const mapStructure = (s: any): Structure => ({ id: s.id, name: s.name, address: s.address, accessCodes: s.access_codes, imageUrl: s.image_url });
const mapProduct = (p: any): Product => ({ id: p.id, name: p.name, category: p.category, unit: p.unit, type: p.type });
const mapInventory = (i: any): InventoryReport => ({ id: i.id, structureId: i.structure_id, operator_id: i.operator_id, date: i.date, items: i.items, signature_url: i.signature_url, photo_url: i.photo_url, notes: i.notes, type: i.type });
const mapOrder = (o: any): Order => ({ id: o.id, structureId: o.structure_id, requester_id: o.requester_id, dateCreated: o.date_created, dateSent: o.date_sent, sentToEmail: o.sent_to_email, items: o.items, status: o.status as OrderStatus, type: o.type as ItemType, signature_url: o.signature_url });
const mapDamageReport = (d: any): DamageReport => ({ id: d.id, structure_id: d.structure_id, reporter_id: d.reporter_id, date: d.date, items: d.items, notes: d.notes, status: d.status });
const mapUnusedLinen = (l: any): UnusedLinenReport => ({ id: l.id, structureId: l.structure_id, operatorId: l.operator_id, date: l.date, dirtyItems: l.dirty_items || [], unusedItems: l.unused_items || [], brokenItems: l.broken_items || [], notes: l.notes, signature_url: l.signature_url });

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

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50 flex-col gap-4"><Loader className="animate-spin text-emerald-600" size={48} /><p>Caricamento sistema...</p></div>;
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
                      if (!error && data) { setStructures([...structures, mapStructure(data)]); setCurrentView('dashboard'); }
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
                    openConfirm("Salva Inventario", "Confermi il salvataggio dei dati con la firma inserita?", async () => {
                      const { data, error } = await supabase.from('inventories').insert({
                        structure_id: inv.structureId, operator_id: inv.operatorId,
                        date: inv.date, items: inv.items, signature_url: inv.signatureUrl, photo_url: inv.photoUrl,
                        notes: inv.notes, type: inv.type
                      }).select().single();
                      if(!error && data) { setInventories([...inventories, mapInventory(data)]); setCurrentView('structure-detail'); fetchData(); }
                      setConfirmModal(null);
                    });
                  }}
                  onCancel={() => setCurrentView('structure-detail')}
               />;
      case 'order-new':
        return <NewOrderView 
                  structureId={selectedStructureId!} currentUser={currentUser} products={products} type={activeItemType}
                  onSave={async (ord) => {
                    openConfirm("Invia Richiesta Ordine", "La richiesta verrà notificata alla Reception e all'Admin. Confermi?", async () => {
                      const { data, error } = await supabase.from('orders').insert({
                        structure_id: ord.structureId, requester_id: ord.requesterId,
                        date_created: ord.dateCreated, items: ord.items, status: ord.status, type: ord.type, signature_url: ord.signatureUrl
                      }).select().single();
                      if (!error && data) { setOrders([...orders, mapOrder(data)]); setCurrentView('structure-detail'); fetchData(); }
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
                    if(!error && data) { setDamageReports([...damageReports, mapDamageReport(data)]); setCurrentView('structure-detail'); fetchData(); }
                    setConfirmModal(null);
                  });
                }}
                onCancel={() => setCurrentView('structure-detail')}
              />;
      case 'unused-linen-new':
        return <NewUnusedLinenView 
                structureId={selectedStructureId!} currentUser={currentUser} products={products}
                onSave={async (rep) => {
                  openConfirm("Salva Report Biancheria", "Tutti i dati verranno salvati nel registro storico. Confermi?", async () => {
                    const { data, error } = await supabase.from('unused_linen_reports').insert({
                      structure_id: rep.structureId, operator_id: rep.operatorId,
                      date: rep.date, dirty_items: rep.dirtyItems, unused_items: rep.unusedItems, broken_items: rep.brokenItems,
                      notes: rep.notes, signature_url: rep.signature_url
                    }).select().single();
                    if (!error && data) { setUnusedLinenReports([...unusedLinenReports, mapUnusedLinen(data)]); setCurrentView('structure-detail'); fetchData(); }
                    setConfirmModal(null);
                  });
                }}
                onCancel={() => setCurrentView('structure-detail')}
              />;
      case 'admin-linen-summary':
        return <AdminLinenSummaryView reports={unusedLinenReports} products={products} structures={structures} users={users} />;
      case 'orders-products': 
        return <ManageOrdersView orders={orders} structures={structures} products={products} users={users} currentUser={currentUser} targetType="PRODUCT" onUpdateOrder={async (o) => { await supabase.from('orders').update({ items: o.items, status: o.status }).eq('id', o.id); fetchData(); }} onDeleteOrder={async (id) => { await supabase.from('orders').delete().eq('id', id); fetchData(); }} />;
      case 'orders-linen': 
        return <ManageOrdersView orders={orders} structures={structures} products={products} users={users} currentUser={currentUser} targetType="LINEN" onUpdateOrder={async (o) => { await supabase.from('orders').update({ items: o.items, status: o.status }).eq('id', o.id); fetchData(); }} onDeleteOrder={async (id) => { await supabase.from('orders').delete().eq('id', id); fetchData(); }} />;
      case 'supplier-dashboard':
        return <SupplierDashboardView orders={orders} structures={structures} products={products} currentUser={currentUser} />;
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
              <button onClick={confirmModal.onConfirm} className="flex-1 bg-emerald-600 text-white py-4 rounded-2xl font-black shadow-lg shadow-emerald-200 active:scale-95 transition-all">CONFERMA E SALVA</button>
              <button onClick={() => setConfirmModal(null)} className="flex-1 bg-slate-100 text-slate-500 py-4 rounded-2xl font-black active:scale-95 transition-all">ANNULLA</button>
            </div>
          </div>
        </div>
      )}

      <div className="md:hidden bg-white shadow-sm p-4 flex justify-between items-center sticky top-0 z-20">
        <h1 className="text-xl font-black text-emerald-700">CleanManage</h1>
        <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-2 bg-slate-100 rounded-xl">{isMenuOpen ? <X /> : <Menu />}</button>
      </div>
      
      <aside className={`fixed inset-y-0 left-0 transform ${isMenuOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0 transition duration-300 ease-in-out w-72 bg-slate-900 text-white p-8 flex flex-col z-30 shadow-2xl`}>
        <div className="hidden md:flex items-center gap-3 mb-12">
          <div className="bg-emerald-500 p-2 rounded-xl shadow-lg shadow-emerald-500/20"><Building2 size={24} className="text-white" /></div>
          <span className="text-2xl font-black tracking-tight">CleanManage</span>
        </div>
        
        <nav className="flex-1 space-y-3">
          {currentUser.role !== Role.SUPPLIER && (
            <NavItem icon={<Building2 size={22} />} label="Strutture" active={currentView === 'dashboard'} onClick={() => { setCurrentView('dashboard'); setIsMenuOpen(false); }} />
          )}
          {(currentUser.role === Role.ADMIN || currentUser.role === Role.RECEPTION) && (
            <>
              <div className="pt-8 pb-3 text-[10px] text-slate-500 uppercase font-black tracking-[0.2em]">Dashboard Reception</div>
              <NavItem icon={<ShoppingCart size={22} />} label="Ordini Prodotti" badge={getUnreadOrdersCount('PRODUCT')} active={currentView === 'orders-products'} onClick={() => { setCurrentView('orders-products'); setIsMenuOpen(false); }} />
              <NavItem icon={<Shirt size={22} />} label="Ordini Lavanderia" badge={getUnreadOrdersCount('LINEN')} active={currentView === 'orders-linen'} onClick={() => { setCurrentView('orders-linen'); setIsMenuOpen(false); }} />
            </>
          )}
          {currentUser.role === Role.ADMIN && (
            <NavItem icon={<History size={22} />} label="Report Biancheria" active={currentView === 'admin-linen-summary'} onClick={() => { setCurrentView('admin-linen-summary'); setIsMenuOpen(false); }} />
          )}
          {currentUser.role === Role.SUPPLIER && (
            <NavItem icon={<Truck size={22} />} label="Ordini Consegna" active={currentView === 'supplier-dashboard'} onClick={() => { setCurrentView('supplier-dashboard'); setIsMenuOpen(false); }} />
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
          <button onClick={handleLogout} className="w-full flex items-center gap-3 text-slate-400 hover:text-red-400 font-bold transition-colors p-2"><LogOut size={20} /><span>Esci dal Portale</span></button>
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
          <h2 className="text-3xl font-black text-center text-slate-900 mb-2">Benvenuto</h2>
          <p className="text-center text-slate-400 mb-10 font-medium">Accedi per gestire il magazzino</p>
          <form onSubmit={(e) => { e.preventDefault(); onLogin(email, password); }} className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-slate-400 px-1 tracking-widest">Email Aziendale</label>
              <input className="w-full border-2 border-slate-50 p-4 rounded-2xl focus:border-emerald-500 focus:bg-white bg-slate-50 transition-all outline-none font-bold" type="email" placeholder="nome@azienda.it" value={email} onChange={e => setEmail(e.target.value)} required />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-slate-400 px-1 tracking-widest">Password</label>
              <input className="w-full border-2 border-slate-50 p-4 rounded-2xl focus:border-emerald-500 focus:bg-white bg-slate-50 transition-all outline-none font-bold" type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required />
            </div>
            <button className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black shadow-xl shadow-slate-900/20 hover:bg-emerald-600 transition-all active:scale-95 mt-6">ENTRA NEL SISTEMA</button>
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
        <h2 className="text-4xl font-black text-slate-900 tracking-tight">Le tue Proprietà</h2>
        <p className="text-slate-400 font-medium text-lg mt-1">Gestisci inventari, ordini e guasti.</p>
      </div>
      {role === Role.ADMIN && (
        <button onClick={onAddStructure} className="flex items-center gap-3 bg-emerald-600 text-white px-8 py-4 rounded-2xl font-black shadow-xl shadow-emerald-500/20 hover:bg-emerald-700 transition-all active:scale-95">
          <Plus size={24} /> NUOVA STRUTTURA
        </button>
      )}
    </div>

    {pendingOrdersCount > 0 && (
      <div onClick={onNavigateToOrders} className="mb-10 bg-slate-900 text-white p-8 rounded-[2.5rem] flex items-center justify-between cursor-pointer hover:bg-emerald-600 transition-all shadow-2xl group border-4 border-emerald-500/20">
        <div className="flex items-center gap-6">
          <div className="bg-emerald-500 p-4 rounded-2xl group-hover:bg-white group-hover:text-emerald-600 transition-all animate-bounce">
            <Bell size={28} />
          </div>
          <div>
            <p className="text-2xl font-black">Hai {pendingOrdersCount} ordini da visionare</p>
            <p className="text-emerald-400 font-bold group-hover:text-white transition-all">Gestisci le richieste pervenute dagli operatori.</p>
          </div>
        </div>
        <div className="bg-white/10 px-6 py-3 rounded-xl font-black group-hover:bg-white group-hover:text-emerald-600 transition-all">GESTISCI</div>
      </div>
    )}

    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
      {structures.map(s => (
        <div key={s.id} onClick={() => onSelectStructure(s.id)} className="bg-white rounded-[2.5rem] shadow-sm hover:shadow-2xl cursor-pointer border border-slate-100 overflow-hidden transition-all duration-300 group hover:-translate-y-2">
          <div className="relative h-56 overflow-hidden">
            <img src={s.imageUrl || `https://picsum.photos/seed/${s.id}/800/400`} className="h-full w-full object-cover group-hover:scale-110 transition-transform duration-700" />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent"></div>
            <div className="absolute bottom-6 left-6 text-white">
              <h3 className="font-black text-2xl">{s.name}</h3>
              <p className="text-white/70 text-sm font-bold flex items-center gap-1 mt-1"><MapPin size={14} /> {s.address}</p>
            </div>
          </div>
          <div className="p-8 flex items-center justify-between">
            <div className="flex -space-x-2">
              <div className="w-8 h-8 rounded-full bg-emerald-100 border-2 border-white flex items-center justify-center text-emerald-600 text-xs font-black">R</div>
              <div className="w-8 h-8 rounded-full bg-blue-100 border-2 border-white flex items-center justify-center text-blue-600 text-xs font-black">O</div>
            </div>
            <div className="text-slate-900 font-black flex items-center gap-2 group-hover:text-emerald-600 transition-all uppercase text-xs tracking-widest">
              Apri Struttura <ArrowRight size={14} className="ml-1" />
            </div>
          </div>
        </div>
      ))}
    </div>
  </div>
);

const AddStructureView: React.FC<{ onSave: (s: any) => void, onCancel: () => void }> = ({ onSave, onCancel }) => {
  const [form, setForm] = useState({ name: '', address: '', accessCodes: '' });
  return (
    <div className="max-w-2xl mx-auto bg-white p-12 rounded-[3rem] shadow-2xl border border-slate-100 animate-fade-in">
      <h2 className="text-3xl font-black text-slate-900 mb-2">Nuova Proprietà</h2>
      <p className="text-slate-400 mb-10 font-medium">Inserisci i dati tecnici per la nuova struttura.</p>
      <div className="space-y-6 mb-12">
        <div className="space-y-1">
          <label className="text-[10px] font-black uppercase text-slate-400 px-1 tracking-widest">Nome Identificativo</label>
          <input className="w-full border-2 border-slate-50 p-5 rounded-2xl focus:border-emerald-500 focus:bg-white bg-slate-50 transition-all outline-none font-bold" value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Es. Villa Paradiso" />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-black uppercase text-slate-400 px-1 tracking-widest">Indirizzo Fisico</label>
          <input className="w-full border-2 border-slate-50 p-5 rounded-2xl focus:border-emerald-500 focus:bg-white bg-slate-50 transition-all outline-none font-bold" value={form.address} onChange={e => setForm({...form, address: e.target.value})} placeholder="Via Roma 1, Napoli..." />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-black uppercase text-slate-400 px-1 tracking-widest">Codici e Accessi</label>
          <textarea className="w-full border-2 border-slate-50 p-5 rounded-2xl focus:border-emerald-500 focus:bg-white bg-slate-50 transition-all outline-none h-32 font-bold" value={form.accessCodes} onChange={e => setForm({...form, accessCodes: e.target.value})} placeholder="Keybox, codici porta, ecc..." />
        </div>
      </div>
      <div className="flex gap-4">
        <button onClick={() => onSave(form)} className="flex-1 bg-slate-900 text-white py-5 rounded-2xl font-black shadow-xl shadow-slate-900/20 hover:bg-emerald-600 transition-all active:scale-95">SALVA PROPRIETÀ</button>
        <button onClick={onCancel} className="px-10 bg-slate-100 text-slate-500 rounded-2xl font-black hover:bg-slate-200 transition-all">ANNULLA</button>
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
      <button onClick={onBack} className="flex items-center gap-2 text-slate-400 mb-8 hover:text-emerald-600 font-black transition-all group">
        <div className="p-2 bg-white rounded-xl shadow-sm group-hover:shadow-md transition-all"><X size={18} /></div> TORNA ALLE PROPRIETÀ
      </button>
      
      <div className="bg-slate-900 p-10 rounded-[3rem] shadow-2xl mb-12 flex flex-col md:flex-row md:items-center justify-between gap-8 border-4 border-emerald-500/10 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full -mr-32 -mt-32"></div>
        <div className="relative">
          <h1 className="text-5xl font-black text-white tracking-tighter">{structure.name}</h1>
          <p className="text-emerald-400 font-bold text-lg mt-2 flex items-center gap-2"><MapPin size={20} /> {structure.address}</p>
        </div>
        <div className="relative font-mono bg-white/5 backdrop-blur-md p-6 rounded-[2rem] border border-white/10 flex items-center gap-4 group">
          <div className="bg-emerald-500 p-3 rounded-xl shadow-lg shadow-emerald-500/30 text-white transition-all group-hover:scale-110"><Key size={24} /></div>
          <div className="pr-4">
            <p className="text-[10px] text-white/40 uppercase font-black tracking-widest mb-1">Codici Accesso</p>
            <span className="text-white font-black text-2xl tracking-[0.2em]">{structure.accessCodes}</span>
          </div>
        </div>
      </div>

      <div className="flex gap-12 mb-10 overflow-x-auto pb-2 border-b-2 border-slate-100">
        <button onClick={() => setActiveTab('info')} className={`pb-4 whitespace-nowrap font-black transition-all relative ${activeTab === 'info' ? 'text-emerald-600' : 'text-slate-400'}`}>
          AZIONI RAPIDE {activeTab === 'info' && <div className="absolute bottom-[-2px] left-0 w-full h-1 bg-emerald-600 rounded-full"></div>}
        </button>
        <button onClick={() => setActiveTab('damages')} className={`pb-4 whitespace-nowrap font-black transition-all relative ${activeTab === 'damages' ? 'text-emerald-600' : 'text-slate-400'}`}>
          SEGNALAZIONI ({structDamages.filter(d=>d.status==='OPEN').length}) {activeTab === 'damages' && <div className="absolute bottom-[-2px] left-0 w-full h-1 bg-emerald-600 rounded-full"></div>}
        </button>
        <button onClick={() => setActiveTab('history')} className={`pb-4 whitespace-nowrap font-black transition-all relative ${activeTab === 'history' ? 'text-emerald-600' : 'text-slate-400'}`}>
          LOG ATTIVITÀ {activeTab === 'history' && <div className="absolute bottom-[-2px] left-0 w-full h-1 bg-emerald-600 rounded-full"></div>}
        </button>
      </div>

      {activeTab === 'info' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <ActionCard icon={<Box className="text-emerald-600" />} title="Inventario Prodotti" desc="Registra consumabili usati oggi" onClick={() => onNewInventory('PRODUCT')} />
          <ActionCard icon={<Shirt className="text-indigo-600" />} title="Conta Biancheria" desc="Registra biancheria pulita" onClick={() => onNewInventory('LINEN')} />
          <ActionCard icon={<ShoppingCart className="text-amber-600" />} title="Ordina Prodotti" desc="Invia richiesta rifornimento" onClick={() => onRequestOrder('PRODUCT')} bg="bg-amber-50" border="border-amber-200" />
          <ActionCard icon={<Truck className="text-blue-600" />} title="Ordina Biancheria" desc="Invia richiesta lavanderia" onClick={() => onRequestOrder('LINEN')} bg="bg-blue-50" border="border-blue-200" />
          <ActionCard icon={<RefreshCw className="text-purple-600" />} title="Report Biancheria" desc="Sporca, Rotta o Inutilizzata" onClick={onReportLinen} bg="bg-purple-50" border="border-purple-200" />
          <ActionCard icon={<AlertTriangle className="text-red-600" />} title="Segnala Guasto" desc="Intervento manutentore urgente" onClick={onReportDamage} bg="bg-red-50" border="border-red-200" />
        </div>
      )}

      {activeTab === 'damages' && (
        <div className="space-y-6">
          {structDamages.length === 0 && <div className="text-center py-20 bg-white rounded-[3rem] border-4 border-dashed border-slate-50 text-slate-300 font-bold text-xl uppercase tracking-widest">Nessun guasto attivo</div>}
          {structDamages.map(d => (
            <div key={d.id} className={`p-8 rounded-[2.5rem] border-2 bg-white shadow-sm transition-all ${d.status === 'RESOLVED' ? 'opacity-60 bg-slate-50 border-slate-100' : 'border-slate-50 shadow-slate-200/50'}`}>
              <div className="flex justify-between items-start gap-6">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-4">
                    <span className={`text-[10px] px-3 py-1.5 rounded-full font-black uppercase tracking-[0.2em] ${d.status === 'OPEN' ? 'bg-red-500 text-white shadow-lg shadow-red-200' : 'bg-emerald-500 text-white shadow-lg shadow-emerald-200'}`}>{d.status}</span>
                    <span className="text-xs text-slate-400 font-black">{new Date(d.date).toLocaleString('it-IT')}</span>
                  </div>
                  <p className="font-black text-slate-800 text-2xl leading-tight mb-4">{d.notes}</p>
                  <p className="text-xs text-slate-400 flex items-center gap-2 font-bold"><UserCheck size={16} className="text-emerald-500" /> Segnalato da: <span className="text-slate-900 font-black">{users.find(u => u.id === d.reporterId)?.name}</span></p>
                </div>
                <div className="flex flex-col gap-2">
                  {d.status === 'OPEN' && (currentUser.role === Role.ADMIN || currentUser.role === Role.RECEPTION) && (
                    <button onClick={() => onUpdateDamageStatus(d.id, 'RESOLVED')} className="bg-emerald-600 text-white p-4 rounded-2xl hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-200 active:scale-95" title="Segna come risolto"><CheckCircle2 size={24} /></button>
                  )}
                  {(currentUser.role === Role.ADMIN || currentUser.role === Role.RECEPTION) && (
                    <button onClick={() => onUpdateDamageStatus(d.id, 'ARCHIVED')} className="bg-slate-100 text-slate-400 p-4 rounded-2xl hover:bg-red-50 hover:text-red-500 transition-all active:scale-95" title="Sposta in archivio"><Trash size={24} /></button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {activeTab === 'history' && <div className="text-center py-24 bg-white rounded-[3rem] border-4 border-dashed border-slate-50 text-slate-300 font-black text-2xl uppercase tracking-widest italic">Nessun log recente</div>}
    </div>
  );
};

const ActionCard: React.FC<{ icon: any, title: string, desc: string, onClick: () => void, bg?: string, border?: string }> = ({ icon, title, desc, onClick, bg = "bg-white", border = "border-slate-100" }) => (
  <div onClick={onClick} className={`cursor-pointer ${bg} p-10 rounded-[2.5rem] shadow-sm border-2 ${border} hover:shadow-2xl transition-all flex flex-col items-center text-center gap-6 active:scale-95 group`}>
    <div className="p-6 bg-white rounded-[2rem] shadow-xl border border-slate-50 group-hover:scale-110 transition-transform duration-300">{React.cloneElement(icon, { size: 48 })}</div>
    <div><h3 className="font-black text-slate-800 text-xl tracking-tight mb-2 uppercase tracking-widest">{title}</h3><p className="text-sm text-slate-400 font-medium leading-relaxed">{desc}</p></div>
  </div>
);

const NewOrderView: React.FC<{ structureId: string, currentUser: User, products: Product[], type: ItemType, onSave: (o: any) => void, onCancel: () => void }> = ({ structureId, currentUser, products, type, onSave, onCancel }) => {
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [signer, setSigner] = useState(currentUser.name);
  const filtered = products.filter(p => p.type === type);

  return (
    <div className="max-w-3xl mx-auto bg-white p-12 rounded-[3rem] shadow-2xl border border-slate-100 animate-fade-in">
      <div className="flex items-center gap-6 mb-12">
        <div className={`p-6 rounded-[2rem] ${type === 'LINEN' ? 'bg-indigo-600' : 'bg-emerald-600'} text-white shadow-2xl`}>
          {type === 'LINEN' ? <Shirt size={40} /> : <ShoppingCart size={40} />}
        </div>
        <div>
          <h2 className="text-4xl font-black text-slate-900 tracking-tighter">Nuova Richiesta {type === 'LINEN' ? 'Lavanderia' : 'Prodotti'}</h2>
          <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest mt-1">Richiesta interna per Reception e Admin</p>
        </div>
      </div>

      <div className="space-y-3 mb-12 bg-slate-50 p-6 rounded-[2rem] border-2 border-slate-100 max-h-[500px] overflow-y-auto custom-scrollbar">
        {filtered.map(p => (
          <div key={p.id} className="flex justify-between items-center p-5 bg-white rounded-2xl border border-slate-200 shadow-sm transition-all hover:border-emerald-300">
            <div>
              <span className="font-black text-slate-700 text-lg uppercase tracking-tight">{p.name}</span>
              <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">{p.unit}</p>
            </div>
            <div className="flex items-center gap-4 bg-slate-50 p-2 rounded-xl border-2">
              <button onClick={() => setQuantities({...quantities, [p.id]: Math.max(0, (quantities[p.id]||0) - 1)})} className="p-2 text-slate-400 hover:text-red-500 hover:bg-white rounded-lg transition-all"><Minus size={20} /></button>
              <input type="number" className="w-16 bg-transparent text-center font-black text-slate-900 text-xl outline-none" value={quantities[p.id] || 0} onChange={e => setQuantities({...quantities, [p.id]: Math.max(0, parseInt(e.target.value)||0)})} />
              <button onClick={() => setQuantities({...quantities, [p.id]: (quantities[p.id]||0) + 1})} className="p-2 text-slate-400 hover:text-emerald-500 hover:bg-white rounded-lg transition-all"><Plus size={20} /></button>
            </div>
          </div>
        ))}
      </div>

      <div className="mb-12 bg-slate-900 p-8 rounded-[2rem] shadow-xl">
        <label className="block text-[10px] font-black text-emerald-400 uppercase tracking-[0.3em] mb-4 px-1">Firma Elettronica (Digita il tuo Nome)</label>
        <input className="w-full bg-white/5 border-2 border-white/10 p-5 rounded-2xl focus:border-emerald-500 focus:bg-white/10 outline-none font-black text-white text-2xl transition-all" value={signer} onChange={e => setSigner(e.target.value)} placeholder="Tua firma qui..." />
      </div>

      <div className="flex gap-4">
        <button 
          onClick={() => onSave({ structureId, requesterId: currentUser.id, dateCreated: new Date().toISOString(), items: (Object.entries(quantities) as [string, number][]).filter(([_, q]) => q > 0).map(([pid, q]) => ({ productId: pid, quantity: q })), status: OrderStatus.PENDING, type, signatureUrl: signer })} 
          disabled={signer.length < 3 || Object.keys(quantities).filter(k => quantities[k] > 0).length === 0}
          className="flex-1 bg-emerald-600 text-white py-6 rounded-2xl font-black text-xl shadow-2xl hover:bg-emerald-700 transition-all active:scale-95 flex items-center justify-center gap-3 disabled:opacity-30 disabled:grayscale"
        >
          <Send size={24} /> INVIA RICHIESTA ORDINE
        </button>
        <button onClick={onCancel} className="px-12 bg-slate-100 text-slate-500 rounded-2xl font-black hover:bg-slate-200 transition-all uppercase text-sm tracking-widest">Annulla</button>
      </div>
    </div>
  );
};

const NewInventoryView: React.FC<{ structureId: string, currentUser: User, products: Product[], type: ItemType, onSave: (i: any) => void, onCancel: () => void }> = ({ structureId, currentUser, products, type, onSave, onCancel }) => {
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [signer, setSigner] = useState(currentUser.name);
  const filtered = products.filter(p => p.type === type);

  return (
    <div className="max-w-3xl mx-auto bg-white p-12 rounded-[3rem] shadow-2xl border border-slate-100 animate-fade-in">
      <h2 className="text-4xl font-black mb-10 text-slate-900 tracking-tighter flex items-center gap-4 uppercase tracking-widest"><Box className="text-emerald-600" /> Inventario {type === 'LINEN' ? 'Biancheria' : 'Prodotti'}</h2>
      <div className="space-y-2 mb-10 max-h-[450px] overflow-y-auto pr-2 custom-scrollbar">
        {filtered.map(p => (
          <div key={p.id} className="flex justify-between items-center p-5 border-2 border-slate-50 rounded-2xl bg-slate-50/50 hover:bg-emerald-50 hover:border-emerald-200 transition-all group">
            <span className="font-black text-slate-700 uppercase tracking-widest text-lg">{p.name} <span className="text-[10px] text-slate-300 block font-bold">{p.unit}</span></span>
            <input type="number" className="w-24 border-2 border-slate-200 rounded-xl p-4 text-center font-black text-xl focus:border-emerald-500 outline-none group-hover:bg-white transition-all shadow-inner" placeholder="0" onChange={e => setQuantities({...quantities, [p.id]: Math.max(0, parseInt(e.target.value)||0)})} />
          </div>
        ))}
      </div>
      
      <div className="mb-10 bg-slate-100 p-8 rounded-[2rem] border-2 border-slate-200 shadow-inner">
        <label className="block text-[10px] font-black text-slate-400 uppercase mb-4 px-1 tracking-[0.2em]">Firma di Convalida (Digita Nome)</label>
        <input className="w-full border-2 border-white p-5 rounded-2xl focus:border-emerald-500 bg-white font-black text-2xl shadow-sm outline-none" value={signer} onChange={e => setSigner(e.target.value)} />
      </div>

      <div className="flex gap-4">
        <button onClick={() => onSave({ structureId, operatorId: currentUser.id, date: new Date().toISOString(), items: (Object.entries(quantities) as [string, number][]).filter(([_, q]) => q > 0).map(([pid, q]) => ({ productId: pid, quantity: q })), type, signatureUrl: signer })} className="flex-1 bg-emerald-600 text-white py-6 rounded-2xl font-black text-xl shadow-2xl hover:bg-emerald-700 active:scale-95 transition-all">SALVA INVENTARIO</button>
        <button onClick={onCancel} className="px-10 bg-slate-100 text-slate-500 rounded-2xl font-black hover:bg-slate-200 transition-all uppercase text-sm tracking-widest">Annulla</button>
      </div>
    </div>
  );
};

// --- NewDamageReportView Component ---
const NewDamageReportView: React.FC<{ 
  structureId: string, currentUser: User, 
  onSave: (r: any) => void, onCancel: () => void 
}> = ({ structureId, currentUser, onSave, onCancel }) => {
  const [notes, setNotes] = useState('');
  
  return (
    <div className="max-w-3xl mx-auto bg-white p-12 rounded-[3rem] shadow-2xl border border-slate-100 animate-fade-in">
      <div className="flex items-center gap-6 mb-12">
        <div className="bg-red-600 p-6 rounded-[2rem] text-white shadow-2xl">
          <AlertTriangle size={40} />
        </div>
        <div>
          <h2 className="text-4xl font-black text-slate-900 tracking-tighter uppercase tracking-widest">Segnala Guasto</h2>
          <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest mt-1">Invia una segnalazione urgente per malfunzionamenti o danni</p>
        </div>
      </div>

      <div className="space-y-6 mb-12">
        <div className="space-y-1">
          <label className="text-[10px] font-black uppercase text-slate-400 px-1 tracking-widest">Descrizione del guasto o danno</label>
          <textarea 
            className="w-full border-2 border-slate-50 p-5 rounded-2xl focus:border-red-500 focus:bg-white bg-slate-50 transition-all outline-none h-48 font-bold text-lg" 
            placeholder="Descrivi dettagliatamente cosa è successo e dove..."
            value={notes}
            onChange={e => setNotes(e.target.value)}
          />
        </div>
      </div>

      <div className="flex gap-4">
        <button 
          onClick={() => onSave({ 
            structureId, 
            reporterId: currentUser.id, 
            date: new Date().toISOString(), 
            items: [], 
            notes, 
            status: 'OPEN' 
          })} 
          disabled={notes.length < 5}
          className="flex-1 bg-red-600 text-white py-6 rounded-2xl font-black text-xl shadow-2xl hover:bg-red-700 transition-all active:scale-95 flex items-center justify-center gap-3 disabled:opacity-30 disabled:grayscale"
        >
          <AlertCircle size={24} /> INVIA SEGNALAZIONE
        </button>
        <button onClick={onCancel} className="px-12 bg-slate-100 text-slate-500 rounded-2xl font-black hover:bg-slate-200 transition-all uppercase text-sm tracking-widest">Annulla</button>
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
      <div className="flex justify-between items-center mb-10">
        <div>
          <h2 className="text-4xl font-black text-slate-900 tracking-tighter uppercase tracking-widest">Ordini {targetType === 'LINEN' ? 'Lavanderia' : 'Forniture'}</h2>
          <p className="text-slate-400 font-bold mt-1">Convalida o modifica le richieste operative.</p>
        </div>
        <div className="bg-emerald-500 text-white px-8 py-3 rounded-full text-sm font-black shadow-xl border-4 border-white animate-pulse">{filtered.filter(o => o.status === OrderStatus.PENDING).length} PENDING</div>
      </div>

      <div className="space-y-6">
        {filtered.map(o => (
          <div key={o.id} className={`bg-white p-8 rounded-[3rem] border-2 shadow-sm transition-all hover:shadow-2xl ${o.status === OrderStatus.PENDING ? 'border-l-[1.5rem] border-l-amber-500 border-slate-100' : 'border-l-[1.5rem] border-l-emerald-500 border-slate-100'}`}>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <p className="font-black text-3xl text-slate-900 tracking-tighter uppercase">{structures.find(s => s.id === o.structureId)?.name}</p>
                  <span className={`text-[10px] px-3 py-1.5 rounded-full font-black uppercase tracking-[0.2em] ${o.status === OrderStatus.PENDING ? 'bg-amber-100 text-amber-600 border border-amber-200' : 'bg-emerald-100 text-emerald-600 border border-emerald-200'}`}>{o.status}</span>
                </div>
                <p className="text-xs text-slate-400 font-bold mb-6 flex items-center gap-2">
                  <Clock size={16} /> Richiesto da <span className="text-slate-900 font-black underline">{users.find(u => u.id === o.requesterId)?.name}</span> il {new Date(o.dateCreated).toLocaleString('it-IT')}
                </p>
                <div className="flex flex-wrap gap-3">
                  {o.items.map(i => (
                    <div key={i.productId} className="flex items-center gap-3 bg-slate-50 px-6 py-3 rounded-2xl border border-slate-100 text-sm shadow-inner">
                      <span className="font-black text-slate-500 uppercase tracking-widest">{products.find(p=>p.id===i.productId)?.name}:</span>
                      <span className="font-black text-emerald-600 text-2xl">{i.quantity}</span>
                    </div>
                  ))}
                </div>
                {o.signatureUrl && <p className="mt-8 font-black text-slate-300 uppercase text-[10px] tracking-widest italic border-t pt-4">Firmato digitalmente: {o.signatureUrl}</p>}
              </div>
              
              <div className="flex gap-4 w-full md:w-auto">
                {o.status === OrderStatus.PENDING && (
                  <>
                    <button 
                      onClick={() => onUpdateOrder({...o, status: OrderStatus.SENT, dateSent: new Date().toISOString()})} 
                      className={`flex-1 md:flex-none ${targetType === 'LINEN' ? 'bg-indigo-600' : 'bg-emerald-600'} text-white px-10 py-5 rounded-2xl text-sm font-black shadow-xl hover:scale-105 transition-all active:scale-95 flex items-center justify-center gap-3`}
                    >
                      {targetType === 'LINEN' ? <CheckCircle2 size={24} /> : <Truck size={24} />}
                      {targetType === 'LINEN' ? 'CONVALIDA INTERNA' : 'INVIA AL FORNITORE'}
                    </button>
                    {/* Fixed typo Trash2 to Trash */}
                    <button onClick={() => onDeleteOrder(o.id)} className="p-5 text-red-500 hover:bg-red-50 rounded-2xl transition-all border-2 border-red-50 active:scale-95 shadow-sm"><Trash size={28} /></button>
                  </>
                )}
                {o.status === OrderStatus.SENT && (
                  <div className="flex items-center gap-4 text-emerald-600 bg-emerald-50 px-10 py-5 rounded-3xl border-2 border-emerald-100 font-black text-sm uppercase tracking-widest shadow-inner">
                    <CheckCircle2 size={24} /> {targetType === 'LINEN' ? 'CONVALIDATO' : 'INVIATO'}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
        {filtered.length === 0 && <div className="text-center py-32 bg-white rounded-[4rem] border-4 border-dashed border-slate-50 text-slate-300 font-black text-2xl uppercase tracking-[0.3em] italic">Nessun ordine nel registro</div>}
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
    <div className="max-w-4xl mx-auto bg-white p-12 rounded-[3rem] shadow-2xl border border-slate-100 animate-fade-in">
      <div className="flex items-center gap-6 mb-12">
        <div className="bg-indigo-600 p-6 rounded-[2rem] text-white shadow-2xl"><RefreshCw size={40} /></div>
        <div>
          <h2 className="text-4xl font-black text-slate-900 tracking-tighter uppercase tracking-widest">Report Biancheria</h2>
          <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest mt-1">Dettaglio biancheria sporca, rotta o non utilizzata</p>
        </div>
      </div>
      
      <div className="space-y-4 mb-12 max-h-[600px] overflow-y-auto pr-4 custom-scrollbar">
        {linen.map(p => (
          <div key={p.id} className="p-8 border-2 border-slate-50 rounded-[2.5rem] bg-slate-50/50 hover:border-indigo-200 transition-all shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-8">
            <div className="flex-1">
              <p className="font-black text-slate-800 text-xl flex items-center gap-3 uppercase tracking-tighter"><Shirt size={28} className="text-indigo-600" /> {p.name}</p>
              <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest ml-10">{p.unit}</p>
            </div>
            <div className="flex flex-wrap lg:flex-nowrap gap-4 justify-end">
              <div className="bg-white p-4 rounded-2xl border-2 border-slate-100 shadow-sm text-center min-w-[100px]">
                <label className="text-[10px] text-red-600 font-black uppercase tracking-widest block mb-2">Sporca</label>
                <input type="number" className="w-full bg-slate-50 border-2 border-slate-50 rounded-xl p-3 font-black text-2xl text-center focus:border-red-400 outline-none" placeholder="0" value={dirty[p.id] || 0} onChange={e => setDirty({...dirty, [p.id]: parseInt(e.target.value)||0})} />
              </div>
              <div className="bg-white p-4 rounded-2xl border-2 border-slate-100 shadow-sm text-center min-w-[100px]">
                <label className="text-[10px] text-orange-600 font-black uppercase tracking-widest block mb-2">Rotta</label>
                <input type="number" className="w-full bg-slate-50 border-2 border-slate-50 rounded-xl p-3 font-black text-2xl text-center focus:border-orange-400 outline-none" placeholder="0" value={broken[p.id] || 0} onChange={e => setBroken({...broken, [p.id]: parseInt(e.target.value)||0})} />
              </div>
              <div className="bg-white p-4 rounded-2xl border-2 border-slate-100 shadow-sm text-center min-w-[100px]">
                <label className="text-[10px] text-blue-600 font-black uppercase tracking-widest block mb-2">Inutilizzata</label>
                <input type="number" className="w-full bg-slate-50 border-2 border-slate-50 rounded-xl p-3 font-black text-2xl text-center focus:border-blue-400 outline-none" placeholder="0" value={unused[p.id] || 0} onChange={e => setUnused({...unused, [p.id]: parseInt(e.target.value)||0})} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mb-12 bg-indigo-900 p-10 rounded-[2.5rem] shadow-2xl border-4 border-white/5">
        <label className="block text-[10px] font-black text-indigo-400 uppercase mb-4 px-1 tracking-[0.3em]">Firma Operatore (Digita Nome)</label>
        <input className="w-full bg-white/5 border-2 border-white/10 p-5 rounded-2xl focus:border-indigo-400 focus:bg-white/10 outline-none font-black text-white text-3xl tracking-tight transition-all" value={signer} onChange={e => setSigner(e.target.value)} />
      </div>

      <div className="flex gap-4">
        <button onClick={() => onSave({ structureId, operatorId: currentUser.id, date: new Date().toISOString(), dirtyItems: Object.entries(dirty).filter(([_,q])=>q>0).map(([p,q])=>({productId:p, quantity:q})), unusedItems: Object.entries(unused).filter(([_,q])=>q>0).map(([p,q])=>({productId:p, quantity:q})), brokenItems: Object.entries(broken).filter(([_,q])=>q>0).map(([p,q])=>({productId:p, quantity:q})), signatureUrl: signer })} className="flex-1 bg-indigo-600 text-white py-6 rounded-2xl font-black text-xl shadow-2xl hover:bg-indigo-700 active:scale-95 transition-all">SALVA REPORT BIANCHERIA</button>
        <button onClick={onCancel} className="px-12 bg-slate-100 text-slate-500 rounded-2xl font-black hover:bg-slate-200 transition-all uppercase text-sm tracking-widest">Annulla</button>
      </div>
    </div>
  );
};

const AdminLinenSummaryView: React.FC<{ reports: UnusedLinenReport[], products: Product[], structures: Structure[], users: User[] }> = ({ reports, products, structures }) => {
  const [startDate, setStartDate] = useState(new Date(new Date().setDate(new Date().getDate() - 7)).toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [searchStructure, setSearchStructure] = useState('');

  const filteredReports = useMemo(() => {
    return reports.filter(r => {
      const date = r.date.split('T')[0];
      const matchDate = date >= startDate && date <= endDate;
      const matchStruct = searchStructure === '' || r.structureId === searchStructure;
      return matchDate && matchStruct;
    });
  }, [reports, startDate, endDate, searchStructure]);

  const totals = useMemo(() => {
    const res: Record<string, { dirty: number, unused: number, broken: number }> = {};
    filteredReports.forEach(r => {
      r.dirtyItems?.forEach(i => {
        if (!res[i.productId]) res[i.productId] = { dirty: 0, unused: 0, broken: 0 };
        res[i.productId]!.dirty += i.quantity;
      });
      r.unusedItems?.forEach(i => {
        if (!res[i.productId]) res[i.productId] = { dirty: 0, unused: 0, broken: 0 };
        res[i.productId]!.unused += i.quantity;
      });
      r.brokenItems?.forEach(i => {
        if (!res[i.productId]) res[i.productId] = { dirty: 0, unused: 0, broken: 0 };
        res[i.productId]!.broken += i.quantity;
      });
    });
    return res;
  }, [filteredReports]);

  const exportCSV = () => {
    let csv = "Prodotto;Totale Sporca;Totale Rotta;Totale Inutilizzata\n";
    (Object.entries(totals) as [string, {dirty:number, unused:number, broken:number}][]).forEach(([pid, val]) => {
      const p = products.find(prod => prod.id === pid);
      csv += `${p?.name || pid};${val.dirty};${val.broken};${val.unused}\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `riepilogo_lavanderia_${startDate}_a_${endDate}.csv`;
    a.click();
  };

  return (
    <div className="max-w-6xl mx-auto animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-12">
        <div>
          <h2 className="text-4xl font-black text-slate-900 tracking-tighter uppercase tracking-widest">Analisi Lavanderia</h2>
          <p className="text-slate-400 font-bold mt-1">Analisi dei carichi biancheria per periodo temporale.</p>
        </div>
        <button onClick={exportCSV} className="bg-emerald-600 text-white px-10 py-5 rounded-2xl flex items-center gap-3 font-black shadow-2xl hover:bg-emerald-700 active:scale-95 transition-all uppercase text-sm tracking-widest"><Download size={24} /> ESPORTA RIEPILOGO CSV</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12 bg-white p-10 rounded-[3rem] shadow-xl border border-slate-100">
        <div className="space-y-1">
          <label className="text-[10px] font-black uppercase text-slate-400 px-1 tracking-widest flex items-center gap-2"><Calendar size={12} /> Data Inizio</label>
          <input type="date" className="w-full border-2 border-slate-50 p-4 rounded-xl bg-slate-50 font-bold outline-none focus:border-emerald-500 focus:bg-white transition-all shadow-inner" value={startDate} onChange={e => setStartDate(e.target.value)} />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-black uppercase text-slate-400 px-1 tracking-widest flex items-center gap-2"><Calendar size={12} /> Data Fine</label>
          <input type="date" className="w-full border-2 border-slate-50 p-4 rounded-xl bg-slate-50 font-bold outline-none focus:border-emerald-500 focus:bg-white transition-all shadow-inner" value={endDate} onChange={e => setEndDate(e.target.value)} />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-black uppercase text-slate-400 px-1 tracking-widest flex items-center gap-2"><Building2 size={12} /> Struttura</label>
          <select className="w-full border-2 border-slate-50 p-4 rounded-xl bg-slate-50 font-bold outline-none focus:border-emerald-500 focus:bg-white transition-all shadow-inner" value={searchStructure} onChange={e => setSearchStructure(e.target.value)}>
            <option value="">Tutte le Proprietà</option>
            {structures.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
      </div>

      <div className="bg-white rounded-[4rem] shadow-2xl overflow-hidden border-8 border-white">
        <table className="w-full text-left">
          <thead className="bg-slate-900 text-white">
            <tr>
              <th className="p-8 font-black uppercase text-xs tracking-[0.3em]">Articolo</th>
              <th className="p-8 font-black uppercase text-xs tracking-[0.3em] text-center text-red-400">Tot. Sporca</th>
              <th className="p-8 font-black uppercase text-xs tracking-[0.3em] text-center text-orange-400">Tot. Rotta</th>
              <th className="p-8 font-black uppercase text-xs tracking-[0.3em] text-center text-blue-400">Tot. Inutilizzata</th>
            </tr>
          </thead>
          <tbody className="divide-y-2 divide-slate-50">
            {(Object.entries(totals) as [string, {dirty:number, unused:number, broken:number}][]).map(([pid, val]) => {
              const p = products.find(prod => prod.id === pid);
              return (
                <tr key={pid} className="hover:bg-slate-50 transition-colors">
                  <td className="p-8">
                    <p className="font-black text-slate-800 text-xl uppercase tracking-tighter">{p?.name}</p>
                    <p className="text-[10px] text-slate-400 font-bold tracking-widest">{p?.category}</p>
                  </td>
                  <td className="p-8 text-center"><span className="bg-red-50 text-red-600 px-8 py-3 rounded-2xl font-black text-3xl shadow-sm border border-red-100">{val.dirty}</span></td>
                  <td className="p-8 text-center"><span className="bg-orange-50 text-orange-600 px-8 py-3 rounded-2xl font-black text-3xl shadow-sm border border-orange-100">{val.broken}</span></td>
                  <td className="p-8 text-center"><span className="bg-blue-50 text-blue-600 px-8 py-3 rounded-2xl font-black text-3xl shadow-sm border border-blue-100">{val.unused}</span></td>
                </tr>
              );
            })}
            {Object.keys(totals).length === 0 && <tr><td colSpan={4} className="p-40 text-center text-slate-300 font-black text-2xl uppercase tracking-[0.3em] italic">Dati non pervenuti per il filtro attuale</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const SupplierDashboardView: React.FC<{ orders: Order[], structures: Structure[], products: Product[], currentUser: User }> = ({ orders, structures, products, currentUser }) => {
  const supplierOrders = orders.filter(o => o.status === OrderStatus.SENT && o.type === 'PRODUCT').sort((a,b) => new Date(b.dateCreated).getTime() - new Date(a.dateCreated).getTime());
  
  return (
    <div className="max-w-6xl mx-auto animate-fade-in">
      <div className="bg-slate-900 text-white p-16 rounded-[4rem] shadow-2xl mb-12 flex items-center justify-between border-b-[1.5rem] border-emerald-500 overflow-hidden relative">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full -mr-48 -mt-48"></div>
        <div className="relative">
          <h2 className="text-6xl font-black tracking-tighter mb-4 uppercase">Logistica Consegne</h2>
          <p className="text-emerald-400 font-black text-2xl uppercase tracking-widest opacity-80">Dashboard: {currentUser.name}</p>
        </div>
        <Truck size={120} className="opacity-10 absolute right-16 top-1/2 -translate-y-1/2" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        {supplierOrders.map(o => (
          <div key={o.id} className="bg-white p-12 rounded-[3rem] border-2 border-slate-50 shadow-xl hover:shadow-2xl transition-all group">
            <div className="flex justify-between items-start mb-10">
              <div>
                <h3 className="text-4xl font-black text-slate-900 tracking-tighter uppercase mb-2 group-hover:text-emerald-600 transition-colors">{structures.find(s => s.id === o.structureId)?.name}</h3>
                <p className="text-emerald-600 font-bold flex items-center gap-2"><MapPin size={20} /> {structures.find(s => s.id === o.structureId)?.address}</p>
              </div>
              <div className="bg-amber-100 text-amber-600 px-6 py-2 rounded-xl text-xs font-black tracking-widest border-2 border-amber-200 animate-pulse">DA CONSEGNARE</div>
            </div>
            
            <div className="bg-slate-50 p-8 rounded-3xl border-2 border-slate-100 grid grid-cols-1 gap-4 mb-10 shadow-inner">
              {o.items.map(i => (
                <div key={i.productId} className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                  <span className="font-black text-slate-600 uppercase text-xl tracking-tight">{products.find(p=>p.id===i.productId)?.name}</span>
                  <span className="text-emerald-600 bg-emerald-50 px-6 py-2 rounded-xl font-black text-3xl shadow-sm border border-emerald-100">x{i.quantity}</span>
                </div>
              ))}
            </div>
            
            <button className="w-full bg-slate-900 text-white py-6 rounded-2xl font-black shadow-xl hover:bg-emerald-600 transition-all active:scale-95 uppercase tracking-widest text-lg">Segna come Consegnato</button>
          </div>
        ))}
        {supplierOrders.length === 0 && <div className="col-span-full text-center py-48 bg-white rounded-[4rem] border-4 border-dashed border-slate-50 text-slate-300 font-black text-4xl uppercase tracking-[0.2em] italic">Nessuna consegna pendente</div>}
      </div>
    </div>
  );
};

export default App;
