import React, { useState, useMemo, useEffect } from 'react';
import { 
  Building2, Box, Users, ShoppingCart, LogOut, Menu, X, 
  Plus, Edit, Trash2, Camera, Check, Send, AlertCircle, FileText, Search,
  Clock, Bell, Truck, MapPin, Save, XCircle, Mail, Shirt, AlertTriangle, UserCheck
} from 'lucide-react';
import { 
  Role, User, Product, Structure, InventoryReport, Order, 
  OrderStatus, InventoryItem, ItemType, DamageReport 
} from './types';
import { 
  INITIAL_USERS, INITIAL_PRODUCTS, INITIAL_STRUCTURES, 
  INITIAL_INVENTORIES, INITIAL_ORDERS, INITIAL_DAMAGE_REPORTS
} from './constants';
import { analyzeInventoryImage } from './services/geminiService';
import { SignaturePad } from './components/SignaturePad';

// --- Global Context & State ---

const App: React.FC = () => {
  // --- State ---
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  
  // "Database" state
  const [users, setUsers] = useState<User[]>(INITIAL_USERS);
  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS);
  const [structures, setStructures] = useState<Structure[]>(INITIAL_STRUCTURES);
  const [inventories, setInventories] = useState<InventoryReport[]>(INITIAL_INVENTORIES);
  const [orders, setOrders] = useState<Order[]>(INITIAL_ORDERS);
  const [damageReports, setDamageReports] = useState<DamageReport[]>(INITIAL_DAMAGE_REPORTS);

  // Navigation state
  const [currentView, setCurrentView] = useState<string>('login');
  const [selectedStructureId, setSelectedStructureId] = useState<string | null>(null);
  
  // To handle the type of inventory/order being created (Product vs Linen)
  const [activeItemType, setActiveItemType] = useState<ItemType>('PRODUCT'); 
  
  // Mobile menu state
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // --- Handlers ---

  const handleLogin = (email: string, pass: string) => {
    const user = users.find(u => u.email === email && u.password === pass);
    if (user) {
      setCurrentUser(user);
      // Route based on role
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

  if (!currentUser || currentView === 'login') {
    return <LoginView onLogin={handleLogin} />;
  }

  const renderContent = () => {
    switch (currentView) {
      case 'dashboard':
        return <DashboardView 
                  structures={structures} 
                  onSelectStructure={(id) => { setSelectedStructureId(id); setCurrentView('structure-detail'); }}
                  onAddStructure={(newS) => {
                    setStructures([...structures, newS]);
                    // alert('Nuova struttura aggiunta con successo!'); // Removed annoying alert
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
                  onReportDamage={() => setCurrentView('damage-report-new')}
                  onEditStructure={(data) => {
                    setStructures(prev => prev.map(s => s.id === data.id ? data : s));
                    alert('Dati struttura aggiornati correttamente.');
                  }}
               />;
      case 'inventory-new':
        return <NewInventoryView 
                  structureId={selectedStructureId!}
                  currentUser={currentUser}
                  products={products}
                  type={activeItemType}
                  onSave={(inv) => {
                    setInventories([...inventories, inv]);
                    setCurrentView('structure-detail');
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
                onSave={(ord) => {
                  setOrders([...orders, ord]);
                  setCurrentView('structure-detail');
                }}
                onCancel={() => setCurrentView('structure-detail')}
              />
      case 'damage-report-new':
        return <NewDamageReportView
                structureId={selectedStructureId!}
                currentUser={currentUser}
                products={products}
                onSave={(rep) => {
                  setDamageReports([...damageReports, rep]);
                  setCurrentView('structure-detail');
                }}
                onCancel={() => setCurrentView('structure-detail')}
              />
      case 'orders-products': 
        return <ManageOrdersView 
                  orders={orders}
                  structures={structures}
                  products={products}
                  users={users}
                  targetType="PRODUCT"
                  onUpdateOrder={(updatedOrder) => {
                    setOrders(orders.map(o => o.id === updatedOrder.id ? updatedOrder : o));
                  }}
                  onDeleteOrder={(id) => {
                    if(window.confirm("Sei sicuro di voler eliminare questo ordine?")) {
                      setOrders(orders.filter(o => o.id !== id));
                    }
                  }}
               />
      case 'orders-linen': 
        return <ManageOrdersView 
                  orders={orders}
                  structures={structures}
                  products={products}
                  users={users}
                  targetType="LINEN"
                  onUpdateOrder={(updatedOrder) => {
                    setOrders(orders.map(o => o.id === updatedOrder.id ? updatedOrder : o));
                  }}
                  onDeleteOrder={(id) => {
                    if(window.confirm("Sei sicuro di voler eliminare questo ordine?")) {
                      setOrders(orders.filter(o => o.id !== id));
                    }
                  }}
               />
      case 'users':
        return <UserManagementView users={users} setUsers={setUsers} />;
      case 'products':
        return <ProductManagementView products={products} setProducts={setProducts} />;
      default:
        // Default fallback
        if (currentUser.role === Role.SUPPLIER) return <SupplierDashboardView orders={orders} structures={structures} products={products} users={users} />;
        return <DashboardView structures={structures} onSelectStructure={() => {}} onAddStructure={()=>{}} role={currentUser.role} pendingOrdersCount={0} onNavigateToOrders={() => {}} />;
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
              label="Ordini Ricevuti" 
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
              
              {(currentUser.role === Role.ADMIN || currentUser.role === Role.RECEPTION) && (
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
          Demo Accounts:<br/>
          admin@hotel.com / password<br/>
          reception@hotel.com / password<br/>
          alfonso@supply.com / password<br/>
          op1@hotel.com / password
        </div>
      </div>
    </div>
  );
};

// --- Dashboard & Structure ---

const DashboardView: React.FC<{ 
  structures: Structure[], 
  onSelectStructure: (id: string) => void, 
  onAddStructure: (s: Structure) => void,
  role: Role,
  pendingOrdersCount: number,
  onNavigateToOrders: () => void
}> = ({ structures, onSelectStructure, onAddStructure, role, pendingOrdersCount, onNavigateToOrders }) => {
  
  const [isAdding, setIsAdding] = useState(false);
  const [newStruct, setNewStruct] = useState({ name: '', address: '', accessCodes: '' });

  const handleSaveNew = () => {
    if (!newStruct.name || !newStruct.address) {
      alert("Nome e Indirizzo sono obbligatori");
      return;
    }
    const s: Structure = {
      id: `s-${Date.now()}`,
      name: newStruct.name,
      address: newStruct.address,
      accessCodes: newStruct.accessCodes || 'Da inserire'
    };
    onAddStructure(s);
    setNewStruct({ name: '', address: '', accessCodes: '' });
    setIsAdding(false);
  };

  return (
    <div>
      {(role === Role.ADMIN || role === Role.RECEPTION) && pendingOrdersCount > 0 && (
         <div 
           onClick={onNavigateToOrders}
           className="mb-6 bg-orange-50 border border-orange-200 p-4 rounded-xl flex items-center justify-between cursor-pointer hover:bg-orange-100 transition shadow-sm"
         >
            <div className="flex items-center gap-3">
               <div className="bg-orange-100 p-2 rounded-full text-orange-600">
                  <Bell size={24} />
               </div>
               <div>
                  <h3 className="font-bold text-orange-900">Hai {pendingOrdersCount} nuovi ordini da confermare</h3>
                  <p className="text-sm text-orange-700">Clicca qui per gestire gli ordini in sospeso.</p>
               </div>
            </div>
            <div className="bg-orange-600 text-white px-3 py-1 rounded-lg text-sm font-bold">
               Vedi
            </div>
         </div>
      )}

      <h2 className="text-2xl font-bold text-gray-800 mb-6">Zone & Strutture Gestite</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {structures.map(structure => (
          <div 
            key={structure.id} 
            onClick={() => onSelectStructure(structure.id)}
            className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow cursor-pointer border border-gray-100 overflow-hidden"
          >
            <div className="h-32 bg-slate-200 relative">
                <img 
                  src={`https://picsum.photos/seed/${structure.id}/800/400`} 
                  alt={structure.name} 
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent flex items-end p-4">
                   <h3 className="text-white font-bold text-lg">{structure.name}</h3>
                </div>
            </div>
            <div className="p-4">
              <div className="flex items-start justify-between">
                <div>
                   <p className="text-sm text-gray-500 flex items-center gap-1">
                      <Users size={14} /> {structure.address}
                   </p>
                   {role !== Role.OPERATOR && (
                    <p className="text-xs text-gray-400 mt-2 font-mono bg-gray-100 p-1 rounded inline-block">
                        Cod: {structure.accessCodes}
                    </p>
                   )}
                </div>
                <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-400">
                    <Edit size={16} />
                </div>
              </div>
            </div>
          </div>
        ))}
        {/* Add Structure Card */}
        {role === Role.ADMIN && (
          isAdding ? (
            <div className="bg-white rounded-xl shadow-lg border border-emerald-500 p-6 flex flex-col gap-3">
               <h3 className="font-bold text-emerald-800">Nuova Struttura</h3>
               <input 
                 placeholder="Nome Struttura"
                 className="border p-2 rounded"
                 value={newStruct.name}
                 onChange={e => setNewStruct({...newStruct, name: e.target.value})}
               />
               <input 
                 placeholder="Indirizzo"
                 className="border p-2 rounded"
                 value={newStruct.address}
                 onChange={e => setNewStruct({...newStruct, address: e.target.value})}
               />
               <input 
                 placeholder="Codici Accesso"
                 className="border p-2 rounded"
                 value={newStruct.accessCodes}
                 onChange={e => setNewStruct({...newStruct, accessCodes: e.target.value})}
               />
               <div className="flex gap-2 mt-2">
                 <button onClick={handleSaveNew} className="bg-emerald-600 text-white px-4 py-2 rounded flex-1">Salva</button>
                 <button onClick={() => setIsAdding(false)} className="bg-gray-200 text-gray-600 px-4 py-2 rounded">Annulla</button>
               </div>
            </div>
          ) : (
            <div 
              onClick={() => setIsAdding(true)}
              className="bg-gray-50 rounded-xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center cursor-pointer hover:border-emerald-500 hover:bg-emerald-50 transition p-8 h-[240px]"
            >
               <div className="bg-white p-4 rounded-full shadow-sm mb-4">
                  <Plus size={24} className="text-emerald-600" />
               </div>
               <p className="font-bold text-gray-600">Aggiungi Struttura</p>
            </div>
          )
        )}
      </div>
    </div>
  );
};

const StructureDetailView: React.FC<{
  structureId: string,
  currentUser: User,
  inventories: InventoryReport[],
  orders: Order[],
  products: Product[],
  structures: Structure[],
  users: User[],
  damageReports: DamageReport[],
  onBack: () => void,
  onNewInventory: (type: ItemType) => void,
  onRequestOrder: (type: ItemType) => void,
  onReportDamage: () => void,
  onEditStructure: (s: Structure) => void
}> = ({ structureId, currentUser, inventories, orders, products, structures, users, damageReports, onBack, onNewInventory, onRequestOrder, onReportDamage, onEditStructure }) => {
  
  const structure = structures.find(s => s.id === structureId);
  const [activeTab, setActiveTab] = useState<ItemType>('PRODUCT');
  
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<Structure>(structure!);

  // Filter data based on active tab
  const tabInventories = inventories
    .filter(i => i.structureId === structureId && i.type === activeTab)
    .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  
  const tabOrders = orders
    .filter(o => o.structureId === structureId && o.type === activeTab)
    .sort((a,b) => new Date(b.dateCreated).getTime() - new Date(a.dateCreated).getTime());
  
  const tabDamages = damageReports
    .filter(d => d.structureId === structureId)
    .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  if (!structure) return <div>Structure not found</div>;

  const handleSaveStructure = () => {
    onEditStructure(editData);
    setIsEditing(false);
  };

  const getOrderStatusColor = (status: OrderStatus) => {
    switch (status) {
      case OrderStatus.PENDING: return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case OrderStatus.SENT: return 'bg-blue-100 text-blue-800 border-blue-200';
      case OrderStatus.DELIVERED: return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Logic for seeing damages: Admin OR Reception OR if reports exist (so operators can see too? Prompt said Admin and Reception see everything)
  const canSeeDamages = activeTab === 'LINEN' && (currentUser.role === Role.ADMIN || currentUser.role === Role.RECEPTION || tabDamages.length > 0);

  return (
    <div className="max-w-4xl mx-auto">
      <button onClick={onBack} className="text-slate-500 hover:text-slate-800 mb-4 flex items-center gap-1">
        &larr; Torna alle strutture
      </button>

      {/* Header Info */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
        <div className="flex justify-between items-start">
           <div className="w-full">
              {isEditing ? (
                  <div className="space-y-4 mt-2 bg-gray-50 p-4 rounded-lg">
                    <h3 className="font-bold text-lg text-emerald-800">Modifica Dati Struttura</h3>
                    <div>
                      <label className="text-xs font-bold text-gray-500">Nome Struttura</label>
                      <input 
                        className="border p-2 rounded w-full font-bold text-lg focus:ring-2 focus:ring-emerald-500 outline-none" 
                        value={editData.name} 
                        onChange={e => setEditData({...editData, name: e.target.value})} 
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-gray-500">Indirizzo</label>
                      <input 
                        className="border p-2 rounded w-full focus:ring-2 focus:ring-emerald-500 outline-none" 
                        value={editData.address} 
                        onChange={e => setEditData({...editData, address: e.target.value})} 
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-gray-500">Codici Accesso</label>
                      <input 
                        className="border p-2 rounded w-full focus:ring-2 focus:ring-emerald-500 outline-none" 
                        value={editData.accessCodes} 
                        onChange={e => setEditData({...editData, accessCodes: e.target.value})} 
                      />
                    </div>
                    <div className="flex gap-2 justify-end mt-4">
                      <button onClick={() => setIsEditing(false)} className="bg-gray-200 hover:bg-gray-300 px-4 py-2 rounded">Annulla</button>
                      <button onClick={handleSaveStructure} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded font-bold">Salva Modifiche</button>
                    </div>
                  </div>
              ) : (
                <div className="flex justify-between items-start">
                   <div>
                     <h1 className="text-3xl font-bold text-gray-900 mb-2">{structure.name}</h1>
                     <p className="text-gray-600 text-lg flex items-center gap-2"><Users size={18}/> {structure.address}</p>
                     {(currentUser.role === Role.ADMIN || currentUser.role === Role.RECEPTION) && (
                        <p className="text-gray-500 mt-2 font-mono bg-gray-100 inline-block px-2 py-1 rounded">Codici: {structure.accessCodes}</p>
                     )}
                   </div>
                   {currentUser.role === Role.ADMIN && (
                      <button onClick={() => setIsEditing(true)} className="flex items-center gap-2 px-3 py-2 text-emerald-700 hover:bg-emerald-50 border border-emerald-200 rounded-lg transition">
                         <Edit size={16} /> Modifica Dati
                      </button>
                   )}
                </div>
              )}
           </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 mb-6 border-b border-gray-200">
         <button 
           onClick={() => setActiveTab('PRODUCT')}
           className={`pb-3 px-2 text-sm font-bold flex items-center gap-2 border-b-2 transition ${activeTab === 'PRODUCT' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-gray-500 hover:text-gray-800'}`}
         >
           <Box size={18}/> Magazzino & Ordini Prodotti
         </button>
         <button 
           onClick={() => setActiveTab('LINEN')}
           className={`pb-3 px-2 text-sm font-bold flex items-center gap-2 border-b-2 transition ${activeTab === 'LINEN' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-gray-500 hover:text-gray-800'}`}
         >
           <Shirt size={18}/> Magazzino & Ordini Biancheria
         </button>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-4 mb-8">
           <button onClick={() => onNewInventory(activeTab)} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-lg shadow-sm transition">
              <Check size={20} /> Inventario {activeTab === 'PRODUCT' ? 'Prodotti' : 'Biancheria'}
           </button>
           <button onClick={() => onRequestOrder(activeTab)} className="flex items-center gap-2 bg-white border border-emerald-600 text-emerald-700 hover:bg-emerald-50 px-6 py-3 rounded-lg shadow-sm transition">
              <ShoppingCart size={20} /> Invia Ordine {activeTab === 'PRODUCT' ? 'Prodotti' : 'Biancheria'}
           </button>
           
           {/* Report Damage Button - Visible to everyone if they need to report, but list visibility is controlled */}
           {activeTab === 'LINEN' && (
             <button onClick={onReportDamage} className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 hover:bg-red-100 px-6 py-3 rounded-lg shadow-sm transition">
                <AlertTriangle size={20} /> Segnala Capi Danneggiati/Sporchi
             </button>
           )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Inventory History Column */}
        <div>
          <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
             <FileText size={20} /> Storico Inventari ({activeTab === 'PRODUCT' ? 'Prodotti' : 'Biancheria'})
          </h3>
          <div className="space-y-4 max-h-[500px] overflow-y-auto">
            {tabInventories.length > 0 ? (
               tabInventories.map(inv => (
                 <div key={inv.id} className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
                    <div className="flex justify-between items-center mb-2 pb-2 border-b">
                        <div>
                          <p className="text-sm font-bold text-gray-700">
                             {new Date(inv.date).toLocaleDateString()}
                          </p>
                          <p className="text-xs text-gray-400">
                             {new Date(inv.date).toLocaleTimeString()}
                          </p>
                        </div>
                        <div className="text-right">
                           <span className="text-xs bg-green-50 text-green-700 px-2 py-1 rounded border border-green-100 block mb-1">
                             Firmato da: <span className="font-bold">{inv.signatureUrl ? 'Presente' : 'Assente'}</span>
                           </span>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        {inv.items.map((item, idx) => {
                          const prod = products.find(p => p.id === item.productId);
                          return (
                            <div key={idx} className="flex justify-between p-1 bg-gray-50 rounded text-xs">
                              <span className="font-medium text-gray-600 truncate mr-2">{prod?.name || 'Unknown'}</span>
                              <span className="font-bold text-emerald-700">{item.quantity} {prod?.unit}</span>
                            </div>
                          );
                        })}
                    </div>
                 </div>
               ))
            ) : (
              <div className="bg-gray-50 rounded-lg p-8 text-center border border-dashed border-gray-300">
                <p className="text-gray-500 italic">Nessun inventario registrato per questa categoria.</p>
              </div>
            )}
          </div>
        </div>

        {/* Order History Column & Damage Reports */}
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
               <Clock size={20} /> Storico Ordini ({activeTab === 'PRODUCT' ? 'Prodotti' : 'Biancheria'})
            </h3>
            <div className="space-y-4 max-h-[300px] overflow-y-auto">
               {tabOrders.length > 0 ? (
                  tabOrders.map(order => {
                    const requester = users.find(u => u.id === order.requesterId);
                    return (
                      <div key={order.id} className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
                         <div className="flex justify-between items-start mb-3">
                            <div>
                               <p className="text-sm font-bold text-gray-700">Ordine del {new Date(order.dateCreated).toLocaleDateString()}</p>
                               <p className="text-xs text-gray-400">Richiesto da: {requester?.name || 'Unknown'}</p>
                            </div>
                            <span className={`text-[10px] px-2 py-1 rounded-full border font-bold uppercase ${getOrderStatusColor(order.status)}`}>
                               {order.status === OrderStatus.SENT ? 'INVIATO' : (order.status === OrderStatus.PENDING ? 'IN ATTESA' : 'CONSEGNATO')}
                            </span>
                         </div>
                         {order.status === OrderStatus.SENT && order.sentToEmail && (
                            <div className="mb-2 text-xs text-blue-600 bg-blue-50 p-1 rounded">
                               Inviato a: {order.sentToEmail}
                            </div>
                         )}
                         <div className="bg-gray-50 p-2 rounded text-xs space-y-1">
                            {order.items.map((item, idx) => {
                               const p = products.find(prod => prod.id === item.productId);
                               return (
                                 <div key={idx} className="flex justify-between">
                                    <span>{p?.name}</span>
                                    <span className="font-mono">{item.quantity}</span>
                                 </div>
                               );
                            })}
                         </div>
                      </div>
                    );
                  })
               ) : (
                  <div className="bg-gray-50 rounded-lg p-8 text-center border border-dashed border-gray-300">
                     <p className="text-gray-500 italic">Nessun ordine presente.</p>
                  </div>
               )}
            </div>
          </div>

          {/* Damages Section - Visibility controlled here */}
          {canSeeDamages && (
             <div>
                <h3 className="text-lg font-bold text-red-800 mb-3 flex items-center gap-2">
                   <AlertTriangle size={20} /> Segnalazioni Capi Rotti/Sporchi
                </h3>
                <div className="space-y-4 max-h-[300px] overflow-y-auto">
                   {tabDamages.length > 0 ? (
                      tabDamages.map(rep => (
                        <div key={rep.id} className="bg-red-50 rounded-lg shadow-sm border border-red-100 p-4">
                           <div className="flex justify-between items-center mb-2">
                              <span className="text-xs font-bold text-red-600">{new Date(rep.date).toLocaleDateString()}</span>
                              <span className="text-xs bg-white border px-2 py-0.5 rounded text-gray-500">
                                Rep: {users.find(u => u.id === rep.reporterId)?.name || 'Unknown'}
                              </span>
                           </div>
                           <ul className="text-sm space-y-1">
                             {rep.items.map((item, idx) => {
                               const p = products.find(prod => prod.id === item.productId);
                               return (
                                 <li key={idx} className="flex justify-between">
                                    <span>{p?.name}</span>
                                    <span className="font-bold text-red-700">{item.quantity}</span>
                                 </li>
                               );
                             })}
                           </ul>
                           {rep.notes && <p className="text-xs text-gray-500 mt-2 italic">"{rep.notes}"</p>}
                        </div>
                      ))
                   ) : (
                      <div className="bg-gray-50 rounded-lg p-4 text-center border border-dashed border-gray-300">
                         <p className="text-gray-400 text-sm">Nessuna segnalazione danni.</p>
                      </div>
                   )}
                </div>
             </div>
          )}
        </div>
      </div>
    </div>
  );
};

const ManageOrdersView: React.FC<{
  orders: Order[],
  structures: Structure[],
  products: Product[],
  users: User[],
  targetType: ItemType,
  onUpdateOrder: (o: Order) => void,
  onDeleteOrder: (id: string) => void
}> = ({ orders, structures, products, users, targetType, onUpdateOrder, onDeleteOrder }) => {
  const pendingOrders = orders.filter(o => o.status === OrderStatus.PENDING && o.type === targetType);
  const sentOrders = orders.filter(o => o.status !== OrderStatus.PENDING && o.type === targetType).sort((a,b) => new Date(b.dateSent || b.dateCreated).getTime() - new Date(a.dateSent || a.dateCreated).getTime());
  
  // Edit State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editItems, setEditItems] = useState<{[key: string]: number}>({});

  const startEditing = (order: Order) => {
    setEditingId(order.id);
    const itemsMap: {[key: string]: number} = {};
    order.items.forEach(i => itemsMap[i.productId] = i.quantity);
    setEditItems(itemsMap);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditItems({});
  };

  const saveEditing = (order: Order) => {
    const newItems: InventoryItem[] = Object.keys(editItems).map(pid => ({
      productId: pid, quantity: editItems[pid]
    })).filter(i => i.quantity > 0);

    const updatedOrder = { ...order, items: newItems };
    onUpdateOrder(updatedOrder);
    setEditingId(null);
  };
  
  const handleApprove = (order: Order) => {
    if (editingId === order.id) {
       alert("Per favore salva le modifiche prima di inviare.");
       return;
    }

    let email = undefined;
    
    // DIFFERENT LOGIC BASED ON TYPE
    if (targetType === 'LINEN') {
       const input = prompt("Inserisci l'indirizzo email lavanderia/servizio:", "lavanderia@servizio.com");
       if (input === null) return; // Cancelled
       email = input;
       alert(`Ordine BIANCHERIA confermato e inviato via email a ${email}.`);
    } else {
       // PRODUCTS - Send to supplier (Alfonso)
       const confirmSend = window.confirm("Confermi l'invio dell'ordine PRODOTTI al Fornitore (Alfonso)?");
       if (!confirmSend) return; // Cancelled
       email = "alfonso@supply.com"; 
       alert("Ordine PRODOTTI confermato e inviato al pannello Fornitore.");
    }

    const updatedOrder: Order = {
       ...order,
       status: OrderStatus.SENT,
       dateSent: new Date().toISOString(),
       sentToEmail: email
    };
    onUpdateOrder(updatedOrder);
  };

  return (
    <div className="max-w-5xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">Gestione Ordini {targetType === 'PRODUCT' ? 'Prodotti' : 'Biancheria'} (Reception)</h2>
      
      {pendingOrders.length === 0 ? (
        <div className="bg-white p-12 text-center rounded-xl shadow-sm mb-12">
           <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="text-green-600" size={32} />
           </div>
           <h3 className="text-lg font-medium text-gray-900">Nessun ordine in sospeso</h3>
           <p className="text-gray-500">Tutti gli ordini sono stati evasi.</p>
        </div>
      ) : (
        <div className="grid gap-6 mb-12">
           {pendingOrders.map(order => {
             const struct = structures.find(s => s.id === order.structureId);
             const requester = users.find(u => u.id === order.requesterId);
             const isEditing = editingId === order.id;
             const filteredProducts = products.filter(p => p.type === targetType);
             
             return (
               <div key={order.id} className="bg-white border border-l-4 border-l-orange-400 rounded-lg shadow-sm p-6 relative">
                   <button 
                    onClick={() => onDeleteOrder(order.id)}
                    className="absolute top-4 right-4 text-red-400 hover:text-red-600 p-2"
                    title="Elimina Ordine"
                  >
                    <Trash2 size={20} />
                  </button>

                  <div className="flex justify-between items-start mb-4 pr-10">
                     <div>
                        <h3 className="font-bold text-lg text-gray-800">{struct?.name}</h3>
                        <p className="text-sm text-gray-500">Richiesto da: {requester?.name} il {new Date(order.dateCreated).toLocaleDateString()}</p>
                     </div>
                     <span className="bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-xs font-bold animate-pulse">DA CONFERMARE</span>
                  </div>
                  
                  <div className="bg-gray-50 p-4 rounded-lg mb-4">
                     <h4 className="text-xs font-bold text-gray-400 uppercase mb-2">Articoli Richiesti {isEditing && "(Modifica in corso)"}</h4>
                     
                     {isEditing ? (
                        <div className="space-y-2">
                           {filteredProducts.map(p => {
                             const qty = editItems[p.id] || 0;
                             if (qty === 0 && !order.items.find(i => i.productId === p.id)) return null; 

                             return (
                               <div key={p.id} className="flex justify-between items-center text-sm border-b border-gray-200 pb-1">
                                  <span>{p.name}</span>
                                  <div className="flex items-center gap-2">
                                     <input 
                                       type="number" 
                                       min="0" 
                                       className="w-16 border p-1 rounded text-right"
                                       value={qty}
                                       onChange={(e) => setEditItems({...editItems, [p.id]: parseInt(e.target.value) || 0})}
                                     />
                                     <span className="text-gray-500 w-8">{p.unit}</span>
                                  </div>
                               </div>
                             );
                           })}
                        </div>
                     ) : (
                       <ul className="space-y-1">
                          {order.items.map((item, idx) => {
                             const p = products.find(prod => prod.id === item.productId);
                             return (
                               <li key={idx} className="flex justify-between text-sm">
                                  <span>{p?.name}</span>
                                  <span className="font-mono font-bold">{item.quantity} {p?.unit}</span>
                               </li>
                             )
                          })}
                       </ul>
                     )}
                  </div>

                  <div className="flex justify-end gap-2">
                     {isEditing ? (
                        <>
                           <button onClick={() => saveEditing(order)} className="px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700 flex items-center gap-1">
                              <Save size={16} /> Salva
                           </button>
                           <button onClick={cancelEditing} className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 flex items-center gap-1">
                              <XCircle size={16} /> Annulla
                           </button>
                        </>
                     ) : (
                        <button onClick={() => startEditing(order)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded border border-gray-200 flex items-center gap-1">
                           <Edit size={16} /> Modifica
                        </button>
                     )}
                     
                     {!isEditing && (
                        <button onClick={() => handleApprove(order)} className="px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700 flex items-center gap-2 shadow-sm">
                           {targetType === 'LINEN' ? <Mail size={16} /> : <Truck size={16} />}
                           {targetType === 'LINEN' ? 'Approva e Invia Mail' : 'Approva e Invia a Fornitore'}
                        </button>
                     )}
                  </div>
               </div>
             );
           })}
        </div>
      )}

      {sentOrders.length > 0 && (
        <div>
          <h3 className="text-xl font-bold mb-4 text-gray-700 flex items-center gap-2"><Clock size={24}/> Ordini Recenti (Inviati/Completati)</h3>
          <div className="space-y-4">
             {sentOrders.slice(0, 5).map(order => {
                const struct = structures.find(s => s.id === order.structureId);
                return (
                  <div key={order.id} className="bg-gray-50 border border-gray-200 rounded-lg p-4 opacity-75 hover:opacity-100 transition">
                     <div className="flex justify-between items-center">
                        <div>
                           <span className="font-bold text-gray-800">{struct?.name}</span>
                           <span className="text-sm text-gray-500 ml-2">- Inviato il {new Date(order.dateSent!).toLocaleDateString()}</span>
                        </div>
                        <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">INVIATO</span>
                     </div>
                     {order.sentToEmail && <p className="text-xs text-blue-600 mt-1">Inviato a: {order.sentToEmail}</p>}
                  </div>
                )
             })}
          </div>
        </div>
      )}

    </div>
  );
};

const SupplierDashboardView: React.FC<{
  orders: Order[];
  structures: Structure[];
  products: Product[];
  users: User[];
}> = ({ orders, structures, products, users }) => {
  const supplierOrders = orders.filter(o => (o.status === OrderStatus.SENT || o.status === OrderStatus.DELIVERED) && o.type === 'PRODUCT');

  const handleDeliver = (orderId: string) => {
    alert("Funzionalità di aggiornamento stato non collegata in questa demo per il fornitore.");
  };

  return (
    <div className="max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">Pannello Fornitore</h2>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="p-4 font-bold text-gray-600">Data</th>
              <th className="p-4 font-bold text-gray-600">Struttura</th>
              <th className="p-4 font-bold text-gray-600">Articoli</th>
              <th className="p-4 font-bold text-gray-600">Stato</th>
              <th className="p-4 font-bold text-gray-600">Azioni</th>
            </tr>
          </thead>
          <tbody>
            {supplierOrders.map(order => {
              const struct = structures.find(s => s.id === order.structureId);
              return (
                <tr key={order.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                  <td className="p-4 text-sm">{new Date(order.dateSent || order.dateCreated).toLocaleDateString()}</td>
                  <td className="p-4 font-medium">{struct?.name}</td>
                  <td className="p-4 text-sm">
                    {order.items.map(i => {
                      const p = products.find(prod => prod.id === i.productId);
                      return <div key={i.productId}>{i.quantity} x {p?.name}</div>;
                    })}
                  </td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${order.status === OrderStatus.DELIVERED ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`}>
                      {order.status}
                    </span>
                  </td>
                  <td className="p-4">
                    {order.status === OrderStatus.SENT && (
                      <button onClick={() => handleDeliver(order.id)} className="text-emerald-600 hover:text-emerald-800 font-medium text-sm">
                        Segna Consegnato
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
            {supplierOrders.length === 0 && (
              <tr>
                <td colSpan={5} className="p-8 text-center text-gray-500">Nessun ordine da gestire.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const NewInventoryView: React.FC<{
  structureId: string;
  currentUser: User;
  products: Product[];
  type: ItemType;
  onSave: (inv: InventoryReport) => void;
  onCancel: () => void;
}> = ({ structureId, currentUser, products, type, onSave, onCancel }) => {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [photo, setPhoto] = useState<string | null>(null);
  const [signature, setSignature] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [analyzing, setAnalyzing] = useState(false);

  const availableProducts = products.filter(p => p.type === type);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        setPhoto(base64);
        
        setAnalyzing(true);
        const results = await analyzeInventoryImage(base64, availableProducts);
        setAnalyzing(false);

        if (results && Array.isArray(results)) {
          const newItems: InventoryItem[] = [];
          results.forEach((res: any) => {
             const product = availableProducts.find(p => p.name.toLowerCase() === res.productName?.toLowerCase());
             if (product) {
               newItems.push({ productId: product.id, quantity: res.estimatedQuantity });
             }
          });
          if (newItems.length > 0) {
            setItems(prev => {
              const combined = [...prev];
              newItems.forEach(ni => {
                const idx = combined.findIndex(ex => ex.productId === ni.productId);
                if (idx >= 0) combined[idx].quantity = ni.quantity;
                else combined.push(ni);
              });
              return combined;
            });
            alert(`Trovati ${newItems.length} prodotti dall'immagine!`);
          } else {
             alert("Nessun prodotto riconosciuto nell'immagine.");
          }
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = () => {
    if (items.length === 0) {
      alert("Inserisci almeno un prodotto.");
      return;
    }
    
    if (!signature) {
      alert("La firma è obbligatoria.");
      return;
    }

    const report: InventoryReport = {
      id: `inv-${Date.now()}`,
      structureId,
      operatorId: currentUser.id,
      date: new Date().toISOString(),
      items,
      signatureUrl: signature,
      photoUrl: photo || undefined,
      notes,
      type
    };
    onSave(report);
  };

  const updateQuantity = (pid: string, qty: number) => {
    setItems(prev => {
      const existing = prev.find(i => i.productId === pid);
      if (existing) {
        if (qty <= 0) return prev.filter(i => i.productId !== pid);
        return prev.map(i => i.productId === pid ? { ...i, quantity: qty } : i);
      } else {
        if (qty > 0) return [...prev, { productId: pid, quantity: qty }];
        return prev;
      }
    });
  };

  return (
    <div className="max-w-2xl mx-auto bg-white p-6 rounded-xl shadow-sm">
      <h2 className="text-xl font-bold mb-4">Nuovo Inventario ({type === 'PRODUCT' ? 'Prodotti' : 'Biancheria'})</h2>
      
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">Foto Scaffale/Armadio (Opzionale per AI)</label>
        <div className="flex items-center gap-4">
          <label className="cursor-pointer bg-emerald-50 text-emerald-700 px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-emerald-100 transition">
            <Camera size={20} />
            {analyzing ? 'Analisi in corso...' : 'Scatta/Carica Foto'}
            <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} disabled={analyzing} />
          </label>
          {photo && <img src={photo} alt="Preview" className="h-12 w-12 object-cover rounded bg-gray-200" />}
        </div>
        {analyzing && <p className="text-xs text-emerald-600 mt-2 animate-pulse">L'IA sta contando i prodotti...</p>}
      </div>

      <div className="space-y-3 mb-6">
        <h3 className="font-bold text-gray-700">Articoli</h3>
        {availableProducts.map(p => {
          const currentQty = items.find(i => i.productId === p.id)?.quantity || 0;
          return (
            <div key={p.id} className="flex justify-between items-center border-b border-gray-100 pb-2">
              <span>{p.name}</span>
              <div className="flex items-center gap-2">
                <input 
                  type="number" 
                  min="0"
                  className="w-20 border rounded p-1 text-right"
                  value={currentQty}
                  onChange={(e) => updateQuantity(p.id, parseInt(e.target.value) || 0)}
                />
                <span className="text-gray-500 w-8 text-sm">{p.unit}</span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mb-6">
         <label className="block text-sm font-medium text-gray-700 mb-1">Note</label>
         <textarea 
           className="w-full border rounded p-2" 
           rows={2}
           value={notes} 
           onChange={e => setNotes(e.target.value)}
         />
      </div>

      <div className="mb-6">
        <SignaturePad onSave={setSignature} onClear={() => setSignature("")} />
      </div>

      <div className="flex gap-3">
        <button onClick={handleSave} className="flex-1 bg-emerald-600 text-white py-3 rounded-lg font-bold hover:bg-emerald-700">Salva Inventario</button>
        <button onClick={onCancel} className="flex-1 bg-gray-200 text-gray-800 py-3 rounded-lg font-bold hover:bg-gray-300">Annulla</button>
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
  onSave: (o: Order) => void;
  onCancel: () => void;
}> = ({ structureId, currentUser, products, inventories, type, onSave, onCancel }) => {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const availableProducts = products.filter(p => p.type === type);

  const updateQuantity = (pid: string, qty: number) => {
    setItems(prev => {
      const existing = prev.find(i => i.productId === pid);
      if (existing) {
        if (qty <= 0) return prev.filter(i => i.productId !== pid);
        return prev.map(i => i.productId === pid ? { ...i, quantity: qty } : i);
      } else {
        if (qty > 0) return [...prev, { productId: pid, quantity: qty }];
        return prev;
      }
    });
  };

  const handleSave = () => {
    if (items.length === 0) {
      alert("Seleziona almeno un prodotto da ordinare.");
      return;
    }
    const order: Order = {
      id: `ord-${Date.now()}`,
      structureId,
      requesterId: currentUser.id,
      dateCreated: new Date().toISOString(),
      status: OrderStatus.PENDING,
      items,
      type
    };
    onSave(order);
  };

  return (
    <div className="max-w-2xl mx-auto bg-white p-6 rounded-xl shadow-sm">
      <h2 className="text-xl font-bold mb-4">Nuovo Ordine ({type === 'PRODUCT' ? 'Prodotti' : 'Biancheria'})</h2>
      <div className="space-y-3 mb-6 max-h-[60vh] overflow-y-auto">
        {availableProducts.map(p => {
          const currentQty = items.find(i => i.productId === p.id)?.quantity || 0;
          return (
            <div key={p.id} className="flex justify-between items-center border-b border-gray-100 pb-2">
              <div>
                <p className="font-medium">{p.name}</p>
                <p className="text-xs text-gray-500">{p.category}</p>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => updateQuantity(p.id, currentQty - 1)}
                  className="w-8 h-8 rounded bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200"
                >
                  -
                </button>
                <input 
                  type="number" 
                  min="0"
                  className="w-16 border rounded p-1 text-center"
                  value={currentQty}
                  onChange={(e) => updateQuantity(p.id, parseInt(e.target.value) || 0)}
                />
                <button 
                  onClick={() => updateQuantity(p.id, currentQty + 1)}
                  className="w-8 h-8 rounded bg-emerald-100 flex items-center justify-center text-emerald-600 hover:bg-emerald-200"
                >
                  +
                </button>
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex gap-3">
        <button onClick={handleSave} className="flex-1 bg-emerald-600 text-white py-3 rounded-lg font-bold hover:bg-emerald-700">Invia Richiesta</button>
        <button onClick={onCancel} className="flex-1 bg-gray-200 text-gray-800 py-3 rounded-lg font-bold hover:bg-gray-300">Annulla</button>
      </div>
    </div>
  );
};

const NewDamageReportView: React.FC<{
  structureId: string;
  currentUser: User;
  products: Product[];
  onSave: (rep: DamageReport) => void;
  onCancel: () => void;
}> = ({ structureId, currentUser, products, onSave, onCancel }) => {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [notes, setNotes] = useState("");
  // Only Linen usually reported for damages/dirty
  const availableProducts = products.filter(p => p.type === 'LINEN');

  const updateQuantity = (pid: string, qty: number) => {
    setItems(prev => {
      const existing = prev.find(i => i.productId === pid);
      if (existing) {
        if (qty <= 0) return prev.filter(i => i.productId !== pid);
        return prev.map(i => i.productId === pid ? { ...i, quantity: qty } : i);
      } else {
        if (qty > 0) return [...prev, { productId: pid, quantity: qty }];
        return prev;
      }
    });
  };

  const handleSave = () => {
    if (items.length === 0) {
      alert("Indica cosa è danneggiato o sporco.");
      return;
    }
    const report: DamageReport = {
      id: `dmg-${Date.now()}`,
      structureId,
      reporterId: currentUser.id,
      date: new Date().toISOString(),
      items,
      notes,
      status: 'OPEN'
    };
    onSave(report);
  };

  return (
    <div className="max-w-2xl mx-auto bg-white p-6 rounded-xl shadow-sm border-l-4 border-red-500">
      <h2 className="text-xl font-bold mb-4 text-red-700">Segnalazione Danni / Sporco</h2>
      <p className="text-sm text-gray-500 mb-4">Indica i capi di biancheria che necessitano di sostituzione o lavaggio extra.</p>
      
      <div className="space-y-3 mb-6">
        {availableProducts.map(p => {
          const currentQty = items.find(i => i.productId === p.id)?.quantity || 0;
          return (
            <div key={p.id} className="flex justify-between items-center border-b border-gray-100 pb-2">
              <span>{p.name}</span>
              <div className="flex items-center gap-2">
                 <input 
                  type="number" 
                  min="0"
                  className="w-20 border rounded p-1 text-right"
                  value={currentQty}
                  onChange={(e) => updateQuantity(p.id, parseInt(e.target.value) || 0)}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="mb-6">
         <label className="block text-sm font-medium text-gray-700 mb-1">Note Aggiuntive</label>
         <textarea 
           className="w-full border rounded p-2" 
           rows={3}
           placeholder="Descrivi il danno (es. macchia, strappo...)"
           value={notes} 
           onChange={e => setNotes(e.target.value)}
         />
      </div>

      <div className="flex gap-3">
        <button onClick={handleSave} className="flex-1 bg-red-600 text-white py-3 rounded-lg font-bold hover:bg-red-700">Invia Segnalazione</button>
        <button onClick={onCancel} className="flex-1 bg-gray-200 text-gray-800 py-3 rounded-lg font-bold hover:bg-gray-300">Annulla</button>
      </div>
    </div>
  );
};

const UserManagementView: React.FC<{
  users: User[];
  setUsers: React.Dispatch<React.SetStateAction<User[]>>;
}> = ({ users, setUsers }) => {
  const [newUser, setNewUser] = useState<Partial<User>>({ role: Role.OPERATOR });
  const [isAdding, setIsAdding] = useState(false);

  const handleAdd = () => {
    if (!newUser.name || !newUser.email || !newUser.password) {
      alert("Compila tutti i campi");
      return;
    }
    const user: User = {
      id: `u-${Date.now()}`,
      name: newUser.name,
      email: newUser.email,
      role: newUser.role as Role,
      password: newUser.password
    };
    setUsers([...users, user]);
    setIsAdding(false);
    setNewUser({ role: Role.OPERATOR });
  };

  const handleDelete = (id: string) => {
    if (window.confirm("Eliminare utente?")) {
      setUsers(users.filter(u => u.id !== id));
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Gestione Utenti</h2>
        <button onClick={() => setIsAdding(!isAdding)} className="bg-emerald-600 text-white px-4 py-2 rounded flex items-center gap-2">
          <Plus size={18} /> Nuovo Utente
        </button>
      </div>

      {isAdding && (
        <div className="bg-white p-4 rounded-lg shadow-sm mb-6 border border-emerald-200">
          <h3 className="font-bold mb-3">Aggiungi Utente</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            <input placeholder="Nome" className="border p-2 rounded" value={newUser.name || ''} onChange={e => setNewUser({...newUser, name: e.target.value})} />
            <input placeholder="Email" className="border p-2 rounded" value={newUser.email || ''} onChange={e => setNewUser({...newUser, email: e.target.value})} />
            <input placeholder="Password" type="password" className="border p-2 rounded" value={newUser.password || ''} onChange={e => setNewUser({...newUser, password: e.target.value})} />
            <select className="border p-2 rounded" value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value as Role})}>
              {Object.values(Role).map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div className="mt-3 flex gap-2">
            <button onClick={handleAdd} className="bg-emerald-600 text-white px-3 py-1 rounded">Salva</button>
            <button onClick={() => setIsAdding(false)} className="bg-gray-200 text-gray-700 px-3 py-1 rounded">Annulla</button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="p-3 text-left">Nome</th>
              <th className="p-3 text-left">Email</th>
              <th className="p-3 text-left">Ruolo</th>
              <th className="p-3 text-right">Azioni</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id} className="border-b last:border-0">
                <td className="p-3">{u.name}</td>
                <td className="p-3 text-sm text-gray-500">{u.email}</td>
                <td className="p-3"><span className="bg-gray-100 px-2 py-1 rounded text-xs font-bold">{u.role}</span></td>
                <td className="p-3 text-right">
                  <button onClick={() => handleDelete(u.id)} className="text-red-500 hover:text-red-700"><Trash2 size={18}/></button>
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
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
}> = ({ products, setProducts }) => {
  const [newProd, setNewProd] = useState<Partial<Product>>({ type: 'PRODUCT', unit: 'Pz' });
  const [isAdding, setIsAdding] = useState(false);

  const handleAdd = () => {
    if (!newProd.name || !newProd.category) {
      alert("Nome e Categoria sono obbligatori");
      return;
    }
    const product: Product = {
      id: `p-${Date.now()}`,
      name: newProd.name,
      category: newProd.category as any,
      unit: newProd.unit || 'Pz',
      type: newProd.type as ItemType
    };
    setProducts([...products, product]);
    setIsAdding(false);
    setNewProd({ type: 'PRODUCT', unit: 'Pz' });
  };

  const handleDelete = (id: string) => {
     if (window.confirm("Eliminare prodotto?")) {
        setProducts(products.filter(p => p.id !== id));
     }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Catalogo Prodotti</h2>
        <button onClick={() => setIsAdding(!isAdding)} className="bg-emerald-600 text-white px-4 py-2 rounded flex items-center gap-2">
          <Plus size={18} /> Nuovo Prodotto
        </button>
      </div>

      {isAdding && (
        <div className="bg-white p-4 rounded-lg shadow-sm mb-6 border border-emerald-200">
          <h3 className="font-bold mb-3">Aggiungi Prodotto</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
             <input placeholder="Nome Prodotto" className="border p-2 rounded col-span-2" value={newProd.name || ''} onChange={e => setNewProd({...newProd, name: e.target.value})} />
             <select className="border p-2 rounded" value={newProd.type} onChange={e => setNewProd({...newProd, type: e.target.value as ItemType})}>
                <option value="PRODUCT">Consumabile</option>
                <option value="LINEN">Biancheria</option>
             </select>
             <select className="border p-2 rounded" value={newProd.category} onChange={e => setNewProd({...newProd, category: e.target.value as any})}>
                <option value="">Categoria...</option>
                {newProd.type === 'PRODUCT' ? (
                  <>
                    <option value="CLEANING">Pulizia</option>
                    <option value="FOOD">Cibo/Bevande</option>
                    <option value="AMENITIES">Amenities</option>
                  </>
                ) : (
                  <>
                    <option value="LINEN_BED">Letto</option>
                    <option value="LINEN_BATH">Bagno</option>
                  </>
                )}
                <option value="OTHER">Altro</option>
             </select>
             <input placeholder="Unità (es. Pz)" className="border p-2 rounded" value={newProd.unit || ''} onChange={e => setNewProd({...newProd, unit: e.target.value})} />
          </div>
          <div className="mt-3 flex gap-2">
            <button onClick={handleAdd} className="bg-emerald-600 text-white px-3 py-1 rounded">Salva</button>
            <button onClick={() => setIsAdding(false)} className="bg-gray-200 text-gray-700 px-3 py-1 rounded">Annulla</button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
         {/* Products List */}
         <div className="bg-white rounded-lg shadow p-4">
            <h3 className="font-bold text-gray-700 mb-3 border-b pb-2">Consumabili</h3>
            <ul className="space-y-2">
               {products.filter(p => p.type === 'PRODUCT').map(p => (
                  <li key={p.id} className="flex justify-between items-center p-2 hover:bg-gray-50 rounded">
                     <div>
                        <span className="font-medium">{p.name}</span>
                        <span className="text-xs text-gray-400 ml-2">({p.category})</span>
                     </div>
                     <button onClick={() => handleDelete(p.id)} className="text-gray-400 hover:text-red-500"><Trash2 size={16}/></button>
                  </li>
               ))}
            </ul>
         </div>

         {/* Linen List */}
         <div className="bg-white rounded-lg shadow p-4">
            <h3 className="font-bold text-gray-700 mb-3 border-b pb-2">Biancheria</h3>
            <ul className="space-y-2">
               {products.filter(p => p.type === 'LINEN').map(p => (
                  <li key={p.id} className="flex justify-between items-center p-2 hover:bg-gray-50 rounded">
                     <div>
                        <span className="font-medium">{p.name}</span>
                        <span className="text-xs text-gray-400 ml-2">({p.category})</span>
                     </div>
                     <button onClick={() => handleDelete(p.id)} className="text-gray-400 hover:text-red-500"><Trash2 size={16}/></button>
                  </li>
               ))}
            </ul>
         </div>
      </div>
    </div>
  );
};

export default App;