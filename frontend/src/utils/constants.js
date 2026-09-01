export const TRACTOR_TYPES = [
  {
    id: 'Single Patiya',
    name: 'Single Patiya',
    desc: 'Single patiya tractor load for standard site deliveries'
  },
  {
    id: 'Double Patiya',
    name: 'Double Patiya',
    desc: 'Double patiya tractor load for higher-volume site deliveries'
  }
];

export const SAND_LOCATIONS = [
  { id: 'Patan', name: 'Patan River Basin', description: 'Coarse grain river sand, superior bonding for concrete' },
  { id: 'Sabarmati', name: 'Sabarmati River Bed', description: 'Clean washed river sand, optimal for brickwork & plastering' },
  { id: 'Vijapur', name: 'Vijapur Sourcing Depot', description: 'Heavy structural sand, high compressive strength' },
  { id: 'Siddhpur', name: 'Siddhpur Quarry & Riverbank', description: 'Premium washed river sand, zero silt' }
];

export const AGGREGATE_TYPES = [
  { id: '20mm', name: '20mm (Down)', use: 'Standard RCC casting, slabs, beams, columns' },
  { id: '10mm', name: '10mm (Chips)', use: 'Concrete mix design, lintels, fine casting' },
  { id: '6mm', name: '6mm (Grit / Chana)', use: 'Waterproofing, curb stones, paver blocks' },
  { id: 'Refo Dust', name: 'Refo Stone Dust', use: 'Manufactured sand substitute, precast leveling' },
  { id: 'Metal 40×63', name: 'Metal 40×63 mm', use: 'Road base, subgrade macadam, rail ballast' },
  { id: 'Rubble', name: 'Heavy Rubble Stone', use: 'Retaining walls, foundation plinth, pitching' },
  { id: '25×40', name: '25×40 mm Aggregate', use: 'Heavy foundation rafts & industrial flooring' },
  { id: '63×100', name: '63×100 mm Boulders', use: 'Embankment protection & road sub-base' }
];

export const ORDER_STATUS_CONFIG = {
  PENDING_PAYMENT: {
    label: 'Pending Payment',
    color: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    step: 0
  },
  PAYMENT_FAILED: {
    label: 'Payment Failed',
    color: 'bg-red-500/10 text-red-400 border-red-500/20',
    step: 0
  },
  PLACED: {
    label: 'Order Confirmed',
    color: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    step: 1
  },
  DEALER_NOTIFIED: {
    label: 'Dealer Notified',
    color: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
    step: 1
  },
  ACCEPTED: {
    label: 'Dealer Accepted',
    color: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    step: 2
  },
  OUT_FOR_DELIVERY: {
    label: 'Out for Delivery',
    color: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    step: 3
  },
  DELIVERED: {
    label: 'Delivered & Verified',
    color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    step: 4
  },
  CANCELLED: {
    label: 'Cancelled',
    color: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
    step: -1
  }
};
