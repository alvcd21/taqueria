import React from 'react';
import { Pedido, OrderStatus, DeliveryType } from '../types';
import StatusBadge from './StatusBadge';
import { X, Phone, MapPin, User, Clock, DollarSign, ShoppingBag } from 'lucide-react';

interface Props {
  order: Pedido | null;
  onClose: () => void;
  onStatusChange: (id: number, status: OrderStatus) => void;
}

const OrderDetailModal: React.FC<Props> = ({ order, onClose, onStatusChange }) => {
  if (!order) return null;

  // Helper to format currency to Lempiras
  const formatMoney = (amount: number) => `L. ${Number(amount).toFixed(2)}`;

  // Helper to format date
  const formatDate = (isoString: string) => {
    return new Date(isoString).toLocaleString('es-HN', {
      day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
    });
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" 
        onClick={onClose}
      ></div>

      <div className="flex min-h-screen items-center justify-center p-4 text-center sm:p-0">
        <div className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-2xl">
          
          {/* Header */}
          <div className="bg-gray-50 px-4 py-4 sm:px-6 flex justify-between items-center border-b border-gray-200">
            <div>
              <h3 className="text-lg font-semibold leading-6 text-gray-900" id="modal-title">
                Pedido #{order.id}
              </h3>
              <p className="text-sm text-gray-500 mt-1">{formatDate(order.fecha_hora)} • Canal: {order.canal}</p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-500 focus:outline-none">
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Content */}
          <div className="px-4 py-5 sm:p-6">
            
            {/* Status Controls */}
            <div className="mb-6 bg-blue-50 p-4 rounded-md border border-blue-100">
              <label className="block text-sm font-medium text-blue-900 mb-2">Gestionar Estado del Pedido</label>
              <div className="flex flex-wrap gap-2">
                {Object.values(OrderStatus).map((status) => (
                  <button
                    key={status}
                    onClick={() => onStatusChange(order.id, status)}
                    className={`px-3 py-1.5 rounded text-xs font-medium uppercase tracking-wide transition-colors 
                      ${order.estado === status 
                        ? 'bg-blue-600 text-white shadow-sm' 
                        : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'
                      }`}
                  >
                    {status.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Customer Info */}
              <div>
                <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-3">Datos del Cliente</h4>
                <div className="space-y-3">
                  <div className="flex items-start">
                    <User className="h-5 w-5 text-gray-400 mr-2 mt-0.5" />
                    <div>
                      <span className="block text-sm font-medium text-gray-900">{order.nombre_cliente}</span>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <Phone className="h-5 w-5 text-gray-400 mr-2 mt-0.5" />
                    <a href={`tel:${order.telefono_cliente}`} className="block text-sm text-blue-600 hover:underline">
                      {order.telefono_cliente}
                    </a>
                  </div>
                  <div className="flex items-start">
                    <MapPin className="h-5 w-5 text-gray-400 mr-2 mt-0.5" />
                    <div>
                      <span className="block text-sm font-medium text-gray-900">
                        {order.tipo_entrega === DeliveryType.DOMICILIO ? 'A Domicilio' : 
                         order.tipo_entrega === DeliveryType.PARA_LLEVAR ? 'Para Llevar' : 'Consumo Local'}
                      </span>
                      {order.direccion_entrega && (
                        <span className="block text-sm text-gray-500 mt-1">{order.direccion_entrega}</span>
                      )}
                    </div>
                  </div>
                </div>
                
                {order.nota_cliente && (
                  <div className="mt-4 p-3 bg-yellow-50 rounded-md border border-yellow-100">
                    <span className="block text-xs font-bold text-yellow-800 uppercase mb-1">Nota del Cliente:</span>
                    <p className="text-sm text-yellow-900 italic">"{order.nota_cliente}"</p>
                  </div>
                )}
              </div>

              {/* Order Summary */}
              <div>
                <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-3">Detalle de Productos</h4>
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 max-h-64 overflow-y-auto">
                  {order.items && order.items.length > 0 ? (
                    <ul className="divide-y divide-gray-200">
                      {order.items.map((item) => (
                        <li key={item.id} className="py-3 first:pt-0 last:pb-0">
                          <div className="flex justify-between">
                            <div>
                              <span className="font-medium text-gray-900">{item.cantidad}x {item.nombre_producto}</span>
                              <p className="text-xs text-gray-500">{item.categoria}</p>
                              {item.nota_item && <p className="text-xs text-gray-500 italic mt-1">Nota: {item.nota_item}</p>}
                            </div>
                              {/* Asegurar que precio es numérico antes de formatear */}
                            <span className="text-sm font-medium text-gray-900">{formatMoney(Number(item.subtotal))}</span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-gray-500 italic text-center py-4">Sin productos registrados</p>
                  )}
                </div>
                
                <div className="mt-4 flex justify-between items-center pt-4 border-t border-gray-200">
                  <span className="text-base font-bold text-gray-900">Total</span>
                  <span className="text-xl font-bold text-green-600">{formatMoney(order.total)}</span>
                </div>
              </div>

            </div>
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
            <button
              type="button"
              className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto"
              onClick={onClose}
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderDetailModal;