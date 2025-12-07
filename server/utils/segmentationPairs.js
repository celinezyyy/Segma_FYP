export const segmentationPairs = [
  {
    id: "rfm",
    label: "Classic RFM",
    tagline: "The timeless industry standard",
    features: [
      { key: "recency", label: "Recency", unit: "days since last purchase" },
      { key: "frequency", label: "Purchase Frequency", unit: "orders/month" },
      { key: "monetary", label: "Monetary Value", unit: "RM" }
    ],
    benefits: [
      "Most stable",
      "Highly validated academically",
      "Universal",
      "Retail + e-commerce standard",
      "Works well for 90% SMEs"
    ],
    icon: "🏆"
  },
  {
    id: "spending",
    label: "Spending Behavior",
    tagline: "Focus on how much they spend",
    features: [
      { key: "totalSpend", label: "Total Spend", unit: "MYR" },
      { key: "avgOrderValue", label: "Average Order Value", unit: "MYR" },
      { key: "totalOrders", label: "Total Orders", unit: "orders" }
    ],
    benefits: [
      "Identifies high spenders & bulk buyers",
      "Highlights low-value or price-sensitive customers"
    ],
    icon: "🛍️"
  },
  {
    id: "lifetime",
    label: "Customer Lifetime + Behavior",
    tagline: "Loyalty & long-term value",
    features: [
      { key: "customerLifetimeMonths", label: "Customer Lifetime", unit: "months" },
      { key: "purchaseFrequency", label: "Purchase Frequency", unit: "orders/month" },
      { key: "totalSpend", label: "Total Spend", unit: "MYR" }
    ],
    benefits: [
      "Shows long-term loyalty",
      "New vs returning high-value customers"
    ],
    icon: "❤️"
  },
  {
    id: "timebased",
    label: "Time-based Behavior",
    tagline: "Spot churn early",
    features: [
      { key: "recency", label: "Recency", unit: "days since last purchase" },
      { key: "daysSinceLastPurchase", label: "Days Since Last Purchase", unit: "days" },
      { key: "purchaseFrequency", label: "Purchase Frequency", unit: "orders/month" }
    ],
    benefits: [
      "Detects potential churn risk",
      "Great for time-sensitive businesses"
    ],
    icon: "⏳"
  }
];

export default segmentationPairs;
