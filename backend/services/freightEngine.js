const { FuelRate } = require('../models/TradeIntelligence');

/**
 * Calculates estimated freight cost.
 * Formula: Base Freight + (Weight Multiplier * Distance Multiplier) + Fuel Adjustment + Handling Charges
 */
async function calculateFreightCost({ origin, destination, weightKg }) {
  // 1. Fetch current fuel index
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  let fuelData = await FuelRate.findOne({ date: today });
  let fuelIndex = fuelData ? fuelData.fuelIndex : 1.05; // fallback

  // 2. Base Matrix (Mock data for now)
  const baseFreight = 150; // USD
  const handlingCharges = 50; // USD
  
  // Distance multiplier mock based on destination length/region
  let distanceMultiplier = 1.0;
  if (['India', 'UAE'].includes(destination)) distanceMultiplier = 1.2;
  if (['Germany', 'France', 'Italy', 'Netherlands', 'Spain'].includes(destination)) distanceMultiplier = 2.5;

  // Weight multiplier
  // e.g. $5 per kg
  const weightMultiplier = 5 * weightKg;

  // 3. Formula
  const baseCost = baseFreight + (weightMultiplier * distanceMultiplier);
  const fuelAdjustment = baseCost * (fuelIndex - 1.0); // Only the surcharge part
  const estimatedFreight = baseCost + fuelAdjustment + handlingCharges;

  return {
    estimatedFreightUSD: parseFloat(estimatedFreight.toFixed(2)),
    breakdown: {
      baseFreight,
      weightCost: parseFloat((weightMultiplier * distanceMultiplier).toFixed(2)),
      fuelAdjustment: parseFloat(fuelAdjustment.toFixed(2)),
      handlingCharges,
      fuelIndexUsed: parseFloat(fuelIndex.toFixed(4))
    }
  };
}

module.exports = {
  calculateFreightCost
};
