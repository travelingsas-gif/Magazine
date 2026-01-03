import React, { useState, useMemo, useEffect } from 'react';
import { 
  Building2, Box, Users, ShoppingCart, LogOut, Menu, X, 
  Plus, Edit, Trash2, Camera, Check, Send, AlertCircle, FileText, Search,
  Clock, Bell, Truck, MapPin, Save, XCircle, Mail, Shirt, AlertTriangle, UserCheck, Loader, RefreshCw, Database, Image as ImageIcon, Minus, Key, Download, Trash, CheckCircle2, History
} from 'lucide-react';
import { 
  Role, User, Product, Structure, InventoryReport, Order, 
  OrderStatus, InventoryItem, ItemType, DamageReport, UnusedLinenReport 
} from './types';
import { analyzeInventoryImage } from './services/geminiService';
import { SignaturePad } from './components/SignaturePad';
import { supabase } from './supabaseClient';

// --- Helpers ---
const mapUser = (u: any): User => ({ id: u.id, name: u.name, email: u.email, role: u.role as Role, password: u.password });
const mapStructure = (s: any): Structure => ({ id: s.id, name: s.name, address: s.address, accessCodes: s.access_codes, imageUrl: s.image_url });
const mapProduct = (p: any): Product => ({ id: p.id, name: p.name, category: p.category, unit: p.unit, type: p.type });
// Fix: Map properties to correct camelCase keys as defined in InventoryReport type
const mapInventory = (i: any): InventoryReport => ({ id: i.id, structureId: i.structure_id, operatorId: i.operator_id, date: i.date, items: i.items, signatureUrl: i.signature_url, photoUrl: i.photo_url, notes: i.notes, type: i.type });
const mapOrder = (o: any): Order => ({ id: o.id, structureId: o.structure_id, requesterId: o.requester_id, dateCreated: o.date_created, dateSent: o.date_sent, sentToEmail: o.sent_to_email, items: o.items, status: o.status, type: o.type });
// Fix: Map properties to correct camelCase keys as defined in DamageReport type
const mapDamageReport = (d: any): DamageReport => ({ id: d.id, structureId: d.structure_id, reporterId: d.reporter_id, date: d.date, items: d.items, notes: d.notes, status: d.status });
// Fix: Map properties to correct camelCase keys as defined in UnusedLinenReport type
const mapUnusedLinen = (l: any): UnusedLinenReport => ({ id: l.id, structureId: l.structure_id, operatorId: l.operator_id, date: l.date, dirtyItems: l.dirty_items, unusedItems: l.unused_items, notes: l.notes });

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
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
      setError("Errore caricamento dati.");
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

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50 flex-col gap-4"><Loader className="animate-spin text-emerald-600" size={48} /><p>Caricamento...</p></div>;
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
                    const { data, error } = await supabase.from('structures').insert({
                      name: s.name, address: s.address, access_codes: s.accessCodes
                    }).select().single();
                    if (!error && data) { setStructures([...structures, mapStructure(data)]); setCurrentView('dashboard'); }
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
                    const { data, error } = await supabase.from('inventories').insert({
                       structure_id: inv.structureId, operator_id: inv.operatorId,
                       date: inv.date, items: inv.items, signature_url: inv.signatureUrl, photo_url: inv.photoUrl,
                       notes: inv.notes, type: inv.type
                    }).select().single();
                    if(!error && data) { setInventories([...inventories, mapInventory(data)]); setCurrentView('structure-detail'); }
                  }}
                  onCancel={() => setCurrentView('structure-detail')}
               />;
      case 'order-new':
        return <NewOrderView 
                  structureId={selectedStructureId!} currentUser={currentUser} products={products} type={activeItemType}
                  onSave={async (ord) => {
                    const { data, error } = await supabase.from('orders').insert({
                      structure_id: ord.structureId, requester_id: ord.requesterId,
                      date_created: ord.dateCreated, items: ord.items, status: ord.status, type: ord.type
                    }).select().single();
                    if (!error && data) { setOrders([...orders, mapOrder(data)]); setCurrentView('structure-detail'); }
                  }}
                  onCancel={() => setCurrentView('structure-detail')}
               />;
      case 'damage-report-new':
        return <NewDamageReportView
                structureId={selectedStructureId!} currentUser={currentUser} products={products}
                onSave={async (rep) => {
                  const { data, error } = await supabase.from('damage_reports').insert({
                     structure_id: rep.structureId, reporter_id: rep.reporterId,
                     date: rep.date, items: rep.items, notes: rep.notes, status: rep.status
                  }).select().single();
                  if(!error && data) { setDamageReports([...damageReports, mapDamageReport(data)]); setCurrentView('structure-detail'); }
                }}
                onCancel={() => setCurrentView('structure-detail')}
              />;
      case 'unused-linen-new':
        return <NewUnusedLinenView 
                structureId={selectedStructureId!} currentUser={currentUser} products={products}
                onSave={async (rep) => {
                  const { data, error } = await supabase.from('unused_linen_reports').insert({
                    structure_id: rep.structureId, operator_id: rep.operatorId,
                    date: rep.date, dirty_items: rep.dirtyItems, unused_items: rep.unusedItems, notes: rep.notes
                  }).select().single();
                  if (!error && data) { setUnusedLinenReports([...unusedLinenReports, mapUnusedLinen(data)]); setCurrentView('structure-detail'); }
                }}
                onCancel={() => setCurrentView('structure-detail')}
              />;
      case 'admin-linen-summary':
        return <AdminLinenSummaryView reports={unusedLinenReports} products={products} structures={structures} users={users} />;
      case 'orders-products': 
        return <ManageOrdersView orders={orders} structures={structures} products={products} users={users} currentUser={currentUser} targetType="PRODUCT" onUpdateOrder={async (o) => { await supabase.from('orders').update({ items: o.items, status: o.status }).eq('id', o.id); setOrders(orders.map(old => old.id === o.id ? o : old)); }} onDeleteOrder={async (id) => { await supabase.from('orders').delete().eq('id', id); setOrders(orders.filter(o => o.id !== id)); }} />;
      case 'orders-linen': 
        return <ManageOrdersView orders={orders} structures={structures} products={products} users={users} currentUser={currentUser} targetType="LINEN" onUpdateOrder={async (o) => { await supabase.from('orders').update({ items: o.items, status: o.status }).eq('id', o.id); setOrders(orders.map(old => old.id === o.id ? o : old)); }} onDeleteOrder={async (id) => { await supabase.from('orders').delete().eq('id', id); setOrders(orders.filter(o => o.id !== id)); }} />;
      default:
        return <DashboardView structures={structures} onSelectStructure={(id) => { setSelectedStructureId(id); setCurrentView('structure-detail'); }} role={currentUser.role} pendingOrdersCount={0} onNavigateToOrders={() => {}} onAddStructure={() => {}} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
      <div className="md:hidden bg-white shadow-sm p-4 flex justify-between items-center sticky top-0 z-20">
        <h1 className="text-xl font-bold text-emerald-700">CleanManage</h1>
        <button onClick={() => setIsMenuOpen(!isMenuOpen)}>{isMenuOpen ? <X /> : <Menu />}</button>
      </div>
      <aside className={`fixed inset-y-0 left-0 transform ${isMenuOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0 transition duration-200 ease-in-out w-64 bg-slate-900 text-white p-6 flex flex-col z-10`}>
        <div className="hidden md:flex items-center gap-2 mb-8"><Building2 className="text-emerald-400" /><span className="text-xl font-bold">CleanManage</span></div>
        <nav className="flex-1 space-y-2">
          <NavItem icon={<Building2 size={20} />} label="Strutture" active={currentView === 'dashboard'} onClick={() => { setCurrentView('dashboard'); setIsMenuOpen(false); }} />
          {(currentUser.role === Role.ADMIN || currentUser.role === Role.RECEPTION) && (
            <>
              <div className="pt-4 pb-2 text-xs text-slate-500 uppercase font-bold tracking-wider">Gestione</div>
              <NavItem icon={<ShoppingCart size={20} />} label="Ordini Prodotti" badge={getUnreadOrdersCount('PRODUCT')} active={currentView === 'orders-products'} onClick={() => { setCurrentView('orders-products'); setIsMenuOpen(false); }} />
              <NavItem icon={<Shirt size={20} />} label="Ordini Biancheria" badge={getUnreadOrdersCount('LINEN')} active={currentView === 'orders-linen'} onClick={() => { setCurrentView('orders-linen'); setIsMenuOpen(false); }} />
            </>
          )}
          {currentUser.role === Role.ADMIN && (
            <NavItem icon={<History size={20} />} label="Report Biancheria" active={currentView === 'admin-linen-summary'} onClick={() => { setCurrentView('admin-linen-summary'); setIsMenuOpen(false); }} />
          )}
        </nav>
        <button onClick={handleLogout} className="mt-auto flex items-center gap-2 text-slate-400 hover:text-white"><LogOut size={20} /><span>Esci</span></button>
      </aside>
      <main className="flex-1 p-4 md:p-8 overflow-y-auto h-screen">{renderContent()}</main>
    </div>
  );
};

