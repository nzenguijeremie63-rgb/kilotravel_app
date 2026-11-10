export const FCFA_PER_EUR = 655.957;

export const fcfaToEur = (fcfa: number) => fcfa / FCFA_PER_EUR;

export const eurToFcfa = (eur: number) => eur * FCFA_PER_EUR;

const fcfaFormatter = new Intl.NumberFormat('fr-FR', {
  maximumFractionDigits: 0,
});

const eurFormatter = new Intl.NumberFormat('fr-FR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export const formatFCFA = (amount: number) =>
  `${fcfaFormatter.format(Math.round(amount))} FCFA`;

export const formatEUR = (amount: number) => `${eurFormatter.format(amount)} €`;
