// Recommended hybrid segmentation pairs
export const segmentationPairs = [
  { id: "recency_frequency", label: "Recency × Frequency", features: ["recency", "frequency"], description: "RFM-style: highlights recent active vs frequent buyers — good for churn and engagement segmentation." },
  { id: "agegroup_monetary", label: "Age Group × Total Spend", features: ["ageGroup", "totalSpend"], description: "Shows which age groups spend more — useful for age-targeted promotions and product-market fit." },
  { id: "gender_item", label: "Gender × Favorite Item", features: ["gender", "favoriteItem"], description: "Reveals product preferences by gender — helps merchandising and personalization." },
  { id: "aov_recency", label: "Average Order Value × Recency", features: ["avgOrderValue", "recency"], description: "Average Order Value vs Recency: finds customers who spend more recently vs those with low AOV." },
  { id: "spend_city", label: "Total Spend × City", features: ["totalSpend", "city"], description: "Total Spend vs City: identifies cities with higher spending customers." },
  { id: "spend_state", label: "Total Spend × State", features: ["totalSpend", "state"], description: "Total Spend vs State: identifies states with higher spending customers." },
];

export default segmentationPairs;