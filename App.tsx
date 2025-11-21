import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Pedido, Empresa, OrderStatus, DeliveryType } from './types';
import { getOrders, getEmpresaInfo, updateOrderStatus, updateEmpresaAvailability, subscribeToUpdates } from './services/api';
import StatusBadge from './components/StatusBadge';
import OrderDetailModal from './components/OrderDetailModal';
import StatsWidget from './components/StatsWidget';
import { 
  RefreshCw, Filter, ShoppingBag, Clock, 
  Search, Store, ChevronRight, Power, Wifi, Server
} from 'lucide-react';

function App() {
  // State
  const [orders, setOrders] = useState<Pedido[]>([]);
  const [empresa, setEmpresa] = useState<Empresa | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [selectedOrder, setSelectedOrder] = useState<Pedido | null>(null);
  const [isLive, setIsLive] = useState(false);
  
  // Filters
  const [filterStatus, setFilterStatus] = useState<OrderStatus | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch Data Function
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Intentamos cargar datos
      const [ordersData, empresaData] = await Promise.all([
        getOrders(),
        getEmpresaInfo()
      ]);
      
      setOrders(ordersData);
      setEmpresa(empresaData);
      setLastUpdated(new Date());
      setIsLive(true);
      setError(null); // Limpiar errores previos si tuvimos éxito
    } catch (error: any) {
      console.error("Error fetching data", error);
      setIsLive(false);
      
      if (error.message === 'CONNECTION_ERROR') {
        setError("No se puede conectar con server.js. ¿Está corriendo 'node server.js'?");
      } else {
        setError("Error al obtener datos. Verifica la conexión a la base de datos.");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // Reintentar conexión automáticamente si falla
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        console.log("Reintentando conexión...");
        fetchData();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, fetchData]);

  // Initial Load & WebSocket Connection + Fallback de auto-refresh
