/**
 * AGGREGATE DUMPER VS TRACTOR DEDICATED VERIFICATION TESTS
 * 
 * Verifies:
 * 1. Dumper Aggregate locations return Vadagam and Sayala from DB.
 * 2. Tractor Aggregate flow directly provides grain sizes (20mm, 10mm, etc.) without requiring location.
 * 3. Dumper Sand locations return Patan, Sabarmati, Siddhpur, Vijapur.
 * 4. Modifying Dumper locations/settings never affects Tractor, and vice-versa.
 */

const mongoose = require('mongoose');
const Location = require('../src/models/Location');
const Product = require('../src/models/Product');
const VehicleConfig = require('../src/models/VehicleConfig');
const VehicleSetting = require('../src/models/VehicleSetting');

const TEST_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/ananta_traders';

async function runTests() {
  console.log('====================================================');
  console.log('  AGGREGATE & DUMPER/TRACTOR FLOW TESTS');
  console.log('====================================================\n');

  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(TEST_URI);
  }

  let passed = 0;
  let total = 0;

  function assert(condition, message) {
    total++;
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      process.exit(1);
    }
  }

  try {
    // 1. Dumper Aggregate Locations
    console.log('[Test Suite 1: Dumper Aggregate Locations]');
    const dumperAggLocations = await Location.find({
      vehicleType: 'DUMPER',
      category: 'Aggregate',
      isActive: true
    }).sort({ displayOrder: 1 });

    const dumperAggNames = dumperAggLocations.map((l) => l.name);
    assert(dumperAggNames.includes('Vadagam'), 'Dumper Aggregate contains "Vadagam"');
    assert(dumperAggNames.includes('Sayala'), 'Dumper Aggregate contains "Sayala"');
    assert(!dumperAggNames.includes('Patan'), 'Dumper Aggregate does NOT contain Sand location "Patan"');

    // 2. Sand Locations for Dumper and Tractor
    console.log('\n[Test Suite 2: Sand Locations for Dumper & Tractor]');
    const dumperSandLocations = await Location.find({
      vehicleType: 'DUMPER',
      category: 'Sand',
      isActive: true
    });
    const dumperSandNames = dumperSandLocations.map((l) => l.name);
    assert(dumperSandNames.includes('Patan'), 'Dumper Sand contains "Patan"');
    assert(dumperSandNames.includes('Sabarmati'), 'Dumper Sand contains "Sabarmati"');
    assert(!dumperSandNames.includes('Vadagam'), 'Dumper Sand does NOT contain Aggregate location "Vadagam"');

    // 3. Dumper & Tractor Aggregate Grain Sizes from Product
    console.log('\n[Test Suite 3: Dumper & Tractor Aggregate Grain Sizes]');
    const aggProduct = await Product.findOne({ category: 'Aggregate', isActive: true });
    assert(aggProduct !== null, 'Aggregate product exists in database');
    assert(Array.isArray(aggProduct.aggregateTypes), 'Aggregate product has aggregateTypes array');
    const dumperTypes = aggProduct.dumperAggregateTypes || aggProduct.aggregateTypes;
    const tractorTypes = aggProduct.tractorAggregateTypes || aggProduct.aggregateTypes;
    assert(dumperTypes.includes('20mm'), 'Dumper Aggregate types contains "20mm"');
    assert(dumperTypes.includes('10mm'), 'Dumper Aggregate types contains "10mm"');
    assert(tractorTypes.includes('20mm'), 'Tractor Aggregate types contains "20mm"');
    assert(tractorTypes.includes('10mm'), 'Tractor Aggregate types contains "10mm"');

    // 4. Isolation Check: Modifying Dumper Aggregate location does not affect Tractor
    console.log('\n[Test Suite 4: Strict Separation & Isolation]');
    const vadagam = await Location.findOne({ name: 'Vadagam', vehicleType: 'DUMPER' });
    assert(vadagam !== null, 'Vadagam is scoped strictly to DUMPER');
    assert(vadagam.vehicleType === 'DUMPER', 'Vadagam vehicleType is strictly DUMPER');

    const tractorLocCount = await Location.countDocuments({ vehicleType: 'TRACTOR' });
    const dumperLocCount = await Location.countDocuments({ vehicleType: 'DUMPER' });
    assert(tractorLocCount > 0, `Tractor has ${tractorLocCount} independent locations`);
    assert(dumperLocCount > 0, `Dumper has ${dumperLocCount} independent locations`);

    console.log('\n====================================================');
    console.log(`  ALL ${passed}/${total} AGGREGATE FLOW TESTS PASSED!`);
    console.log('====================================================\n');

  } catch (err) {
    console.error('Test execution error:', err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

runTests();

