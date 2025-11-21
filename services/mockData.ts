import { OrderStatus, DeliveryType, Pedido, Empresa } from '../types';

export const MOCK_EMPRESA: Empresa = {
  id: 1,
  nombre: "Taquería Don Juan",
  correo: "contacto@taqueriadonjuan.mx",
  telefono: "+52 55 1234 5678",
  direccion: "Av. Revolución 123, CDMX",
  horario: "Lun-Dom 12:00 PM - 11:00 PM",
  disponible: true,
  motivo_no_dispon: "Mantenimiento de cocina"
};

export const MOCK_PEDIDOS: Pedido[] = [
  {
    id: 1024,
    fecha_hora: new Date(Date.now() - 1000 * 60 * 5).toISOString(), // 5 mins ago
    nombre_cliente: "Carlos Pérez",
    telefono_cliente: "555-111-2222",
    canal: "voz",
    tipo_entrega: DeliveryType.PARA_LLEVAR,
    estado: OrderStatus.PENDIENTE,
    total: 250.00,
    nota_cliente: "Sin cebolla en los de pastor",
    items: [
      { id: 1, pedido_id: 1024, menu_item_id: 10, nombre_producto: "Taco Pastor", categoria: "Tacos", cantidad: 5, precio_unitario: 20, subtotal: 100 },
      { id: 2, pedido_id: 1024, menu_item_id: 12, nombre_producto: "Gringa Pastor", categoria: "Especialidades", cantidad: 2, precio_unitario: 75, subtotal: 150 }
    ]
  },
  {
    id: 1023,
    fecha_hora: new Date(Date.now() - 1000 * 60 * 15).toISOString(), // 15 mins ago
    nombre_cliente: "Ana López",
    telefono_cliente: "555-333-4444",
    canal: "voz",
    tipo_entrega: DeliveryType.DOMICILIO,
    direccion_entrega: "Calle 10 #45, Col. Centro",
    estado: OrderStatus.EN_PREPARACION,
    total: 420.50,
    items: [
      { id: 3, pedido_id: 1023, menu_item_id: 5, nombre_producto: "Orden Bistec", categoria: "Platillos", cantidad: 2, precio_unitario: 120, subtotal: 240 },
      { id: 4, pedido_id: 1023, menu_item_id: 2, nombre_producto: "Refresco 600ml", categoria: "Bebidas", cantidad: 3, precio_unitario: 30, subtotal: 90 },
      { id: 5, pedido_id: 1023, menu_item_id: 20, nombre_producto: "Guacamole", categoria: "Extras", cantidad: 1, precio_unitario: 90.50, subtotal: 90.50 }
    ]
  },
  {
    id: 1022,
    fecha_hora: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    nombre_cliente: "Juanito Banana",
    telefono_cliente: "555-999-8888",
    canal: "whatsapp",
    tipo_entrega: DeliveryType.LOCAL,
    estado: OrderStatus.LISTO,
    total: 150.00,
    items: [
      { id: 6, pedido_id: 1022, menu_item_id: 10, nombre_producto: "Taco Pastor", categoria: "Tacos", cantidad: 3, precio_unitario: 20, subtotal: 60 },
      { id: 7, pedido_id: 1022, menu_item_id: 11, nombre_producto: "Taco Suadero", categoria: "Tacos", cantidad: 3, precio_unitario: 20, subtotal: 60 },
      { id: 8, pedido_id: 1022, menu_item_id: 2, nombre_producto: "Refresco", categoria: "Bebidas", cantidad: 1, precio_unitario: 30, subtotal: 30 }
    ]
  },
  {
    id: 1021,
    fecha_hora: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    nombre_cliente: "Maria S.",
    telefono_cliente: "555-000-1111",
    canal: "voz",
    tipo_entrega: DeliveryType.DOMICILIO,
    direccion_entrega: "Av. Siempre Viva 742",
    estado: OrderStatus.ENTREGADO,
    total: 850.00,
    items: []
  }
];