// --- View Components ---

const NavItem: React.FC<{ icon: any, label: string, active?: boolean, onClick: () => void, badge?: number }> = ({ icon, label, active, onClick, badge }) => (
  <button onClick={onClick} className={`w-full flex items-center justify-between p-3 rounded-lg transition-colors ${active ? 'bg-emerald-600 text-white' : 'hover:bg-slate-800 text-slate-300'}`}>
    <div className="flex items-center gap-3">{icon}<span>{label}</span></div>
    {badge ? <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">{badge}</span> : null}
  </button>
);

const LoginView: React.FC<{ onLogin: (e: string, p: string) => void }> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md">
        <h2 className="text-2xl font-bold text-center mb-6">CleanManage Login</h2>
        <form onSubmit={(e) => { e.preventDefault(); onLogin(email, password); }} className="space-y-4">
          <input className="w-full border p-3 rounded-lg" type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required />
          <input className="w-full border p-3 rounded-lg" type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required />
          <button className="w-full bg-emerald-600 text-white py-3 rounded-lg font-bold">Accedi</button>
        </form>
      </div>
    </div>
  );
};

const DashboardView: React.FC<{ structures: Structure[], onSelectStructure: (id: string) => void, role: Role, pendingOrdersCount: number, onNavigateToOrders: () => void, onAddStructure: () => void }> = ({ structures, onSelectStructure, pendingOrdersCount, onNavigateToOrders, onAddStructure, role }) => (
  <div>
    {pendingOrdersCount > 0 && (
      <div onClick={onNavigateToOrders} className="mb-6 bg-orange-50 border border-orange-200 p-4 rounded-xl flex items-center justify-between cursor-pointer hover:bg-orange-100">
        <div className="flex items-center gap-3"><Bell className="text-orange-600" /><div><p className="font-bold">Hai {pendingOrdersCount} nuovi ordini</p><p className="text-sm">Gestisci richieste in sospeso.</p></div></div>
        <div className="bg-orange-600 text-white px-3 py-1 rounded-lg text-sm font-bold">Vedi</div>
      </div>
    )}
    <div className="flex justify-between items-center mb-6">
      <h2 className="text-2xl font-bold">Zone & Strutture</h2>
      {role === Role.ADMIN && (
        <button onClick={onAddStructure} className="bg-emerald-600 text-white p-2 rounded-full shadow-lg hover:bg-emerald-700 transition-colors">
          <Plus size={24} />
        </button>
      )}
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {structures.map(s => (
        <div key={s.id} onClick={() => onSelectStructure(s.id)} className="bg-white rounded-xl shadow-sm hover:shadow-md cursor-pointer border overflow-hidden">
          <img src={s.imageUrl || `https://picsum.photos/seed/${s.id}/800/400`} className="h-32 w-full object-cover" />
          <div className="p-4"><h3 className="font-bold text-lg">{s.name}</h3><p className="text-sm text-gray-500">{s.address}</p></div>
        </div>
      ))}
      {role === Role.ADMIN && (
        <div onClick={onAddStructure} className="border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center p-8 text-gray-400 hover:border-emerald-500 hover:text-emerald-500 cursor-pointer transition-colors">
          <Plus size={48} />
          <span className="mt-2 font-bold uppercase text-xs tracking-widest">Aggiungi Struttura</span>
        </div>
      )}
    </div>
  </div>
);