useEffect(() => {
  // 1) Carga inicial completa (pedidos + empresa)
  fetchData();

  // 2) Suscripción por WebSocket (tiempo real "push")
  const unsubscribe = subscribeToUpdates(
    (newOrder) => {
      console.log("WS NEW_ORDER recibido:", newOrder);
      setOrders(prev => [newOrder, ...prev]);
      setLastUpdated(new Date());
    },
    (updatedOrder) => {
      console.log("WS ORDER_UPDATE recibido:", updatedOrder);
      setOrders(prev => prev.map(o => o.id === updatedOrder.id ? updatedOrder : o));
      if (selectedOrder && selectedOrder.id === updatedOrder.id) {
        setSelectedOrder(updatedOrder);
      }
      setLastUpdated(new Date());
    },
    (updatedEmpresa) => {
      console.log("WS EMPRESA_UPDATE recibido:", updatedEmpresa);
      setEmpresa(updatedEmpresa);
    }
  );

  // 3) Fallback: polling cada 5 segundos
  const intervalId = window.setInterval(async () => {
    try {
      const ordersData = await getOrders();
      setOrders(ordersData);
      setLastUpdated(new Date());
    } catch (err) {
      console.error("Error en auto-actualización de pedidos:", err);
    }
  }, 5000); // 5000 ms = 5 segundos

  // Limpieza al desmontar
  return () => {
    unsubscribe();
    clearInterval(intervalId);
  };
}, [fetchData, selectedOrder]);

  // Handle Status Change
  const handleStatusChange = async (orderId: number, newStatus: OrderStatus) => {
    try {
      await updateOrderStatus(orderId, newStatus);
    } catch (error) {
      console.error("Failed to update status", error);
      alert("Error al actualizar el estado. Verifica la conexión.");
    }
  };

  // Handle Availability Toggle
  const toggleAvailability = async () => {
    if (!empresa) return;
    const newStatus = !empresa.disponible;
    const motivo = newStatus ? "" : "Cerrado desde dashboard";
    try {
      const updated = await updateEmpresaAvailability(newStatus, motivo);
      setEmpresa(updated);
    } catch (e) {
      console.error("Error toggling availability", e);
      alert("Error al actualizar disponibilidad. Verifica que server.js esté corriendo.");
    }
  };

  // Derived State (Filtered Orders)
  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      const matchesStatus = filterStatus === 'all' || order.estado === filterStatus;
      const matchesSearch = 
        (order.nombre_cliente?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        order.id.toString().includes(searchTerm) ||
        (order.telefono_cliente || '').includes(searchTerm);
      return matchesStatus && matchesSearch;
    });
  }, [orders, filterStatus, searchTerm]);

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      
      {/* Top Navigation / Header */}
      <header className="bg-white shadow-sm sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-orange-500 p-2 rounded-lg">
              <ShoppingBag className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 tracking-tight">Taquería Don Juan</h1>
              <div className="flex items-center gap-2 text-xs">
                <span className={`flex items-center gap-1 font-medium ${isLive ? 'text-green-600' : 'text-red-500'}`}>
                  <Wifi className="h-3 w-3" />
                  {isLive ? 'Conectado' : 'Desconectado'}
                </span>
                <span className="text-gray-300">|</span>
                <p className="text-gray-500 flex items-center gap-1">
                  <Clock className="h-3 w-3" /> 
                  {lastUpdated.toLocaleTimeString()}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {empresa && (
              <button
                onClick={toggleAvailability}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  empresa.disponible 
                    ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                    : 'bg-red-100 text-red-700 hover:bg-red-200'
                }`}
              >
                <Power className="h-4 w-4" />
                {empresa.disponible ? 'Abierto' : 'Cerrado'}
              </button>
            )}

            <button 
              onClick={fetchData} 
              className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition"
              title="Refrescar datos"
            >
              <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
        {/* Banner de Error */}
        {error && (
          <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 shadow-sm rounded-r-md animate-pulse">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <Server className="h-5 w-5 text-red-500" />
              </div>
              <div className="ml-3 w-full">
                <h3 className="text-sm font-medium text-red-800">Sistema Desconectado</h3>
                <p className="mt-1 text-sm text-red-700">{error}</p>
                <p className="mt-1 text-xs text-red-600">Reintentando en 5 segundos... Asegúrate de tener una terminal con 'node server.js' corriendo.</p>
              </div>
            </div>
          </div>
        )}

        {/* Stats & Summary Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <div className="lg:col-span-2 bg-white rounded-lg shadow p-6 flex flex-col justify-center">
             <h2 className="text-lg font-medium text-gray-900 mb-2">Panel de Control</h2>
             <p className="text-gray-500 mb-4">Gestiona los pedidos entrantes del agente de voz.</p>
             <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 text-center">
                   <span className="block text-2xl font-bold text-blue-600">{orders.filter(o => o.estado === OrderStatus.PENDIENTE).length}</span>
                   <span className="text-xs text-blue-600 font-medium uppercase">Pendientes</span>
                </div>
                <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-100 text-center">
                   <span className="block text-2xl font-bold text-yellow-600">{orders.filter(o => o.estado === OrderStatus.EN_PREPARACION).length}</span>
                   <span className="text-xs text-yellow-600 font-medium uppercase">Cocinando</span>
                </div>
                <div className="bg-green-50 p-4 rounded-lg border border-green-100 text-center">
                   <span className="block text-2xl font-bold text-green-600">{orders.filter(o => o.estado === OrderStatus.LISTO).length}</span>
                   <span className="text-xs text-green-600 font-medium uppercase">Listos</span>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 text-center">
                   <span className="block text-2xl font-bold text-gray-600">{orders.length}</span>
                   <span className="text-xs text-gray-500 font-medium uppercase">Total Hoy</span>
                </div>
             </div>
          </div>
          <div className="h-64 lg:h-auto">
             <StatsWidget orders={orders} />
          </div>
        </div>

        {/* Controls Bar */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-6 bg-white p-4 rounded-lg shadow-sm">
           <div className="relative w-full sm:w-96">
             <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
               <Search className="h-5 w-5 text-gray-400" />
             </div>
             <input
               type="text"
               className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
               placeholder="Buscar por cliente, ID o teléfono..."
               value={searchTerm}
               onChange={(e) => setSearchTerm(e.target.value)}
             />
           </div>
           
           <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
             <Filter className="h-5 w-5 text-gray-400 hidden sm:block" />
             <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as OrderStatus | 'all')}
                className="block w-full sm:w-auto pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm rounded-md"
             >
               <option value="all">Todos los estados</option>
               <option value={OrderStatus.PENDIENTE}>Pendientes</option>
               <option value={OrderStatus.EN_PREPARACION}>En Preparación</option>
               <option value={OrderStatus.LISTO}>Listos</option>
               <option value={OrderStatus.ENTREGADO}>Entregados</option>
               <option value={OrderStatus.CANCELADO}>Cancelados</option>
             </select>
           </div>
        </div>

        {/* Orders List */}
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          {loading && orders.length === 0 ? (
             <div className="p-12 text-center flex flex-col items-center justify-center text-gray-500">
               <RefreshCw className="h-8 w-8 animate-spin mb-2 text-orange-400" />
               <p>Conectando a Base de Datos...</p>
             </div>
          ) : filteredOrders.length > 0 ? (
            <ul className="divide-y divide-gray-200">
              {filteredOrders.map((order) => (
                <li key={order.id}>
                  <div 
                    className={`block hover:bg-gray-50 transition duration-150 ease-in-out cursor-pointer ${order.estado === OrderStatus.PENDIENTE ? 'bg-red-50/30' : ''}`}
                    onClick={() => setSelectedOrder(order)}
                  >
                    <div className="px-4 py-4 sm:px-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <p className="text-sm font-medium text-orange-600 truncate">
                            #{order.id}
                          </p>
                          <StatusBadge status={order.estado} />
                        </div>
                        <div className="ml-2 flex-shrink-0 flex">
                           <p className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                             {order.tipo_entrega === DeliveryType.DOMICILIO ? 'Moto' : order.tipo_entrega === DeliveryType.PARA_LLEVAR ? 'Para Llevar' : 'Local'}
                           </p>
                        </div>
                      </div>
                      <div className="mt-2 sm:flex sm:justify-between">
                        <div className="sm:flex sm:gap-6">
                          <p className="flex items-center text-sm text-gray-500 font-medium">
                            <UserIcon className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
                            {order.nombre_cliente}
                          </p>
                          <p className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                            <ClockIcon className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
                            {new Date(order.fecha_hora).toLocaleString('es-HN', {hour: '2-digit', minute:'2-digit', day:'numeric', month:'short'})}
                          </p>
                          <p className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                             <MoneyIcon className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
                             L. {Number(order.total).toFixed(2)}
                          </p>
                        </div>
                        <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                          <span className="text-orange-500 font-medium flex items-center">
                            Ver detalle <ChevronRight className="h-4 w-4 ml-1"/>
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-center py-12">
              <Store className="mx-auto h-12 w-12 text-gray-300" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No hay pedidos</h3>
              <p className="mt-1 text-sm text-gray-500">
                {orders.length > 0 ? 'No hay pedidos que coincidan con el filtro.' : 'La base de datos está vacía o no se han cargado pedidos.'}
              </p>
            </div>
          )}
        </div>
      </main>

      {/* Modal Detail */}
      {selectedOrder && (
        <OrderDetailModal 
          order={selectedOrder} 
          onClose={() => setSelectedOrder(null)} 
          onStatusChange={handleStatusChange}
        />
      )}
      
    </div>
  );
}

// Icons
function UserIcon(props: any) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  )
}

function ClockIcon(props: any) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}

function MoneyIcon(props: any) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}

export default App;
