export function formatVND(amount: number): string {
  if (Math.abs(amount) >= 1_000_000_000) {
    return `${(amount / 1_000_000_000).toFixed(2)} tỷ`;
  }
  if (Math.abs(amount) >= 1_000_000) {
    return `${(amount / 1_000_000).toFixed(1)} triệu`;
  }
  if (Math.abs(amount) >= 1_000) {
    return `${(amount / 1_000).toFixed(0)}K`;
  }
  return `${amount.toFixed(0)} VND`;
}

export function formatVNDShort(amount: number): string {
  if (Math.abs(amount) >= 1_000_000_000) {
    return `${(amount / 1_000_000_000).toFixed(1)}B`;
  }
  if (Math.abs(amount) >= 1_000_000) {
    return `${(amount / 1_000_000).toFixed(1)}M`;
  }
  return `${amount.toFixed(0)}`;
}

export function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

export function formatMonths(months: number): string {
  if (months >= 9999) return 'Không đạt được';
  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;
  if (years > 0 && remainingMonths > 0) return `${years} năm ${remainingMonths} tháng`;
  if (years > 0) return `${years} năm`;
  return `${remainingMonths} tháng`;
}

export function getHealthColor(score: number): string {
  if (score >= 85) return 'text-green-600';
  if (score >= 70) return 'text-emerald-600';
  if (score >= 55) return 'text-blue-600';
  if (score >= 40) return 'text-yellow-600';
  return 'text-red-600';
}

export function getHealthBg(score: number): string {
  if (score >= 85) return 'bg-green-500';
  if (score >= 70) return 'bg-emerald-500';
  if (score >= 55) return 'bg-blue-500';
  if (score >= 40) return 'bg-yellow-500';
  return 'bg-red-500';
}

export function getInsightColor(type: string): string {
  switch (type) {
    case 'STRENGTH': return 'border-green-200 bg-green-50';
    case 'WARNING': return 'border-yellow-200 bg-yellow-50';
    case 'OPPORTUNITY': return 'border-blue-200 bg-blue-50';
    default: return 'border-gray-200 bg-gray-50';
  }
}

export function getInsightIcon(type: string): string {
  switch (type) {
    case 'STRENGTH': return '💪';
    case 'WARNING': return '⚠️';
    case 'OPPORTUNITY': return '💡';
    default: return '📊';
  }
}
