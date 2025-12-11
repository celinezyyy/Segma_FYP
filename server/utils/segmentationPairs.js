export const segmentationPairs = [
  {
    id: "rfm",
    label: "Classic RFM",
    tagline: "The timeless industry standard",
    features: [
      { key: "recency", label: "Recency", unit: "days since last purchase" },
      { key: "frequency", label: "Purchase Frequency", unit: "orders/month" },
      { key: "monetary", label: "Monetary Value", unit: "MYR" }
    ],
    benefits: [
      "Find VIPs, frequent buyers, and churn-risk customers",
      "Widely used and proven in retail & e-commerce",
      "Clear and reliable for most SMEs"
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
      "Identify high-spending vs low-spending customers",
      "Understand price-sensitive or bulk-buyer groups",
      "Useful for pricing, upselling, and product strategy"
    ],
    icon: "🛍️"
  },
  {
    id: "lifetime",
    label: "Customer Lifetime + Behavior",
    tagline: "Loyalty & long-teMYR value",
    features: [
      { key: "customerLifetimeMonths", label: "Customer Lifetime", unit: "months" },
      { key: "purchaseFrequency", label: "Purchase Frequency", unit: "orders/month" },
      { key: "totalSpend", label: "Total Spend", unit: "MYR" }
    ],
    benefits: [
      "See who stays with your brand the longest",
      "Separate new customers from loyal high-value ones",
      "Useful for retention and membership programs"
    ],
    icon: "❤️"
  },
  {
    id: "timebased",
    label: "Time-based Behavior",
    tagline: "Spot churn early",
    features: [
      { key: "recency", label: "Recency", unit: "days since last purchase" },
      { key: "favoritePurchaseHour", label: "Favorite Purchase Hour", unit: "hour of day" },
      { key: "purchaseFrequency", label: "Purchase Frequency", unit: "orders/month" }
    ],
    benefits: [
      "Detect early churn through timing patterns",
      "Learn customers’ preferred buying hours",
      "Useful for scheduling promotions at the right time"
    ],
    icon: "⏳"
  }
];

export default segmentationPairs;
