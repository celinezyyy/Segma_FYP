// Recommended hybrid segmentation pairs
export const segmentationPairs = [
  { id: "recency_frequency", label: "Recency × Frequency", features: ["recency", "frequency"] },
  { id: "monetary_frequency", label: "Monetary × Frequency", features: ["monetary", "frequency"] },
  { id: "state_spend", label: "State × Total Spend", features: ["state", "totalSpend"] },
  { id: "city_orders", label: "City × Total Orders", features: ["city", "totalOrders"] },
  { id: "aov_recency", label: "Average Order Value × Recency", features: ["avgOrderValue", "recency"] },
  { id: "lifetime_spend", label: "Customer Lifetime Months × Total Spend", features: ["customerLifetimeMonths", "totalSpend"] },
  { id: "payment_spend", label: "Favorite Payment Method × Total Spend", features: ["favoritePaymentMethod", "totalSpend"] },
  { id: "item_frequency", label: "Favorite Item × Frequency", features: ["favoriteItem", "frequency"] },
  { id: "purchasehour_recency", label: "Favorite Purchase Hour × Recency", features: ["favoritePurchaseHour", "recency"] },
  { id: "daypart_frequency", label: "Favorite Day Part × Frequency", features: ["favoriteDayPart", "frequency"] }
];
