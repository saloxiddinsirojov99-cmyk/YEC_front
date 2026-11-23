export type PriceRange = {
  label: string;
  min: number;
  max: number;
};

export const PRICE_RANGES: PriceRange[] = [
  { label: "1 – 100 000 so'm", min: 1, max: 100000 },
  { label: "100 000 – 150 000 so'm", min: 100000, max: 150000 },
  { label: "150 000 – 200 000 so'm", min: 150000, max: 200000 },
  { label: "200 000 – 250 000 so'm", min: 200000, max: 250000 },
  { label: "250 000 – 307 000 so'm", min: 250000, max: 307000 },
];
