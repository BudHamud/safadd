export type Transaction = {
    id: string;
    desc: string;
    amount: number;
    tag: string;
    type: string;
    date: string;
    icon: string;
    details?: string;
    amountUSD?: number;
    amountARS?: number;
    amountILS?: number;
    amountEUR?: number;
    excludeFromBudget?: boolean;
    goalType?: 'unico' | 'mensual' | 'periodo' | 'meta';
    isCancelled?: boolean;
    periodicity?: number; // Months for 'periodo'
    paymentMethod?: string;
    cardDigits?: string;
};

export type Category = {
    id: string;
    label: string;
    icon: string;
};
