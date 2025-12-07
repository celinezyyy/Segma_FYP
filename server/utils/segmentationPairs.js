export const segmentationPairs = [
  {
    id: "rfm",
    label: "Classic RFM",
    tagline: "The timeless industry standard",
    features: ["recency", "frequency", "monetary"],
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
    features: ["totalSpend", "avgOrderValue", "totalOrders"],
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
    features: ["customerLifetimeMonths", "purchaseFrequency", "totalSpend"],
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
    features: ["recency", "daysSinceLastPurchase", "purchaseFrequency"],
    benefits: [
      "Detects potential churn risk",
      "Great for time-sensitive businesses"
    ],
    icon: "⏳"
  }
];
 export default segmentationPairs;