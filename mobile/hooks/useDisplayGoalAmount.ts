import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { convertAmount, getExchangeRateSnapshot } from '../lib/currency';

export function useDisplayGoalAmount(rawGoalAmount: number) {
  const { currency, goalCurrency } = useAuth();
  const [displayGoalAmount, setDisplayGoalAmount] = useState(rawGoalAmount);

  useEffect(() => {
    let cancelled = false;

    if (!rawGoalAmount || goalCurrency === currency) {
      setDisplayGoalAmount(rawGoalAmount);
      return () => {
        cancelled = true;
      };
    }

    void getExchangeRateSnapshot()
      .then((snapshot) => {
        if (cancelled) return;
        setDisplayGoalAmount(convertAmount(rawGoalAmount, goalCurrency, currency, snapshot));
      })
      .catch(() => {
        if (cancelled) return;
        setDisplayGoalAmount(rawGoalAmount);
      });

    return () => {
      cancelled = true;
    };
  }, [currency, goalCurrency, rawGoalAmount]);

  return displayGoalAmount;
}