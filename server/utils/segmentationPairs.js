export const segmentationPairs = [
  {
    id: "rfm",
    label: "Classic RFM",
    tagline: "The timeless industry standard",
    metrics: ["Recency", "Frequency", "Monetary"],
    benefits: [
      "Most stable",
      "Highly validated academically",
      "Universal",
      "Retail + e-commerce standard",
      "Works well for 90% SMEs"
    ],
    bestFor: "Retail & e-commerce",
    icon: "🏆"
  },
  {
    id: "spending",
    label: "Spending Behavior",
    tagline: "Focus on how much they spend",
    metrics: ["totalSpend", "avgOrderValue", "totalOrders"],
    benefits: [
      "Identifies high spenders & bulk buyers",
      "Highlights low-value or price-sensitive customers"
    ],
    bestFor: "Lifestyle retail, F&B, beauty",
    icon: "🛍️"
  },
  {
    id: "lifetime",
    label: "Customer Lifetime + Behavior",
    tagline: "Loyalty & long-term value",
    metrics: ["customerLifetimeMonths", "purchaseFrequency", "totalSpend"],
    benefits: [
      "Shows long-term loyalty",
      "New vs returning high-value customers"
    ],
    bestFor: "Subscription / repeat-purchase businesses",
    icon: "❤️"
  },
  {
    id: "timebased",
    label: "Time-based Behavior",
    tagline: "Spot churn early",
    metrics: ["recency", "daysSinceLastPurchase", "purchaseFrequency"],
    benefits: [
      "Detects potential churn risk",
      "Great for time-sensitive businesses"
    ],
    bestFor: "Apps, services, F&B",
    icon: "⏳"
  }
];
 export default segmentationPairs;