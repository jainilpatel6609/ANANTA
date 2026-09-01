const Product = require('../models/Product');
const { successResponse, errorResponse } = require('../utils/responseHelper');
const {
  defaultTractorPrices,
  resolveTractorPrices,
  ensureProductTractorPrices
} = require('../utils/tractorPricing');

// @desc    Get active products
// @route   GET /api/products
// @access  Public
const getActiveProducts = async (req, res) => {
  try {
    const products = await Product.find({ isActive: true }).sort({ category: 1, name: 1 });
    await Promise.all(products.map((p) => ensureProductTractorPrices(p)));
    return successResponse(res, 'Active products retrieved.', { products });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

// @desc    Get all products (Admin)
// @route   GET /api/admin/products
// @access  Private (Admin)
const getAllProductsAdmin = async (req, res) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 });
    await Promise.all(products.map((p) => ensureProductTractorPrices(p)));
    return successResponse(res, 'All products retrieved.', { products });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

// @desc    Get product by ID
// @route   GET /api/products/:id
// @access  Public
const getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return errorResponse(res, 'Product not found.', 404);
    }
    await ensureProductTractorPrices(product);
    return successResponse(res, 'Product retrieved.', { product });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

// @desc    Create product
// @route   POST /api/products
// @access  Private (Admin)
const createProduct = async (req, res) => {
  try {
    const {
      name,
      category,
      description,
      pricePerTon,
      priceSinglePatiya,
      priceDoublePatiya,
      aggregateTypes,
      dumperAggregateTypes,
      tractorAggregateTypes,
      tractorGrainPricing,
      dumperGrainPricing,
      sandLocations,
      isActive
    } = req.body;

    if (!name || !category) {
      return errorResponse(res, 'Name and category are required.', 400);
    }

    const draft = { category, pricePerTon, priceSinglePatiya, priceDoublePatiya };
    const tractorPrices = resolveTractorPrices(draft);
    const defaults = defaultTractorPrices(draft);
    const resolvedSingle = tractorPrices.priceSinglePatiya;
    const resolvedDouble = tractorPrices.priceDoublePatiya;
    const resolvedPerTon =
      pricePerTon !== undefined && pricePerTon !== null && pricePerTon !== ''
        ? Number(pricePerTon)
        : resolvedSingle || defaults.priceSinglePatiya;

    if (resolvedSingle === undefined || resolvedDouble === undefined) {
      return errorResponse(res, 'Single Patiya and Double Patiya prices are required.', 400);
    }

    const defaultGrains = ['20mm', '10mm', '6mm', '(10 + 20 ) mm Mix', 'Wetmix', 'Refo Dust', 'Metal 40×63', 'Rubble'];

    const product = await Product.create({
      name: name.trim(),
      category,
      description: description !== undefined ? String(description).trim() : '',
      pricePerTon: Number(resolvedPerTon),
      priceSinglePatiya: Number(resolvedSingle),
      priceDoublePatiya: Number(resolvedDouble),
      unit: 'Tractor',
      aggregateTypes: Array.isArray(aggregateTypes) ? aggregateTypes : defaultGrains,
      dumperAggregateTypes: Array.isArray(dumperAggregateTypes) ? dumperAggregateTypes : (Array.isArray(aggregateTypes) ? aggregateTypes : defaultGrains),
      tractorAggregateTypes: Array.isArray(tractorAggregateTypes) ? tractorAggregateTypes : (Array.isArray(aggregateTypes) ? aggregateTypes : defaultGrains),
      tractorGrainPricing: Array.isArray(tractorGrainPricing) ? tractorGrainPricing : undefined,
      dumperGrainPricing: Array.isArray(dumperGrainPricing) ? dumperGrainPricing : undefined,
      sandLocations: Array.isArray(sandLocations) ? sandLocations : ['Patan', 'Sabarmati', 'Vijapur', 'Siddhpur'],
      isActive: isActive !== undefined ? isActive : true
    });

    return successResponse(res, 'Product created successfully.', { product }, 201);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

// @desc    Update product & price per ton
// @route   PUT /api/products/:id
// @access  Private (Admin)
const updateProduct = async (req, res) => {
  try {
    const {
      name,
      category,
      description,
      pricePerTon,
      priceSinglePatiya,
      priceDoublePatiya,
      aggregateTypes,
      dumperAggregateTypes,
      tractorAggregateTypes,
      tractorGrainPricing,
      dumperGrainPricing,
      sandLocations,
      isActive
    } = req.body;

    const product = await Product.findById(req.params.id);
    if (!product) {
      return errorResponse(res, 'Product not found.', 404);
    }

    if (name !== undefined) product.name = name.trim();
    if (category !== undefined) product.category = category;
    if (description !== undefined) product.description = String(description).trim();
    if (priceSinglePatiya !== undefined && priceSinglePatiya !== null && priceSinglePatiya !== '') {
      product.priceSinglePatiya = Number(priceSinglePatiya);
    }
    if (priceDoublePatiya !== undefined && priceDoublePatiya !== null && priceDoublePatiya !== '') {
      product.priceDoublePatiya = Number(priceDoublePatiya);
    }
    if (pricePerTon !== undefined && pricePerTon !== null && pricePerTon !== '') {
      product.pricePerTon = Number(pricePerTon);
    }
    if (aggregateTypes !== undefined) product.aggregateTypes = aggregateTypes;
    if (dumperAggregateTypes !== undefined) product.dumperAggregateTypes = dumperAggregateTypes;
    if (tractorAggregateTypes !== undefined) product.tractorAggregateTypes = tractorAggregateTypes;
    if (tractorGrainPricing !== undefined) product.tractorGrainPricing = tractorGrainPricing;
    if (dumperGrainPricing !== undefined) product.dumperGrainPricing = dumperGrainPricing;
    if (sandLocations !== undefined) product.sandLocations = sandLocations;
    if (isActive !== undefined) product.isActive = isActive;

    await product.save();

    return successResponse(res, 'Product updated successfully.', { product });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

// @desc    Delete product
// @route   DELETE /api/products/:id
// @access  Private (Admin)
const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return errorResponse(res, 'Product not found.', 404);
    }

    // Soft delete or hard delete
    product.isActive = false;
    await product.save();

    return successResponse(res, 'Product deactivated successfully.');
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

module.exports = {
  getActiveProducts,
  getAllProductsAdmin,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct
};
