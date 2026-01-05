export const segmentationPairs = [
  {
    id: "rfm",
    label: "Classic RFM",
    tagline: "Understand loyalty and value at a glance",
    overview: "RFM groups customers by how recently and how often they buy, and how much they spend. It’s a simple, reliable way to spot loyal fans, VIPs, and customers at risk of churning.",
    features: [
      { key: "Recency", label: "Recency", unit: "days since last purchase" },
      { key: "Frequency", label: "Purchase Frequency", unit: "orders/month" },
      { key: "Monetary", label: "Total Spend", unit: "MYR" }
    ],
    benefits: [
      "Detect early churn through timing patterns",
      "Learn customers’ preferred buying hours",
      "Useful for scheduling promotions at the right time"
    ],
    icon: "🏆"
  },
  {
    id: "spending",
    label: "Spending Behavior",
    tagline: "Focus on how much they spend",
    features: [
      { key: "Monetary", label: "Total Spend", unit: "MYR" },
      { key: "AvgOrderValue", label: "Average Order Value", unit: "MYR" },
      { key: "TotalOrders", label: "Total Orders", unit: "orders" }
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
    tagline: "Loyalty & long-term value",
    features: [
      { key: "CustomerLifetimeMonths", label: "Customer Lifetime", unit: "months" },
      { key: "Frequency", label: "Purchase Frequency", unit: "orders/month" },
      { key: "Monetary", label: "Total Spend", unit: "MYR" }
    ],
    benefits: [
      "See who stays with your brand the longest",
      "Separate new customers from loyal high-value ones",
      "Useful for retention and membership programs"
    ],
    icon: "❤️"
  },
];

export default segmentationPairs;
