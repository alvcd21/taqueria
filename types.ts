export enum OrderStatus {
  PENDIENTE = 'pendiente',
  EN_PREPARACION = 'en_preparacion',
  LISTO = 'listo',
  ENTREGADO = 'entregado',
  CANCELADO = 'cancelado'
}

export enum DeliveryType {
  LOCAL = 'local',
  PARA_LLEVAR = 'para_llevar',
  DOMICILIO = 'domicilio'
}

export interface MenuItem {
  id: number;
  categoria: string;
  nombre: string;
  descripcion: string;
  precio: number;
}

export interface PedidoItem {
  id: number;
  pedido_id: number;
  menu_item_id: number;
  nombre_producto: string; // Joined from menu_items
  categoria?: string;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
  nota_item?: string;
}

export interface Pedido {
  id: number;
  fecha_hora: string; // ISO string
  nombre_cliente: string;
  telefono_cliente: string;
  canal: string;
  tipo_entrega: DeliveryType;
  direccion_entrega?: string;
  estado: OrderStatus;
  nota_cliente?: string;
  total: number;
  items?: PedidoItem[];
}

export interface Empresa {
  id: number;
  nombre: string;
  correo: string;
  telefono: string;
  direccion: string;
  horario: string;
  disponible: boolean;
  motivo_no_dispon: string; // Ajustado a nombre de columna en BD
}