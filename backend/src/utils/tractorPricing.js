const TRACTOR_TYPES = ['Single Patiya', 'Double Patiya'];

function defaultTractorPrices(product) {
  const pricePerTon = Number(product?.pricePerTon) || 0;
  switch (product?.category) {
    case 'Sand':
      return { priceSinglePatiya: 2350, priceDoublePatiya: 4500 };
    case 'Aggregate':
      return {
        priceSinglePatiya: 2800,
        priceDoublePatiya: product?.priceDoublePatiya ? Number(product.priceDoublePatiya) : (pricePerTon || 5400)
      };
    case 'Grit':
    default:
      return {
        priceSinglePatiya: product?.priceSinglePatiya ? Number(product.priceSinglePatiya) : (pricePerTon || 1100),
        priceDoublePatiya: product?.priceDoublePatiya ? Number(product.priceDoublePatiya) : (pricePerTon ? pricePerTon * 2 : 2100)
      };
  }
}

function resolveTractorPrices(product) {
  const defaults = defaultTractorPrices(product);
  const single = product?.priceSinglePatiya;
  const double = product?.priceDoublePatiya;
  return {
    priceSinglePatiya:
      single !== undefined && single !== null && single !== ''
        ? Number(single)
        : defaults.priceSinglePatiya,
    priceDoublePatiya:
      double !== undefined && double !== null && double !== ''
        ? Number(double)
        : defaults.priceDoublePatiya
  };
}

function getPricePerTractor(product, tractorType) {
  const prices = resolveTractorPrices(product);
  if (tractorType === 'Single Patiya') return prices.priceSinglePatiya;
  if (tractorType === 'Double Patiya') return prices.priceDoublePatiya;
  return null;
}

function getGrainSpecificTractorPrice(product, tractorType, grainName) {
  if (product?.tractorGrainPricing?.length && grainName) {
    const match = product.tractorGrainPricing.find(
      (g) => g.name && g.name.toLowerCase().trim() === grainName.toLowerCase().trim()
    );
    if (match) {
      if (tractorType === 'Single Patiya' && match.priceSinglePatiya !== undefined && match.priceSinglePatiya !== null) {
        return Number(match.priceSinglePatiya);
      }
      if (tractorType === 'Double Patiya' && match.priceDoublePatiya !== undefined && match.priceDoublePatiya !== null) {
        return Number(match.priceDoublePatiya);
      }
    }
  }
  return getPricePerTractor(product, tractorType);
}

async function ensureProductTractorPrices(product) {
  if (!product) return product;
  const prices = resolveTractorPrices(product);
  let dirty = false;
  if (product.priceSinglePatiya === undefined || product.priceSinglePatiya === null) {
    product.priceSinglePatiya = prices.priceSinglePatiya;
    dirty = true;
  }
  if (product.priceDoublePatiya === undefined || product.priceDoublePatiya === null) {
    product.priceDoublePatiya = prices.priceDoublePatiya;
    dirty = true;
  }
  if (dirty) {
    await product.save();
  }
  return product;
}

module.exports = {
  TRACTOR_TYPES,
  defaultTractorPrices,
  resolveTractorPrices,
  getPricePerTractor,
  getGrainSpecificTractorPrice,
  ensureProductTractorPrices
};
