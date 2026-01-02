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
import { SignaturePad } from './components/SignaturePad';

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

// --- Components ---

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

const DashboardView: React.FC<any> = ({ structures, onSelectStructure, onAddStructure, onUpdateImage, role, pendingOrdersCount, onNavigateToOrders }) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [newStructName, setNewStructName] = useState('');
  const [newStructAddress, setNewStructAddress] = useState('');
  const [newStructCode, setNewStructCode] = useState('');

  const handleAdd = () => {
    if(newStructName && newStructAddress) {
      onAddStructure({ id: crypto.randomUUID(), name: newStructName, address: newStructAddress, accessCodes: newStructCode });
      setShowAddModal(false);
      setNewStructName(''); setNewStructAddress(''); setNewStructCode('');
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
           <h1 className="text-3xl font-bold text-gray-800">Zone e Strutture</h1>
           <p className="text-gray-500">Gestisci le proprietà e monitora lo stato</p>
        </div>
        <div className="flex gap-3">
           {(role === Role.ADMIN || role === Role.RECEPTION) && (
              <button 
                onClick={onNavigateToOrders}
                className="bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-lg shadow-sm hover:bg-gray-50 flex items-center gap-2"
              >
                <ShoppingCart size={20} />
                <span>Ordini</span>
                {pendingOrdersCount > 0 && <span className="bg-red-500 text-white text-xs px-2 rounded-full">{pendingOrdersCount}</span>}
              </button>
           )}
           {role === Role.ADMIN && (
             <button 
               onClick={() => setShowAddModal(true)}
               className="bg-emerald-600 text-white px-4 py-2 rounded-lg shadow-md hover:bg-emerald-700 flex items-center gap-2"
             >
               <Plus size={20} /> Nuova Struttura
             </button>
           )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {structures.map((s: any) => (
          <div key={s.id} onClick={() => onSelectStructure(s.id)} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition cursor-pointer group">
            <div className="h-40 bg-gray-200 relative">
              {s.imageUrl ? (
                <img src={s.imageUrl} alt={s.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400 bg-gray-100">
                  <Building2 size={48} />
                </div>
              )}
              {role === Role.ADMIN && (
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    const url = prompt("URL immagine:");
                    if(url) onUpdateImage(s.id, url);
                  }}
                  className="absolute top-2 right-2 bg-white/80 p-1.5 rounded-full hover:bg-white text-gray-600 opacity-0 group-hover:opacity-100 transition"
                >
                  <Camera size={16} />
                </button>
              )}
            </div>
            <div className="p-5">
              <h3 className="font-bold text-lg text-gray-800 mb-1">{s.name}</h3>
              <p className="text-gray-500 text-sm flex items-center gap-1"><MapPin size={14} /> {s.address}</p>
            </div>
          </div>
        ))}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-lg w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Aggiungi Struttura</h2>
            <input className="w-full border p-2 rounded mb-3" placeholder="Nome Struttura" value={newStructName} onChange={e => setNewStructName(e.target.value)} />
            <input className="w-full border p-2 rounded mb-3" placeholder="Indirizzo" value={newStructAddress} onChange={e => setNewStructAddress(e.target.value)} />
            <input className="w-full border p-2 rounded mb-6" placeholder="Codici Accesso" value={newStructCode} onChange={e => setNewStructCode(e.target.value)} />
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowAddModal(false)} className="text-gray-500 px-4 py-2">Annulla</button>
              <button onClick={handleAdd} className="bg-emerald-600 text-white px-4 py-2 rounded">Crea</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const SupplierDashboardView: React.FC<any> = ({ orders, structures, products, users }) => {
  const pendingOrders = orders.filter((o: any) => o.status === OrderStatus.SENT);
  const historyOrders = orders.filter((o: any) => o.status === OrderStatus.DELIVERED);

  return (
    <div className="max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
        <Truck className="text-emerald-600" /> Pannello Fornitore
      </h1>

      <div className="space-y-8">
        <section>
          <h2 className="text-lg font-bold mb-4 text-orange-600 flex items-center gap-2"><Bell size={18} /> Ordini da Evadere</h2>
          <div className="space-y-4">
            {pendingOrders.length === 0 && <p className="text-gray-400 italic">Nessun ordine in attesa.</p>}
            {pendingOrders.map((o: any) => (
              <div key={o.id} className="bg-white border-l-4 border-orange-500 p-4 rounded shadow-sm">
                 <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-bold">{structures.find((s: any) => s.id === o.structureId)?.name}</h3>
                      <p className="text-xs text-gray-500">{new Date(o.dateSent!).toLocaleString()}</p>
                    </div>
                    <span className="bg-orange-100 text-orange-800 text-xs px-2 py-1 rounded font-bold">IN ATTESA</span>
                 </div>
                 <div className="my-3 pl-4 border-l-2 border-gray-100">
                    {o.items.map((i: any, idx: number) => {
                       const p = products.find((pr: any) => pr.id === i.productId);
                       return (
                         <div key={idx} className="flex justify-between text-sm py-1">
                           <span>{p?.name || 'Prodotto sconosciuto'}</span>
                           <span className="font-bold">{i.quantity} {p?.unit}</span>
                         </div>
                       )
                    })}
                 </div>
                 <div className="flex justify-end">
                    <button className="bg-emerald-600 text-white text-sm px-4 py-2 rounded hover:bg-emerald-700">
                       Segna come Consegnato
                    </button>
                 </div>
              </div>
            ))}
          </div>
        </section>

        <section>
           <h2 className="text-lg font-bold mb-4 text-gray-600">Storico Consegne</h2>
           <div className="space-y-4 opacity-75">
             {historyOrders.map((o: any) => (
                <div key={o.id} className="bg-white p-4 rounded shadow-sm border border-gray-200">
                   <div className="flex justify-between mb-1">
                      <span className="font-bold text-gray-700">{structures.find((s: any) => s.id === o.structureId)?.name}</span>
                      <span className="text-green-600 font-bold text-xs">CONSEGNATO</span>
                   </div>
                   <p className="text-xs text-gray-400">Data: {new Date(o.dateCreated).toLocaleDateString()}</p>
                </div>
             ))}
           </div>
        </section>
      </div>
    </div>
  )
};

const NewInventoryView: React.FC<any> = ({ structureId, currentUser, products, type, onSave, onCancel }) => {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [notes, setNotes] = useState('');
  const [signature, setSignature] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const filteredProducts = products.filter((p: Product) => p.type === type);

  useEffect(() => {
    setItems(filteredProducts.map((p: Product) => ({ productId: p.id, quantity: 0 })));
  }, [products, type]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if(e.target.files && e.target.files[0]) {
      setAnalyzing(true);
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        const analysis = await analyzeInventoryImage(base64, filteredProducts);
        
        const newItems = [...items];
        analysis.forEach((res: any) => {
           const product = filteredProducts.find((p: Product) => p.name.toLowerCase() === res.productName.toLowerCase());
           if(product) {
             const idx = newItems.findIndex(i => i.productId === product.id);
             if(idx >= 0) newItems[idx].quantity = res.estimatedQuantity;
           }
        });
        setItems(newItems);
        setAnalyzing(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = () => {
    if(!signature) { alert('Firma obbligatoria'); return; }
    onSave({
      id: crypto.randomUUID(),
      structureId,
      operatorId: currentUser.id,
      date: new Date().toISOString(),
      items,
      signatureUrl: signature, 
      notes,
      type
    });
  };

  return (
    <div className="max-w-2xl mx-auto bg-white p-6 rounded-lg shadow-lg mt-8">
       <h2 className="text-xl font-bold mb-4">Nuovo Inventario ({type === 'LINEN' ? 'Biancheria' : 'Prodotti'})</h2>
       
       <div className="mb-6 p-4 bg-emerald-50 rounded-lg border border-emerald-100">
         <div className="flex items-center gap-3 mb-2">
            <div className="bg-emerald-200 p-2 rounded-full"><Camera className="text-emerald-800" size={20} /></div>
            <div className="font-bold text-emerald-900">Compilazione Smart con AI</div>
         </div>
         <p className="text-sm text-emerald-700 mb-3">Scatta una foto al magazzino, l'AI conterà i prodotti per te.</p>
         <input type="file" accept="image/*" capture="environment" ref={fileInputRef} className="hidden" onChange={handleImageUpload} />
         <button onClick={() => fileInputRef.current?.click()} disabled={analyzing} className="bg-emerald-600 text-white px-4 py-2 rounded shadow-sm w-full flex justify-center items-center gap-2">
           {analyzing ? <Loader className="animate-spin" size={18} /> : <Camera size={18} />}
           {analyzing ? 'Analisi in corso...' : 'Scatta Foto Magazzino'}
         </button>
       </div>

       <div className="space-y-3 mb-6 max-h-96 overflow-y-auto">
         {items.map((item, idx) => {
           const p = products.find((pr: Product) => pr.id === item.productId);
           if(!p) return null;
           return (
             <div key={p.id} className="flex justify-between items-center border-b pb-2">
               <label className="font-medium text-gray-700">{p.name}</label>
               <div className="flex items-center gap-2">
                 <button onClick={() => {
                    const newI = [...items];
                    if(newI[idx].quantity > 0) newI[idx].quantity--;
                    setItems(newI);
                 }} className="bg-gray-200 w-8 h-8 rounded flex items-center justify-center">-</button>
                 <span className="w-12 text-center font-bold">{item.quantity}</span>
                 <button onClick={() => {
                    const newI = [...items];
                    newI[idx].quantity++;
                    setItems(newI);
                 }} className="bg-gray-200 w-8 h-8 rounded flex items-center justify-center">+</button>
               </div>
             </div>
           )
         })}
       </div>
       
       <div className="mb-6">
         <label className="block text-sm font-bold mb-1">Note</label>
         <textarea className="w-full border rounded p-2" rows={3} value={notes} onChange={e => setNotes(e.target.value)}></textarea>
       </div>

       <div className="mb-6">
          <SignaturePad onSave={setSignature} onClear={() => setSignature('')} />
       </div>

       <div className="flex justify-end gap-3">
         <button onClick={onCancel} className="px-4 py-2 text-gray-600">Annulla</button>
         <button onClick={handleSave} className="px-4 py-2 bg-emerald-600 text-white rounded font-bold">Salva Inventario</button>
       </div>
    </div>
  )
};

const NewOrderView: React.FC<any> = ({ structureId, currentUser, products, type, onSave, onCancel }) => {
  const [items, setItems] = useState<InventoryItem[]>([]);

  const filteredProducts = products.filter((p: Product) => p.type === type);

  const handleAddItem = (prodId: string) => {
    if(items.some(i => i.productId === prodId)) return;
    setItems([...items, { productId: prodId, quantity: 1 }]);
  };

  const updateQuantity = (idx: number, val: number) => {
    const newItems = [...items];
    newItems[idx].quantity = val;
    setItems(newItems);
  };

  const removeItem = (idx: number) => {
    setItems(items.filter((_, i) => i !== idx));
  };

  return (
    <div className="max-w-2xl mx-auto bg-white p-6 rounded-lg shadow-lg mt-8">
       <h2 className="text-xl font-bold mb-6">Ordina {type === 'LINEN' ? 'Biancheria' : 'Prodotti'}</h2>
       
       <div className="mb-6">
          <label className="block text-sm font-bold mb-2">Aggiungi Prodotto</label>
          <select className="w-full border p-2 rounded" onChange={(e) => { if(e.target.value) handleAddItem(e.target.value); e.target.value=''; }}>
             <option value="">Seleziona...</option>
             {filteredProducts.map((p: Product) => (
               <option key={p.id} value={p.id}>{p.name}</option>
             ))}
          </select>
       </div>

       <div className="space-y-3 mb-8">
          {items.map((item, idx) => {
             const p = products.find((pr: Product) => pr.id === item.productId);
             return (
               <div key={idx} className="flex justify-between items-center bg-gray-50 p-3 rounded">
                 <span className="font-medium">{p?.name}</span>
                 <div className="flex items-center gap-3">
                    <input type="number" min="1" className="w-20 border rounded p-1 text-center" value={item.quantity} onChange={e => updateQuantity(idx, parseInt(e.target.value))} />
                    <span className="text-xs text-gray-500">{p?.unit}</span>
                    <button onClick={() => removeItem(idx)} className="text-red-500"><Trash2 size={18} /></button>
                 </div>
               </div>
             )
          })}
          {items.length === 0 && <p className="text-gray-400 text-center text-sm">Nessun prodotto nell'ordine</p>}
       </div>

       <div className="flex justify-end gap-3">
         <button onClick={onCancel} className="px-4 py-2 text-gray-600">Annulla</button>
         <button 
           onClick={() => onSave({
             id: crypto.randomUUID(),
             structureId,
             requesterId: currentUser.id,
             dateCreated: new Date().toISOString(),
             status: OrderStatus.PENDING,
             items,
             type
           })}
           disabled={items.length === 0}
           className="px-4 py-2 bg-blue-600 text-white rounded font-bold disabled:opacity-50"
         >
           Invia Ordine
         </button>
       </div>
    </div>
  );
};

const NewDamageReportView: React.FC<any> = ({ structureId, currentUser, products, type, onSave, onCancel }) => {
   const [notes, setNotes] = useState('');
   return (
     <div className="max-w-lg mx-auto bg-white p-6 rounded-lg shadow-lg mt-8">
       <h2 className="text-xl font-bold mb-4 text-red-600 flex items-center gap-2"><AlertTriangle /> Segnala Guasto</h2>
       <div className="mb-4">
         <label className="block font-bold text-sm mb-1">Descrizione Problema</label>
         <textarea className="w-full border rounded p-2 h-32" placeholder="Descrivi cosa è rotto o necessita intervento..." value={notes} onChange={e => setNotes(e.target.value)}></textarea>
       </div>
       <div className="flex justify-end gap-3">
         <button onClick={onCancel} className="px-4 py-2 text-gray-600">Annulla</button>
         <button onClick={() => onSave({
            id: crypto.randomUUID(),
            structureId,
            reporterId: currentUser.id,
            date: new Date().toISOString(),
            items: [], 
            notes,
            status: 'OPEN'
         })} className="px-4 py-2 bg-red-600 text-white rounded font-bold">Invia Segnalazione</button>
       </div>
     </div>
   )
};

const NewLinenIssueView: React.FC<any> = ({ structureId, currentUser, products, onSave, onCancel }) => {
   const [items, setItems] = useState<LinenIssueItem[]>([]);
   const [notes, setNotes] = useState('');
   
   const linenProducts = products.filter((p: Product) => p.type === 'LINEN');

   useEffect(() => {
     setItems(linenProducts.map((p: Product) => ({ productId: p.id, dirty: 0, broken: 0, unused: 0 })));
   }, [products]);

   const updateVal = (idx: number, field: keyof LinenIssueItem, val: number) => {
     const newItems = [...items];
     (newItems[idx] as any)[field] = val;
     setItems(newItems);
   };

   return (
      <div className="max-w-3xl mx-auto bg-white p-6 rounded-lg shadow-lg mt-8">
         <h2 className="text-xl font-bold mb-4 text-purple-700">Report Biancheria (Sporca / Rotta)</h2>
         <div className="space-y-4 mb-6">
           <div className="grid grid-cols-12 gap-2 text-xs font-bold text-gray-500 uppercase text-center">
             <div className="col-span-3 text-left">Prodotto</div>
             <div className="col-span-3">Sporca</div>
             <div className="col-span-3">Rotta</div>
             <div className="col-span-3">Inutilizzata</div>
           </div>
           {items.map((item, idx) => {
              const p = products.find((pr: Product) => pr.id === item.productId);
              return (
                 <div key={idx} className="grid grid-cols-12 gap-2 items-center border-b pb-2">
                    <div className="col-span-3 font-medium text-sm">{p?.name}</div>
                    <div className="col-span-3 flex justify-center"><input type="number" min="0" className="w-16 border rounded text-center" value={item.dirty} onChange={e=>updateVal(idx, 'dirty', parseInt(e.target.value))} /></div>
                    <div className="col-span-3 flex justify-center"><input type="number" min="0" className="w-16 border rounded text-center" value={item.broken} onChange={e=>updateVal(idx, 'broken', parseInt(e.target.value))} /></div>
                    <div className="col-span-3 flex justify-center"><input type="number" min="0" className="w-16 border rounded text-center" value={item.unused} onChange={e=>updateVal(idx, 'unused', parseInt(e.target.value))} /></div>
                 </div>
              )
           })}
         </div>
         <div className="mb-4">
            <label className="block text-sm font-bold mb-1">Note</label>
            <textarea className="w-full border rounded p-2" value={notes} onChange={e=>setNotes(e.target.value)}></textarea>
         </div>
         <div className="flex justify-end gap-3">
             <button onClick={onCancel} className="px-4 py-2">Annulla</button>
             <button onClick={() => onSave({
                id: crypto.randomUUID(),
                structureId,
                reporterId: currentUser.id,
                date: new Date().toISOString(),
                items: items.filter(i => i.dirty > 0 || i.broken > 0 || i.unused > 0),
                notes
             })} className="px-4 py-2 bg-purple-600 text-white rounded">Salva Report</button>
         </div>
      </div>
   );
};

const LinenIssuesLogView: React.FC<any> = ({ reports, structures, products, users, onUpdateReport, onDeleteReport }) => {
   return (
     <div className="max-w-5xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Log Biancheria Sporca/Rotta</h1>
        <div className="space-y-4">
           {reports.map((r: any) => (
             <div key={r.id} className="bg-white p-4 rounded shadow-sm border border-gray-100">
                <div className="flex justify-between items-start">
                   <div>
                      <h3 className="font-bold">{structures.find((s: Structure) => s.id === r.structureId)?.name}</h3>
                      <p className="text-xs text-gray-500">{new Date(r.date).toLocaleString()} - da {users.find((u:User)=>u.id===r.reporterId)?.name}</p>
                   </div>
                   <button onClick={() => onDeleteReport(r.id)} className="text-red-500"><Trash2 size={16} /></button>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-sm bg-gray-50 p-2 rounded">
                  {r.items.map((i: any, idx: number) => {
                     const p = products.find((pr: Product) => pr.id === i.productId);
                     return (
                        <div key={idx} className="col-span-3 md:col-span-1 border-b md:border-b-0 border-gray-200 pb-1">
                          <span className="font-bold">{p?.name}</span>: 
                          {i.dirty > 0 && <span className="text-yellow-600 ml-1">Sporco: {i.dirty}</span>}
                          {i.broken > 0 && <span className="text-red-600 ml-1">Rotto: {i.broken}</span>}
                          {i.unused > 0 && <span className="text-green-600 ml-1">Inutilizzato: {i.unused}</span>}
                        </div>
                     )
                  })}
                </div>
                {r.notes && <p className="text-xs italic text-gray-500 mt-2">Note: {r.notes}</p>}
             </div>
           ))}
        </div>
     </div>
   )
};

const ManageOrdersView: React.FC<any> = ({ orders, structures, products, users, currentUser, targetType, onUpdateOrder, onDeleteOrder }) => {
   const filtered = orders.filter((o: Order) => o.type === targetType).sort((a:Order, b:Order) => new Date(b.dateCreated).getTime() - new Date(a.dateCreated).getTime());
   
   const handleSend = (order: Order) => {
      // Simulate sending email
      onUpdateOrder({
         ...order,
         status: OrderStatus.SENT,
         dateSent: new Date().toISOString(),
         sentToEmail: 'fornitore@example.com'
      });
      alert('Ordine inviato al fornitore!');
   };

   return (
     <div className="max-w-5xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Gestione Ordini {targetType === 'LINEN' ? 'Biancheria' : 'Prodotti'}</h1>
        <div className="space-y-4">
          {filtered.map((o: Order) => (
             <div key={o.id} className="bg-white p-5 rounded-lg shadow-sm border border-gray-100">
                <div className="flex justify-between items-start mb-4">
                   <div>
                      <h3 className="font-bold text-lg">{structures.find((s: Structure) => s.id === o.structureId)?.name}</h3>
                      <p className="text-sm text-gray-500">Richiesto da: {users.find((u: User) => u.id === o.requesterId)?.name} il {new Date(o.dateCreated).toLocaleString()}</p>
                   </div>
                   <div className="flex flex-col items-end gap-2">
                      <span className={`px-2 py-1 rounded text-xs font-bold ${o.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' : o.status === 'SENT' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                         {o.status}
                      </span>
                   </div>
                </div>
                <div className="bg-gray-50 p-3 rounded mb-4 text-sm">
                   {o.items.map((i, idx) => {
                      const p = products.find((pr: Product) => pr.id === i.productId);
                      return <div key={idx}>{p?.name}: <b>{i.quantity}</b> {p?.unit}</div>
                   })}
                </div>
                <div className="flex justify-end gap-3">
                   {o.status === 'PENDING' && (currentUser.role === Role.ADMIN || currentUser.role === Role.RECEPTION) && (
                      <button onClick={() => handleSend(o)} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition">
                         <Mail size={16} /> Approva e Invia a Fornitore
                      </button>
                   )}
                   {currentUser.role === Role.ADMIN && (
                      <button onClick={() => onDeleteOrder(o.id)} className="text-red-500 p-2 hover:bg-red-50 rounded"><Trash2 /></button>
                   )}
                </div>
             </div>
          ))}
          {filtered.length === 0 && <p className="text-center text-gray-400">Nessun ordine presente.</p>}
        </div>
     </div>
   )
};

const UserManagementView: React.FC<any> = ({ users, onAddUser, onDeleteUser }) => {
   const [newUser, setNewUser] = useState({ name: '', email: '', role: Role.OPERATOR, password: '' });
   
   return (
     <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Gestione Utenti</h1>
        
        <div className="bg-white p-6 rounded-lg shadow-sm mb-8">
           <h3 className="font-bold mb-4">Aggiungi Utente</h3>
           <div className="grid grid-cols-2 gap-4 mb-4">
              <input className="border p-2 rounded" placeholder="Nome" value={newUser.name} onChange={e => setNewUser({...newUser, name: e.target.value})} />
              <input className="border p-2 rounded" placeholder="Email" value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})} />
              <select className="border p-2 rounded" value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value as Role})}>
                 {Object.values(Role).map(r => <option key={r} value={r}>{r}</option>)}
              </select>
              <input className="border p-2 rounded" placeholder="Password" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} />
           </div>
           <button onClick={() => {
              if(newUser.name && newUser.email) {
                 onAddUser({ id: crypto.randomUUID(), ...newUser });
                 setNewUser({ name: '', email: '', role: Role.OPERATOR, password: '' });
              }
           }} className="bg-emerald-600 text-white px-4 py-2 rounded">Aggiungi</button>
        </div>

        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
           <table className="w-full text-left">
              <thead className="bg-gray-100">
                 <tr>
                    <th className="p-4">Nome</th>
                    <th className="p-4">Email</th>
                    <th className="p-4">Ruolo</th>
                    <th className="p-4">Azioni</th>
                 </tr>
              </thead>
              <tbody>
                 {users.map((u: User) => (
                    <tr key={u.id} className="border-t">
                       <td className="p-4">{u.name}</td>
                       <td className="p-4">{u.email}</td>
                       <td className="p-4"><span className="px-2 py-1 rounded text-xs font-bold bg-gray-100">{u.role}</span></td>
                       <td className="p-4">
                          <button onClick={() => onDeleteUser(u.id)} className="text-red-500"><Trash2 size={18} /></button>
                       </td>
                    </tr>
                 ))}
              </tbody>
           </table>
        </div>
     </div>
   )
};

const ProductManagementView: React.FC<any> = ({ products, onAddProduct, onDeleteProduct }) => {
   const [newProd, setNewProd] = useState({ name: '', category: 'CLEANING', unit: 'Pz', type: 'PRODUCT' });

   return (
     <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Gestione Prodotti</h1>

        <div className="bg-white p-6 rounded-lg shadow-sm mb-8">
           <h3 className="font-bold mb-4">Aggiungi Prodotto</h3>
           <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <input className="border p-2 rounded" placeholder="Nome" value={newProd.name} onChange={e => setNewProd({...newProd, name: e.target.value})} />
              <select className="border p-2 rounded" value={newProd.category} onChange={e => setNewProd({...newProd, category: e.target.value as any})}>
                 <option value="CLEANING">Cleaning</option>
                 <option value="FOOD">Food</option>
                 <option value="AMENITIES">Amenities</option>
                 <option value="LINEN_BED">Linen Bed</option>
                 <option value="LINEN_BATH">Linen Bath</option>
                 <option value="OTHER">Other</option>
              </select>
              <input className="border p-2 rounded" placeholder="Unità (es. Pz)" value={newProd.unit} onChange={e => setNewProd({...newProd, unit: e.target.value})} />
              <select className="border p-2 rounded" value={newProd.type} onChange={e => setNewProd({...newProd, type: e.target.value as ItemType})}>
                 <option value="PRODUCT">Consumabile</option>
                 <option value="LINEN">Biancheria</option>
              </select>
           </div>
           <button onClick={() => {
              if(newProd.name) {
                 onAddProduct({ id: crypto.randomUUID(), ...newProd });
                 setNewProd({ name: '', category: 'CLEANING', unit: 'Pz', type: 'PRODUCT' });
              }
           }} className="bg-emerald-600 text-white px-4 py-2 rounded">Aggiungi</button>
        </div>

        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
           <table className="w-full text-left">
              <thead className="bg-gray-100">
                 <tr>
                    <th className="p-4">Nome</th>
                    <th className="p-4">Categoria</th>
                    <th className="p-4">Unità</th>
                    <th className="p-4">Tipo</th>
                    <th className="p-4">Azioni</th>
                 </tr>
              </thead>
              <tbody>
                 {products.map((p: Product) => (
                    <tr key={p.id} className="border-t">
                       <td className="p-4 font-medium">{p.name}</td>
                       <td className="p-4 text-sm text-gray-500">{p.category}</td>
                       <td className="p-4 text-sm">{p.unit}</td>
                       <td className="p-4"><span className={`text-xs px-2 py-1 rounded font-bold ${p.type==='LINEN'?'bg-purple-100 text-purple-700':'bg-blue-100 text-blue-700'}`}>{p.type}</span></td>
                       <td className="p-4">
                          <button onClick={() => onDeleteProduct(p.id)} className="text-red-500"><Trash2 size={18} /></button>
                       </td>
                    </tr>
                 ))}
              </tbody>
           </table>
        </div>
     </div>
   )
};

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
                  onSelectStructure={(id: string) => { setSelectedStructureId(id); setCurrentView('structure-detail'); }}
                  onAddStructure={async (newS: any) => {
                    const { data, error } = await supabase.from('structures').insert({
                      id: newS.id, name: newS.name, address: newS.address, access_codes: newS.accessCodes
                    }).select().single();
                    if(!error && data) setStructures([...structures, mapStructure(data)]);
                  }}
                  onUpdateImage={async (id: string, url: string) => {
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
                  onSave={async (inv: any) => {
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
                onSave={async (ord: any) => {
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
                onSave={async (rep: any) => {
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
                onSave={async (rep: any) => {
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
                  onUpdateReport={async (updated: any) => {
                     // Simplified edit: just re-save
                     const { error } = await supabase.from('linen_reports').update({
                       items: updated.items, notes: updated.notes
                     }).eq('id', updated.id);
                     if (!error) {
                        setLinenReports(prev => prev.map(r => r.id === updated.id ? updated : r));
                     }
                  }}
                  onDeleteReport={async (id: string) => {
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
                  onUpdateOrder={async (updatedOrder: any) => {
                    const { error } = await supabase.from('orders').update({
                       items: updatedOrder.items, status: updatedOrder.status, 
                       date_sent: updatedOrder.dateSent, sent_to_email: updatedOrder.sentToEmail
                    }).eq('id', updatedOrder.id);
                    if(!error) setOrders(orders.map(o => o.id === updatedOrder.id ? updatedOrder : o));
                  }}
                  onDeleteOrder={async (id: string) => {
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
                  onUpdateOrder={async (updatedOrder: any) => {
                    const { error } = await supabase.from('orders').update({
                       items: updatedOrder.items, status: updatedOrder.status, 
                       date_sent: updatedOrder.dateSent, sent_to_email: updatedOrder.sentToEmail
                    }).eq('id', updatedOrder.id);
                    if(!error) setOrders(orders.map(o => o.id === updatedOrder.id ? updatedOrder : o));
                  }}
                  onDeleteOrder={async (id: string) => {
                     const { error } = await supabase.from('orders').delete().eq('id', id);
                     if(!error) setOrders(orders.filter(o => o.id !== id));
                  }}
               />
      case 'users':
        return <UserManagementView 
                  users={users} 
                  setUsers={setUsers} 
                  onAddUser={async (newUser: any) => {
                     const { data, error } = await supabase.from('users').insert({
                        id: newUser.id, name: newUser.name, email: newUser.email,
                        role: newUser.role, password: newUser.password
                     }).select().single();
                     if(!error && data) setUsers([...users, mapUser(data)]);
                  }}
                  onDeleteUser={async (id: string) => {
                     const { error } = await supabase.from('users').delete().eq('id', id);
                     if(!error) setUsers(users.filter(u => u.id !== id));
                  }}
               />;
      case 'products':
        return <ProductManagementView 
                  products={products} 
                  setProducts={setProducts} 
                  onAddProduct={async (newP: any) => {
                     const { data, error } = await supabase.from('products').insert({
                        id: newP.id, name: newP.name, category: newP.category,
                        unit: newP.unit, type: newP.type
                     }).select().single();
                     if(!error && data) setProducts([...products, mapProduct(data)]);
                  }}
                  onDeleteProduct={async (id: string) => {
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

export default App;