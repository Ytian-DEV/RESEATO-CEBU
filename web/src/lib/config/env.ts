export const env = {
  API_BASE_URL: process.env.REACT_APP_API_BASE_URL ?? "http://localhost:4000",
  RESTAURANT_IMAGE_BUCKET:
    process.env.REACT_APP_RESTAURANT_IMAGE_BUCKET ?? "restaurant-images",
} as const;
