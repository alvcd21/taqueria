import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Pedido, OrderStatus } from '../types';

interface Props {
  orders: Pedido[];
}

const COLORS = {
  [OrderStatus.PENDIENTE]: '#ef4444', // red-500
  [OrderStatus.EN_PREPARACION]: '#eab308', // yellow-500
  [OrderStatus.LISTO]: '#22c55e', // green-500
  [OrderStatus.ENTREGADO]: '#9ca3af', // gray-400
  [OrderStatus.CANCELADO]: '#f43f5e', // rose-500
};

const StatsWidget: React.FC<Props> = ({ orders }) => {
  // Calculate distribution
  const data = Object.values(OrderStatus).map(status => {
    return {
      name: status.replace('_', ' '),
      value: orders.filter(o => o.estado === status).length,
      key: status
    };
  }).filter(d => d.value > 0);

  return (
    <div className="bg-white rounded-lg shadow p-4 h-full flex flex-col">
      <h3 className="text-sm font-medium text-gray-500 uppercase mb-4">Resumen de Actividad</h3>
      <div className="flex-1 min-h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={80}
              paddingAngle={5}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[entry.key as OrderStatus]} />
              ))}
            </Pie>
            <Tooltip formatter={(value: number) => [value, 'Pedidos']} />
            <Legend verticalAlign="bottom" height={36}/>
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default StatsWidget;