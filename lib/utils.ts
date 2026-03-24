export function getBMICategoryColor(category: string | null): string {
  switch (category) {
    case 'Underweight': return '#2196F3';
    case 'Normal': return '#4CAF50';
    case 'Overweight': return '#FF9800';
    case 'Obese': return '#FF3B3B';
    default: return '#666666';
  }
}

export function getStatusColor(status: string): string {
  switch (status) {
    case 'paid': return '#4CAF50';
    case 'pending': return '#FF9800';
    case 'overdue': return '#FF3B3B';
    case 'waived': return '#2196F3';
    case 'present': return '#4CAF50';
    case 'late': return '#FF9800';
    case 'absent': return '#FF3B3B';
    default: return '#666666';
  }
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function formatMonth(monthStr: string): string {
  const [year, month] = monthStr.split('-');
  return `${MONTHS[parseInt(month) - 1]} ${year}`;
}

export function getCurrentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
