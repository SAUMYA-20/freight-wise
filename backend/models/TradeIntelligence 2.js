const mongoose = require('mongoose');

const countryTaxSchema = new mongoose.Schema({
  hsnCode: { type: String, required: true }, // 4 or 8 digit
  destinationCountry: { type: String, required: true },
  importDuty: { type: Number, required: true }, // percentage
  vatGst: { type: Number, required: true }, // percentage
});

const documentRuleSchema = new mongoose.Schema({
  hsnCode: { type: String, required: true },
  destinationCountry: { type: String, required: true },
  requiredDocuments: [{ type: String }],
});

const complianceRuleSchema = new mongoose.Schema({
  hsnCode: { type: String, required: true },
  destinationCountry: { type: String, required: true },
  isDangerousGood: { type: Boolean, default: false },
  restrictions: [{ type: String }],
  dgWarnings: [{ type: String }],
});

const fuelRateSchema = new mongoose.Schema({
  date: { type: Date, required: true, unique: true },
  fuelIndex: { type: Number, required: true }, // e.g. 1.05 for 5% surcharge
  exchangeRates: { type: Map, of: Number },     // e.g. {"USD": 1, "EUR": 0.92, "INR": 83}
  meta: {
    barrelPriceUSD:       Number,   // Actual Brent crude price fetched
    baselineBarrelPrice:  Number,   // The $80 baseline used for index calculation
    source:               String,   // 'RapidAPI (Brent Crude)' or 'Estimated'
    fetchedAt:            Date,
  }
});

const CountryTax = mongoose.model('CountryTax', countryTaxSchema);
const DocumentRule = mongoose.model('DocumentRule', documentRuleSchema);
const ComplianceRule = mongoose.model('ComplianceRule', complianceRuleSchema);
const FuelRate = mongoose.model('FuelRate', fuelRateSchema);

module.exports = {
  CountryTax,
  DocumentRule,
  ComplianceRule,
  FuelRate
};