const AddStructureView: React.FC<{ onSave: (s: any) => void, onCancel: () => void }> = ({ onSave, onCancel }) => {
  const [form, setForm] = useState({ name: '', address: '', accessCodes: '' });
  return (
    <div className="max-w-xl mx-auto bg-white p-8 rounded-2xl shadow-xl">
      <h2 className="text-2xl font-bold mb-6">Nuova Struttura</h2>
      <div className="space-y-4 mb-8">
        <div><label className="block text-sm font-bold mb-1">Nome Struttura</label><input className="w-full border p-3 rounded-lg" value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Es. Villa Paradiso" /></div>
        <div><label className="block text-sm font-bold mb-1">Indirizzo</label><input className="w-full border p-3 rounded-lg" value={form.address} onChange={e => setForm({...form, address: e.target.value})} placeholder="Via Roma 1..." /></div>
        <div><label className="block text-sm font-bold mb-1">Codici Accesso</label><textarea className="w-full border p-3 rounded-lg" value={form.accessCodes} onChange={e => setForm({...form, accessCodes: e.target.value})} placeholder="Keybox: 1234, Allarme: 0000" /></div>
      </div>
      <div className="flex gap-4">
        <button onClick={() => onSave(form)} className="flex-1 bg-emerald-600 text-white py-3 rounded-lg font-bold">Crea Struttura</button>
        <button onClick={onCancel} className="px-6 bg-gray-100 rounded-lg font-bold">Annulla</button>
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
  structureId, currentUser, inventories, orders, products, structures, users, damageReports,
  onBack, onNewInventory, onRequestOrder, onReportDamage, onReportLinen, onUpdateDamageStatus
}) => {
  const structure = structures.find(s => s.id === structureId);
  const [activeTab, setActiveTab] = useState<'info' | 'damages' | 'history'>('info');

  if (!structure) return <div>Non trovato</div>;

  const structDamages = damageReports.filter(d => d.structureId === structure.id && d.status !== 'ARCHIVED');

  return (
    <div className="max-w-5xl mx-auto">
      <button onClick={onBack} className="flex items-center gap-2 text-gray-500 mb-6 hover:text-emerald-600 transition-colors"><MapPin size={18} /> Torna alle Strutture</button>
      <div className="bg-white p-6 rounded-xl shadow-sm mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">{structure.name}</h1>
          <p className="text-gray-500">{structure.address}</p>
        </div>
        <div className="font-mono bg-slate-100 p-3 rounded-lg border flex items-center gap-2">
          <Key size={18} className="text-slate-500" />
          <span>{structure.accessCodes}</span>
        </div>
      </div>

      <div className="flex gap-4 border-b mb-6 overflow-x-auto">
        <button onClick={() => setActiveTab('info')} className={`pb-2 px-1 whitespace-nowrap font-medium ${activeTab === 'info' ? 'border-b-2 border-emerald-600 text-emerald-600' : 'text-gray-500'}`}>Azioni Rapide</button>
        <button onClick={() => setActiveTab('damages')} className={`pb-2 px-1 whitespace-nowrap font-medium ${activeTab === 'damages' ? 'border-b-2 border-emerald-600 text-emerald-600' : 'text-gray-500'}`}>Guasti ({structDamages.filter(d=>d.status==='OPEN').length})</button>
        <button onClick={() => setActiveTab('history')} className={`pb-2 px-1 whitespace-nowrap font-medium ${activeTab === 'history' ? 'border-b-2 border-emerald-600 text-emerald-600' : 'text-gray-500'}`}>Storico Attività</button>
      </div>

      {activeTab === 'info' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <ActionCard icon={<Box className="text-emerald-600" />} title="Inventario Prodotti" desc="Registra consumabili usati" onClick={() => onNewInventory('PRODUCT')} />
          <ActionCard icon={<Shirt className="text-indigo-600" />} title="Conta Biancheria" desc="Registra biancheria pulita" onClick={() => onNewInventory('LINEN')} />
          <ActionCard icon={<ShoppingCart className="text-amber-600" />} title="Ordina Prodotti" desc="Richiedi nuovi materiali" onClick={() => onRequestOrder('PRODUCT')} bg="bg-amber-50" border="border-amber-200" />
          <ActionCard icon={<Truck className="text-blue-600" />} title="Ordina Biancheria" desc="Richiedi lavanderia" onClick={() => onRequestOrder('LINEN')} bg="bg-blue-50" border="border-blue-200" />
          <ActionCard icon={<RefreshCw className="text-purple-600" />} title="Report Biancheria" desc="Sporca o non utilizzata" onClick={onReportLinen} bg="bg-purple-50" border="border-purple-200" />
          <ActionCard icon={<AlertTriangle className="text-red-600" />} title="Segnala Guasto" desc="Riparazioni e manutenzione" onClick={onReportDamage} bg="bg-red-50" border="border-red-200" />
        </div>
      )}

      {activeTab === 'damages' && (
        <div className="space-y-4">
          {structDamages.length === 0 && <p className="text-center py-10 text-gray-400">Nessuna segnalazione attiva.</p>}
          {structDamages.map(d => (
            <div key={d.id} className={`p-4 rounded-xl border bg-white ${d.status === 'RESOLVED' ? 'opacity-60' : ''}`}>
              <div className="flex justify-between items-start">
                <div>
                  <span className={`text-xs px-2 py-0.5 rounded font-bold ${d.status === 'OPEN' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>{d.status}</span>
                  <p className="mt-2 font-medium">{d.notes}</p>
                  <p className="text-xs text-gray-400 mt-1">Da: {users.find(u => u.id === d.reporterId)?.name} - {new Date(d.date).toLocaleDateString()}</p>
                </div>
                <div className="flex gap-2">
                  {d.status === 'OPEN' && (currentUser.role === Role.ADMIN || currentUser.role === Role.RECEPTION) && (
                    <button onClick={() => onUpdateDamageStatus(d.id, 'RESOLVED')} className="bg-green-600 text-white p-2 rounded-lg hover:bg-green-700 transition-colors" title="Riparato"><CheckCircle2 size={18} /></button>
                  )}
                  {(currentUser.role === Role.ADMIN || currentUser.role === Role.RECEPTION) && (
                    <button onClick={() => onUpdateDamageStatus(d.id, 'ARCHIVED')} className="bg-gray-200 text-gray-600 p-2 rounded-lg hover:bg-gray-300 transition-colors" title="Cestina"><Trash size={18} /></button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {activeTab === 'history' && <div className="text-center py-10 text-gray-400">Lo storico delle operazioni verrà caricato qui.</div>}
    </div>
  );
};

const ActionCard: React.FC<{ icon: any, title: string, desc: string, onClick: () => void, bg?: string, border?: string }> = ({ icon, title, desc, onClick, bg = "bg-white", border = "border-gray-200" }) => (
  <div onClick={onClick} className={`cursor-pointer ${bg} p-6 rounded-xl shadow-sm border ${border} hover:shadow-md transition-all flex items-center gap-4`}>
    <div className="p-3 bg-white rounded-lg shadow-sm">{React.cloneElement(icon, { size: 32 })}</div>
    <div><h3 className="font-bold">{title}</h3><p className="text-sm opacity-70">{desc}</p></div>
  </div>
);

const NewOrderView: React.FC<{ structureId: string, currentUser: User, products: Product[], type: ItemType, onSave: (o: any) => void, onCancel: () => void }> = ({ structureId, currentUser, products, type, onSave, onCancel }) => {
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const filtered = products.filter(p => p.type === type);
  return (
    <div className="max-w-2xl mx-auto bg-white p-6 rounded-xl shadow-lg">
      <div className="flex items-center gap-3 mb-6">
        <div className={`p-3 rounded-lg ${type === 'LINEN' ? 'bg-indigo-100 text-indigo-600' : 'bg-emerald-100 text-emerald-600'}`}>
          {type === 'LINEN' ? <Truck size={24} /> : <ShoppingCart size={24} />}
        </div>
        <h2 className="text-2xl font-bold">Ordine {type === 'LINEN' ? 'Biancheria' : 'Prodotti'}</h2>
      </div>
      <div className="space-y-3 mb-8 bg-gray-50 p-4 rounded-xl border max-h-[400px] overflow-y-auto">
        {filtered.map(p => (
          <div key={p.id} className="flex justify-between items-center p-3 bg-white rounded-lg border shadow-sm">
            <span className="font-medium">{p.name} <span className="text-xs text-gray-400">({p.unit})</span></span>
            <div className="flex items-center gap-2">
              <button onClick={() => setQuantities({...quantities, [p.id]: Math.max(0, (quantities[p.id]||0) - 1)})} className="p-1 text-gray-400 hover:text-red-500"><Minus size={18} /></button>
              <input type="number" className="w-16 border rounded p-1 text-center font-bold" value={quantities[p.id] || 0} onChange={e => setQuantities({...quantities, [p.id]: parseInt(e.target.value)||0})} />
              <button onClick={() => setQuantities({...quantities, [p.id]: (quantities[p.id]||0) + 1})} className="p-1 text-gray-400 hover:text-emerald-500"><Plus size={18} /></button>
            </div>
          </div>
        ))}
      </div>
      <div className="flex gap-3">
        {/* Fix: Cast Object.entries to correct type to avoid 'unknown' operator error */}
        <button onClick={() => onSave({ structureId, requesterId: currentUser.id, dateCreated: new Date().toISOString(), items: (Object.entries(quantities) as [string, number][]).filter(([_, q]) => q > 0).map(([pid, q]) => ({ productId: pid, quantity: q })), status: OrderStatus.PENDING, type })} className="flex-1 bg-emerald-600 text-white py-4 rounded-xl font-bold text-lg shadow-lg hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2">
          <Send size={20} /> Invia Richiesta Ordine
        </button>
        <button onClick={onCancel} className="px-6 bg-gray-100 rounded-xl font-bold">Annulla</button>
      </div>
    </div>
  );
};

const NewDamageReportView: React.FC<{ structureId: string, currentUser: User, products: Product[], onSave: (r: any) => void, onCancel: () => void }> = ({ structureId, currentUser, onSave, onCancel }) => {
  const [notes, setNotes] = useState('');
  return (
    <div className="max-w-xl mx-auto bg-white p-6 rounded-xl shadow-lg">
      <h2 className="text-2xl font-bold text-red-600 mb-4 flex items-center gap-2"><AlertTriangle /> Segnala Problema</h2>
      <textarea className="w-full border p-4 rounded-lg h-40 mb-6 focus:ring-2 focus:ring-red-200 outline-none" placeholder="Descrivi il guasto o l'anomalia..." value={notes} onChange={e => setNotes(e.target.value)} />
      <div className="flex gap-3">
        <button onClick={() => onSave({ id: `dmg-${Date.now()}`, structureId, reporterId: currentUser.id, date: new Date().toISOString(), items: [], notes, status: 'OPEN' })} className="flex-1 bg-red-600 text-white py-3 rounded-lg font-bold">Invia Segnalazione</button>
        <button onClick={onCancel} className="px-6 bg-gray-100 rounded-lg font-bold">Annulla</button>
      </div>
    </div>
  );
};

const NewUnusedLinenView: React.FC<{ structureId: string, currentUser: User, products: Product[], onSave: (r: any) => void, onCancel: () => void }> = ({ structureId, currentUser, products, onSave, onCancel }) => {
  const linen = products.filter(p => p.type === 'LINEN');
  const [dirty, setDirty] = useState<Record<string, number>>({});
  const [unused, setUnused] = useState<Record<string, number>>({});

  const handleSave = () => {
    /* Fix: Cast Object.entries to correct type to avoid 'unknown' operator error */
    const dirtyItems = (Object.entries(dirty) as [string, number][]).filter(([_, q]) => q > 0).map(([pid, q]) => ({ productId: pid, quantity: q }));
    const unusedItems = (Object.entries(unused) as [string, number][]).filter(([_, q]) => q > 0).map(([pid, q]) => ({ productId: pid, quantity: q }));
    onSave({ id: `lin-${Date.now()}`, structureId, operatorId: currentUser.id, date: new Date().toISOString(), dirtyItems, unusedItems });
  };

  return (
    <div className="max-w-2xl mx-auto bg-white p-6 rounded-xl shadow-lg">
      <h2 className="text-2xl font-bold mb-6 text-blue-600 flex items-center gap-2"><RefreshCw /> Report Biancheria</h2>
      <div className="space-y-4 mb-8">
        {linen.map(p => (
          <div key={p.id} className="p-4 border rounded-xl bg-gray-50">
            <p className="font-bold mb-3">{p.name}</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-red-600 font-bold uppercase">Sporca/Macchiata</label>
                <input type="number" className="w-full border rounded p-2" placeholder="0" onChange={e => setDirty({...dirty, [p.id]: parseInt(e.target.value)||0})} />
              </div>
              <div>
                <label className="text-xs text-blue-600 font-bold uppercase">Non utilizzata</label>
                <input type="number" className="w-full border rounded p-2" placeholder="0" onChange={e => setUnused({...unused, [p.id]: parseInt(e.target.value)||0})} />
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="flex gap-3">
        <button onClick={handleSave} className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-bold shadow-lg hover:bg-blue-700 transition-colors">Salva Report</button>
        <button onClick={onCancel} className="px-6 bg-gray-100 rounded-lg">Annulla</button>
      </div>
    </div>
  );
};

const AdminLinenSummaryView: React.FC<{ reports: UnusedLinenReport[], products: Product[], structures: Structure[], users: User[] }> = ({ reports, products }) => {
  const totals = useMemo(() => {
    const res: Record<string, { dirty: number, unused: number }> = {};
    reports.forEach(r => {
      r.dirtyItems.forEach(i => {
        if (!res[i.productId]) res[i.productId] = { dirty: 0, unused: 0 };
        /* Fix: Access correctly typed properties */
        const current = res[i.productId]!;
        current.dirty += i.quantity;
      });
      r.unusedItems.forEach(i => {
        if (!res[i.productId]) res[i.productId] = { dirty: 0, unused: 0 };
        /* Fix: Access correctly typed properties */
        const current = res[i.productId]!;
        current.unused += i.quantity;
      });
    });
    return res;
  }, [reports]);

  const exportCSV = () => {
    let csv = "Prodotto,Sporca,Inutilizzata\n";
    /* Fix: Cast Object.entries to correct type to avoid 'unknown' property access error */
    (Object.entries(totals) as [string, { dirty: number, unused: number }][]).forEach(([pid, val]) => {
      const p = products.find(prod => prod.id === pid);
      csv += `${p?.name || pid},${val.dirty},${val.unused}\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `report_biancheria_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Riepilogo Totale Biancheria</h2>
        <button onClick={exportCSV} className="bg-emerald-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-bold hover:bg-emerald-700 transition-colors"><Download size={18} /> Esporta CSV</button>
      </div>
      <div className="bg-white rounded-xl shadow-sm overflow-hidden border">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="p-4">Articolo</th>
              <th className="p-4 text-red-600">Tot. Sporca</th>
              <th className="p-4 text-blue-600">Tot. Inutilizzata</th>
            </tr>
          </thead>
          <tbody>
            {/* Fix: Cast Object.entries to correct type to avoid 'unknown' property access error */}
            {(Object.entries(totals) as [string, { dirty: number, unused: number }][]).map(([pid, val]) => {
              const p = products.find(prod => prod.id === pid);
              return (
                <tr key={pid} className="border-b last:border-0">
                  <td className="p-4 font-medium">{p?.name}</td>
                  <td className="p-4 text-red-600 font-bold">{val.dirty}</td>
                  <td className="p-4 text-blue-600 font-bold">{val.unused}</td>
                </tr>
              );
            })}
            {Object.keys(totals).length === 0 && <tr><td colSpan={3} className="p-10 text-center text-gray-400 italic">Nessun dato disponibile negli ultimi report.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const NewInventoryView: React.FC<{ structureId: string, currentUser: User, products: Product[], type: ItemType, onSave: (i: any) => void, onCancel: () => void }> = ({ structureId, currentUser, products, type, onSave, onCancel }) => {
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const filtered = products.filter(p => p.type === type);
  return (
    <div className="max-w-2xl mx-auto bg-white p-6 rounded-xl shadow-lg">
      <h2 className="text-2xl font-bold mb-6">Nuovo Inventario {type}</h2>
      <div className="space-y-3 mb-6 max-h-[400px] overflow-y-auto pr-2">
        {filtered.map(p => (
          <div key={p.id} className="flex justify-between items-center p-3 border rounded-lg bg-gray-50">
            <span className="font-medium">{p.name} <span className="text-xs text-gray-400">({p.unit})</span></span>
            <input type="number" className="w-20 border rounded-lg p-2 text-center font-bold" placeholder="0" onChange={e => setQuantities({...quantities, [p.id]: parseInt(e.target.value)||0})} />
          </div>
        ))}
      </div>
      <div className="flex gap-3">
        {/* Fix: Cast Object.entries to correct type to avoid 'unknown' operator error */}
        <button onClick={() => onSave({ structureId, operatorId: currentUser.id, date: new Date().toISOString(), items: (Object.entries(quantities) as [string, number][]).filter(([_, q]) => q > 0).map(([pid, q]) => ({ productId: pid, quantity: q })), type, signatureUrl: 'Firma Elettronica' })} className="flex-1 bg-emerald-600 text-white py-3 rounded-lg font-bold shadow-lg hover:bg-emerald-700 transition-colors">Salva Inventario</button>
        <button onClick={onCancel} className="px-6 bg-gray-100 rounded-lg font-bold">Annulla</button>
      </div>
    </div>
  );
};

const ManageOrdersView: React.FC<{ orders: Order[], structures: Structure[], products: Product[], users: User[], currentUser: User, targetType: ItemType, onUpdateOrder: (o: Order) => void, onDeleteOrder: (id: string) => void }> = ({ orders, structures, products, users, targetType, onUpdateOrder, onDeleteOrder }) => {
  const filtered = orders.filter(o => o.type === targetType);
  return (
    <div className="max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">Gestione Ordini {targetType === 'LINEN' ? 'Biancheria' : 'Prodotti'}</h2>
      <div className="space-y-4">
        {filtered.map(o => (
          <div key={o.id} className="bg-white p-5 rounded-xl border shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <div className="flex items-center gap-2">
                <p className="font-bold text-lg">{structures.find(s => s.id === o.structureId)?.name}</p>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${o.status === 'PENDING' ? 'bg-orange-100 text-orange-600' : 'bg-green-100 text-green-600'}`}>{o.status}</span>
              </div>
              <p className="text-xs text-gray-400">Richiesto da: {users.find(u => u.id === o.requesterId)?.name} il {new Date(o.dateCreated).toLocaleDateString()}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {o.items.map(i => (
                  <span key={i.productId} className="text-xs bg-slate-100 px-2 py-1 rounded border">{products.find(p=>p.id===i.productId)?.name}: {i.quantity}</span>
                ))}
              </div>
            </div>
            <div className="flex gap-2 w-full md:w-auto">
              {o.status === 'PENDING' && (
                <>
                  <button onClick={() => onUpdateOrder({...o, status: OrderStatus.SENT})} className="flex-1 md:flex-none bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm hover:bg-blue-700 transition-colors">Approva & Invia</button>
                  <button onClick={() => onDeleteOrder(o.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors border border-red-100"><Trash2 size={20} /></button>
                </>
              )}
              {o.status === 'SENT' && <span className="text-blue-600 font-bold flex items-center gap-1"><Truck size={18} /> Inviato</span>}
            </div>
          </div>
        ))}
        {filtered.length === 0 && <div className="text-center py-20 bg-white rounded-2xl border-2 border-dashed border-gray-200 text-gray-400"><ShoppingCart size={48} className="mx-auto mb-2 opacity-20" /><p>Nessun ordine in questa categoria.</p></div>}
      </div>
    </div>
  );
};

export default App;