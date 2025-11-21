import { Pedido, Empresa, OrderStatus } from '../types';

// Detección automática de entorno (Local vs Producción)
const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

// En producción (Render), la API está en el mismo dominio, solo agregamos /api
// En local, forzamos el puerto 3001
const API_URL = isLocal ? 'http://localhost:3001/api' : '/api';

// Para WebSockets, si estamos en HTTPS usamos WSS, si no WS
const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
const host = isLocal ? 'localhost:3001' : window.location.host;
const WS_URL = `${protocol}//${host}`;

export const getEmpresaInfo = async (): Promise<Empresa> => {
  try {
    const response = await fetch(`${API_URL}/empresa`);
    if (!response.ok) throw new Error(`Error del servidor: ${response.statusText}`);
    return response.json();
  } catch (error) {
    console.error("API Error (Empresa):", error);
    throw new Error('CONNECTION_ERROR');
  }
};

export const updateEmpresaAvailability = async (disponible: boolean, motivo: string): Promise<Empresa> => {
  try {
    const response = await fetch(`${API_URL}/empresa/disponibilidad`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ disponible, motivo })
    });
    if (!response.ok) throw new Error('Failed to update availability');
    return response.json();
  } catch (error) {
    console.error("API Error (Update Availability):", error);
    throw error;
  }
};

export const getOrders = async (): Promise<Pedido[]> => {
  try {
    const response = await fetch(`${API_URL}/orders`);
    if (!response.ok) throw new Error(`Error del servidor: ${response.statusText}`);
    return response.json();
  } catch (error) {
    console.error("API Error (Orders):", error);
    throw new Error('CONNECTION_ERROR');
  }
};

export const updateOrderStatus = async (orderId: number, newStatus: OrderStatus): Promise<Pedido> => {
  try {
    const response = await fetch(`${API_URL}/orders/${orderId}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus })
    });
    if (!response.ok) throw new Error('Failed to update status');
    return response.json();
  } catch (error) {
    console.error("API Error (Update Status):", error);
    throw error;
  }
};

// --- WebSocket ---

type OrderCallback = (order: Pedido) => void;
type EmpresaCallback = (empresa: Empresa) => void;

export const subscribeToUpdates = (
  onNewOrder: OrderCallback, 
  onOrderUpdate: OrderCallback,
  onEmpresaUpdate: EmpresaCallback
) => {
  let ws: WebSocket;
  let retryTimeout: any;

  const connect = () => {
    try {
      ws = new WebSocket(WS_URL);
      
      ws.onopen = () => {
        console.log("WebSocket conectado a", WS_URL);
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          switch (message.type) {
            case 'NEW_ORDER':
              onNewOrder(message.data);
              break;
            case 'ORDER_UPDATE':
              onOrderUpdate(message.data);
              break;
            case 'EMPRESA_UPDATE':
              onEmpresaUpdate(message.data);
              break;
          }
        } catch (e) {
          console.error("Error procesando mensaje WS", e);
        }
      };

      ws.onclose = () => {
        console.log("WS desconectado, reintentando en 3s...");
        retryTimeout = setTimeout(connect, 3000);
      };
      
      ws.onerror = (err) => {
        console.error("WS Error:", err);
        ws.close();
      };
      
    } catch (e) {
      console.error("No se pudo crear WebSocket", e);
      retryTimeout = setTimeout(connect, 3000);
    }
  };

  connect();

  return () => {
    if (ws) ws.close();
    if (retryTimeout) clearTimeout(retryTimeout);
  };
};