import React from 'react';
import { OrderStatus } from '../types';

interface StatusBadgeProps {
  status: OrderStatus;
  className?: string;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className = '' }) => {
  let colors = '';
  let label = '';

  switch (status) {
    case OrderStatus.PENDIENTE:
      colors = 'bg-red-100 text-red-800 border-red-200 animate-pulse';
      label = 'Pendiente';
      break;
    case OrderStatus.EN_PREPARACION:
      colors = 'bg-yellow-100 text-yellow-800 border-yellow-200';
      label = 'En Preparación';
      break;
    case OrderStatus.LISTO:
      colors = 'bg-green-100 text-green-800 border-green-200';
      label = 'Listo';
      break;
    case OrderStatus.ENTREGADO:
      colors = 'bg-gray-100 text-gray-600 border-gray-200';
      label = 'Entregado';
      break;
    case OrderStatus.CANCELADO:
      colors = 'bg-rose-50 text-rose-400 border-rose-100 line-through';
      label = 'Cancelado';
      break;
    default:
      colors = 'bg-gray-100 text-gray-800';
      label = status;
  }

  return (
    <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full border ${colors} ${className}`}>
      {label}
    </span>
  );
};

export default StatusBadge;