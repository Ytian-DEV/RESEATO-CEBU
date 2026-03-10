export type Restaurant = {
  id: string;
  name: string;
  cuisine: string;
  location: string;
  rating: number;
  priceLevel: 1 | 2 | 3 | 4;
  description?: string;
  imageUrl?: string;
  contactPhone?: string | null;
  contactEmail?: string | null;
};
