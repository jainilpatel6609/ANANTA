const mongoose = require('mongoose');

const grainPricingSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Grain name is required'],
      trim: true
    },
    priceSinglePatiya: {
      type: Number,
      min: [0, 'Price cannot be negative'],
      default: 2800
    },
    priceDoublePatiya: {
      type: Number,
      min: [0, 'Price cannot be negative'],
      default: 5400
    },
    pricePerTon: {
      type: Number,
      min: [0, 'Price per ton cannot be negative'],
      default: 800
    }
  },
  { _id: false }
);

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      enum: ['Sand', 'Aggregate', 'Grit'],
      default: 'Sand'
    },
    description: {
      type: String,
      default: ''
    },
    pricePerTon: {
      type: Number,
      required: [true, 'Price per ton is required'],
      min: [0, 'Price cannot be negative']
    },
    priceSinglePatiya: {
      type: Number,
      min: [0, 'Price cannot be negative']
    },
    priceDoublePatiya: {
      type: Number,
      min: [0, 'Price cannot be negative']
    },
    unit: {
      type: String,
      default: 'Tractor'
    },
    aggregateTypes: {
      type: [String],
      default: ['20mm', '10mm', '6mm', '(10 + 20 ) mm Mix', 'Wetmix', 'Refo Dust', 'Metal 40×63', 'Rubble']
    },
    dumperAggregateTypes: {
      type: [String],
      default: ['20mm', '10mm', '6mm', '(10 + 20 ) mm Mix', 'Wetmix', 'Refo Dust', 'Metal 40×63', 'Rubble']
    },
    tractorAggregateTypes: {
      type: [String],
      default: ['20mm', '10mm', '6mm', '(10 + 20 ) mm Mix', 'Wetmix', 'Refo Dust', 'Metal 40×63', 'Rubble']
    },
    tractorGrainPricing: {
      type: [grainPricingSchema],
      default: [
        { name: '20mm', priceSinglePatiya: 2800, priceDoublePatiya: 5400 },
        { name: '10mm', priceSinglePatiya: 2850, priceDoublePatiya: 5500 },
        { name: '6mm', priceSinglePatiya: 2750, priceDoublePatiya: 5300 },
        { name: '(10 + 20 ) mm Mix', priceSinglePatiya: 2900, priceDoublePatiya: 5600 },
        { name: 'Wetmix', priceSinglePatiya: 2700, priceDoublePatiya: 5200 },
        { name: 'Refo Dust', priceSinglePatiya: 2500, priceDoublePatiya: 4800 },
        { name: 'Metal 40×63', priceSinglePatiya: 2800, priceDoublePatiya: 5400 },
        { name: 'Rubble', priceSinglePatiya: 2600, priceDoublePatiya: 5000 }
      ]
    },
    dumperGrainPricing: {
      type: [grainPricingSchema],
      default: [
        { name: '20mm', pricePerTon: 800 },
        { name: '10mm', pricePerTon: 850 },
        { name: '6mm', pricePerTon: 750 },
        { name: '(10 + 20 ) mm Mix', pricePerTon: 900 },
        { name: 'Wetmix', pricePerTon: 700 },
        { name: 'Refo Dust', pricePerTon: 650 },
        { name: 'Metal 40×63', pricePerTon: 800 },
        { name: 'Rubble', pricePerTon: 700 }
      ]
    },
    sandLocations: {
      type: [String],
      default: ['Patan', 'Sabarmati', 'Vijapur', 'Siddhpur']
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

const Product = mongoose.model('Product', productSchema);
module.exports = Product;
