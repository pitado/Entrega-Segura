// Valores do plano comercial do Pitou. Altere aqui para atualizar a página inteira.
export const pricing = {
  base: 299,
  includedCouriers: 5,
  extraCourier: 50,
  menu: 49.9,
  maxSimulatedCouriers: 50,
} as const;

export function estimateMonthly(couriers: number, menu: boolean): number {
  const extra = Math.max(0, couriers - pricing.includedCouriers) * pricing.extraCourier;
  return Math.round((pricing.base + extra + (menu ? pricing.menu : 0)) * 100) / 100;
}
