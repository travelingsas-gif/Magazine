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
const mapInventory = (i: any): InventoryReport => ({ id: i.id, structureId: i.structure_id, operatorId: i.operator_id, date: i.date, items: i.items, signatureUrl: i.signature_url, photoUrl: i.photo_url, notes: i.notes, type: i.type });
const mapOrder = (o: any): Order => ({ id: o.id, structureId: o.structure_id, requesterId: o.requester_id, dateCreated: o.date_created, dateSent: o.date_sent, sentToEmail: o.sent_to_email, items: o.items, status: o.status, type: o.type });
const mapDamageReport = (d: any): DamageReport => ({ id: d.id, structureId: d.structure_id, reporterId: d.reporter_id, date: d.date, items: d.items, notes: d.notes, status: d.status });
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
       if (resInv.error) throw resInv.error;
       setInventories(resInv.data.map(mapInventory));
       if (resOrd.error) throw resOrd.error;
       setOrders(resOrd.data.map(mapOrder));
       if (resDmg.error) throw resDmg.error;
       setDamageReports(resDmg.data.map(mapDamageReport));
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
                       id: inv.id, structure_id: inv.structureId, operator_id: inv.operatorId,
                       date: inv.date, items: inv.items, signature_url: inv.signatureUrl, photo_url: inv.photoUrl,
                       notes: inv.notes, type: inv.type
                    }).select().single();
                    if(!error && data) { setInventories([...inventories, mapInventory(data)]); setCurrentView('structure-detail'); }
                  }}
                  onCancel={() => setCurrentView('structure-detail')}
               />;
      case 'damage-report-new':
        return <NewDamageReportView
                structureId={selectedStructureId!} currentUser={currentUser} products={products}
                onSave={async (rep) => {
                  const { data, error } = await supabase.from('damage_reports').insert({
                     id: rep.id, structure_id: rep.structureId, reporter_id: rep.reporterId,
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
                    id: rep.id, structure_id: rep.structureId, operator_id: rep.operatorId,
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
        return <DashboardView structures={structures} onSelectStructure={(id) => { setSelectedStructureId(id); setCurrentView('structure-detail'); }} role={currentUser.role} pendingOrdersCount={0} onNavigateToOrders={() => {}} />;
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

const DashboardView: React.FC<{ structures: Structure[], onSelectStructure: (id: string) => void, role: Role, pendingOrdersCount: number, onNavigateToOrders: () => void }> = ({ structures, onSelectStructure, pendingOrdersCount, onNavigateToOrders }) => (
  <div>
    {pendingOrdersCount > 0 && (
      <div onClick={onNavigateToOrders} className="mb-6 bg-orange-50 border border-orange-200 p-4 rounded-xl flex items-center justify-between cursor-pointer hover:bg-orange-100">
        <div className="flex items-center gap-3"><Bell className="text-orange-600" /><div><p className="font-bold">Hai {pendingOrdersCount} nuovi ordini</p><p className="text-sm">Gestisci richieste in sospeso.</p></div></div>
        <div className="bg-orange-600 text-white px-3 py-1 rounded-lg text-sm font-bold">Vedi</div>
      </div>
    )}
    <h2 className="text-2xl font-bold mb-6">Zone & Strutture</h2>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {structures.map(s => (
        <div key={s.id} onClick={() => onSelectStructure(s.id)} className="bg-white rounded-xl shadow-sm hover:shadow-md cursor-pointer border overflow-hidden">
          <img src={s.imageUrl || `https://picsum.photos/seed/${s.id}/800/400`} className="h-32 w-full object-cover" />
          <div className="p-4"><h3 className="font-bold text-lg">{s.name}</h3><p className="text-sm text-gray-500">{s.address}</p></div>
        </div>
      ))}
    </div>
  </div>
);

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
      <button onClick={onBack} className="flex items-center gap-2 text-gray-500 mb-6"><MapPin size={18} /> Torna</button>
      <div className="bg-white p-6 rounded-xl shadow-sm mb-6">
        <h1 className="text-3xl font-bold">{structure.name}</h1>
        <p className="text-gray-500">{structure.address}</p>
        <p className="mt-2 font-mono bg-gray-50 inline-block px-2 py-1 border rounded">Codici: {structure.accessCodes}</p>
      </div>

      <div className="flex gap-4 border-b mb-6 overflow-x-auto">
        <button onClick={() => setActiveTab('info')} className={`pb-2 px-1 ${activeTab === 'info' ? 'border-b-2 border-emerald-600 text-emerald-600' : ''}`}>Azioni</button>
        <button onClick={() => setActiveTab('damages')} className={`pb-2 px-1 ${activeTab === 'damages' ? 'border-b-2 border-emerald-600 text-emerald-600' : ''}`}>Guasti ({structDamages.filter(d=>d.status==='OPEN').length})</button>
        <button onClick={() => setActiveTab('history')} className={`pb-2 px-1 ${activeTab === 'history' ? 'border-b-2 border-emerald-600 text-emerald-600' : ''}`}>Storico</button>
      </div>

      {activeTab === 'info' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div onClick={() => onNewInventory('PRODUCT')} className="cursor-pointer bg-white p-6 rounded-xl shadow-sm border hover:border-emerald-500 flex items-center gap-4">
            <Box className="text-emerald-600" size={32} /><div><h3 className="font-bold">Inventario Prodotti</h3><p className="text-sm text-gray-500">Registra consumabili</p></div>
          </div>
          <div onClick={() => onNewInventory('LINEN')} className="cursor-pointer bg-white p-6 rounded-xl shadow-sm border hover:border-indigo-500 flex items-center gap-4">
            <Shirt className="text-indigo-600" size={32} /><div><h3 className="font-bold">Conta Biancheria</h3><p className="text-sm text-gray-500">Gestione lavanderia</p></div>
          </div>
          <div onClick={onReportLinen} className="cursor-pointer bg-blue-50 p-6 rounded-xl shadow-sm border-blue-200 border flex items-center gap-4">
            <RefreshCw className="text-blue-600" size={32} /><div><h3 className="font-bold">Report Biancheria</h3><p className="text-sm text-blue-700">Sporca o non utilizzata</p></div>
          </div>
          <div onClick={onReportDamage} className="cursor-pointer bg-red-50 p-6 rounded-xl shadow-sm border-red-200 border flex items-center gap-4">
            <AlertTriangle className="text-red-600" size={32} /><div><h3 className="font-bold">Segnala Guasto</h3><p className="text-sm text-red-700">Riparazioni e manutenzione</p></div>
          </div>
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
                    <button onClick={() => onUpdateDamageStatus(d.id, 'RESOLVED')} className="bg-green-600 text-white p-2 rounded-lg" title="Riparato"><CheckCircle2 size={18} /></button>
                  )}
                  {(currentUser.role === Role.ADMIN || currentUser.role === Role.RECEPTION) && (
                    <button onClick={() => onUpdateDamageStatus(d.id, 'ARCHIVED')} className="bg-gray-200 text-gray-600 p-2 rounded-lg" title="Cestina"><Trash size={18} /></button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {activeTab === 'history' && <div className="text-center py-10 text-gray-400">Visualizza qui lo storico degli ordini e degli inventari passati.</div>}
    </div>
  );
};

const NewDamageReportView: React.FC<{ structureId: string, currentUser: User, products: Product[], onSave: (r: any) => void, onCancel: () => void }> = ({ structureId, currentUser, onSave, onCancel }) => {
  const [notes, setNotes] = useState('');
  return (
    <div className="max-w-xl mx-auto bg-white p-6 rounded-xl shadow-lg">
      <h2 className="text-2xl font-bold text-red-600 mb-4 flex items-center gap-2"><AlertTriangle /> Segnala Problema</h2>
      <textarea className="w-full border p-4 rounded-lg h-40 mb-6" placeholder="Descrivi il guasto..." value={notes} onChange={e => setNotes(e.target.value)} />
      <div className="flex gap-3">
        <button onClick={() => onSave({ id: `dmg-${Date.now()}`, structureId, reporterId: currentUser.id, date: new Date().toISOString(), items: [], notes, status: 'OPEN' })} className="flex-1 bg-red-600 text-white py-3 rounded-lg font-bold">Invia</button>
        <button onClick={onCancel} className="px-6 bg-gray-100 rounded-lg">Annulla</button>
      </div>
    </div>
  );
};

const NewUnusedLinenView: React.FC<{ structureId: string, currentUser: User, products: Product[], onSave: (r: any) => void, onCancel: () => void }> = ({ structureId, currentUser, products, onSave, onCancel }) => {
  const linen = products.filter(p => p.type === 'LINEN');
  const [dirty, setDirty] = useState<Record<string, number>>({});
  const [unused, setUnused] = useState<Record<string, number>>({});

  const handleSave = () => {
    const dirtyItems = Object.entries(dirty).map(([pid, q]) => ({ productId: pid, quantity: q }));
    const unusedItems = Object.entries(unused).map(([pid, q]) => ({ productId: pid, quantity: q }));
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
        <button onClick={handleSave} className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-bold">Salva Report</button>
        <button onClick={onCancel} className="px-6 bg-gray-100 rounded-lg">Annulla</button>
      </div>
    </div>
  );
};

const AdminLinenSummaryView: React.FC<{ reports: UnusedLinenReport[], products: Product[], structures: Structure[], users: User[] }> = ({ reports, products, structures }) => {
  const totals = useMemo(() => {
    const res: Record<string, { dirty: number, unused: number }> = {};
    reports.forEach(r => {
      r.dirtyItems.forEach(i => {
        if (!res[i.productId]) res[i.productId] = { dirty: 0, unused: 0 };
        res[i.productId].dirty += i.quantity;
      });
      r.unusedItems.forEach(i => {
        if (!res[i.productId]) res[i.productId] = { dirty: 0, unused: 0 };
        res[i.productId].unused += i.quantity;
      });
    });
    return res;
  }, [reports]);

  const exportCSV = () => {
    let csv = "Prodotto,Sporca,Inutilizzata\n";
    Object.entries(totals).forEach(([pid, val]) => {
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
        <button onClick={exportCSV} className="bg-emerald-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-bold"><Download size={18} /> Esporta CSV</button>
      </div>
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="p-4">Articolo</th>
              <th className="p-4 text-red-600">Tot. Sporca</th>
              <th className="p-4 text-blue-600">Tot. Inutilizzata</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(totals).map(([pid, val]) => {
              const p = products.find(prod => prod.id === pid);
              return (
                <tr key={pid} className="border-b">
                  <td className="p-4 font-medium">{p?.name}</td>
                  <td className="p-4 text-red-600 font-bold">{val.dirty}</td>
                  <td className="p-4 text-blue-600 font-bold">{val.unused}</td>
                </tr>
              );
            })}
            {Object.keys(totals).length === 0 && <tr><td colSpan={3} className="p-10 text-center text-gray-400">Nessun dato disponibile.</td></tr>}
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
      <div className="space-y-3 mb-6">
        {filtered.map(p => (
          <div key={p.id} className="flex justify-between items-center p-2 border-b">
            <span>{p.name}</span>
            <input type="number" className="w-20 border rounded p-1 text-center" placeholder="0" onChange={e => setQuantities({...quantities, [p.id]: parseInt(e.target.value)||0})} />
          </div>
        ))}
      </div>
      <div className="flex gap-3">
        <button onClick={() => onSave({ id: `inv-${Date.now()}`, structureId, operatorId: currentUser.id, date: new Date().toISOString(), items: Object.entries(quantities).map(([pid, q]) => ({ productId: pid, quantity: q })), type, signatureUrl: 'Firma Digitale' })} className="flex-1 bg-emerald-600 text-white py-3 rounded-lg font-bold">Salva</button>
        <button onClick={onCancel} className="px-6 bg-gray-100 rounded-lg">Annulla</button>
      </div>
    </div>
  );
};

const ManageOrdersView: React.FC<{ orders: Order[], structures: Structure[], products: Product[], users: User[], currentUser: User, targetType: ItemType, onUpdateOrder: (o: Order) => void, onDeleteOrder: (id: string) => void }> = ({ orders, structures, products, users, targetType, onUpdateOrder, onDeleteOrder }) => {
  const filtered = orders.filter(o => o.type === targetType);
  return (
    <div className="max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">Ordini {targetType}</h2>
      <div className="space-y-4">
        {filtered.map(o => (
          <div key={o.id} className="bg-white p-4 rounded-xl border flex justify-between items-center">
            <div>
              <p className="font-bold">{structures.find(s => s.id === o.structureId)?.name}</p>
              <p className="text-xs text-gray-400">Da: {users.find(u => u.id === o.requesterId)?.name} - {o.status}</p>
            </div>
            <div className="flex gap-2">
              {o.status === 'PENDING' && (
                <>
                  <button onClick={() => onUpdateOrder({...o, status: OrderStatus.SENT})} className="bg-blue-600 text-white px-3 py-1 rounded text-sm">Approva</button>
                  <button onClick={() => onDeleteOrder(o.id)} className="text-red-500"><Trash2 size={18} /></button>
                </>
              )}
            </div>
          </div>
        ))}
        {filtered.length === 0 && <p className="text-center py-10 text-gray-400">Nessun ordine presente.</p>}
      </div>
    </div>
  );
};

export default App;