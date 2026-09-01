const mongoose = require('mongoose');
const { MONGODB_URI } = require('../config/env');
const User = require('../models/User');
const Product = require('../models/Product');
const Location = require('../models/Location');
const VehicleConfig = require('../models/VehicleConfig');
const VehicleSetting = require('../models/VehicleSetting');
const Order = require('../models/Order');
const Notification = require('../models/Notification');
const Counter = require('../models/Counter');
const OtpService = require('../services/otpService');

const seedData = async () => {
  try {
    console.log(`Connecting to database for seeding: ${MONGODB_URI}`);
    await mongoose.connect(MONGODB_URI);

    console.log('Clearing existing collections...');
    await User.deleteMany({});
    await Product.deleteMany({});
    await Location.deleteMany({});
    await Location.collection.dropIndexes().catch(() => {});
    await Location.syncIndexes().catch(() => {});
    await VehicleConfig.deleteMany({});
    await VehicleSetting.deleteMany({});
    await Order.deleteMany({});
    await Notification.deleteMany({});
    await Counter.deleteMany({});

    console.log('Creating Admin accounts...');
    const adminPasswordHash = await User.hashPassword('Admin@12345');
    await User.create([
      {
        name: 'ANANTA Administrator',
        mobile: '9876543210',
        whatsappNumber: '9876543210',
        email: 'admin@anantatraders.com',
        companyName: 'ANANTA TRADERS HQ',
        officeAddress: 'Highway Commercial Hub, Mehsana - Ahmedabad Highway',
        role: 'ADMIN',
        isActive: true,
        passwordHash: adminPasswordHash
      },
      {
        name: 'ANANTA Executive Super Admin',
        mobile: '9327807331',
        whatsappNumber: '9327807331',
        email: 'superadmin@anantatraders.com',
        companyName: 'ANANTA TRADERS HQ',
        officeAddress: 'Highway Commercial Hub, Mehsana - Ahmedabad Highway',
        role: 'ADMIN',
        isActive: true,
        passwordHash: adminPasswordHash
      }
    ]);

    console.log('Creating sample Dealers with PIN codes and Geolocation...');
    const dealerPasswordHash = await User.hashPassword('Dealer@12345');
    const dealers = await User.create([
      {
        name: 'Mehsana Regional Supply Hub',
        companyName: 'Mehsana Quarry & Sand Logistics',
        mobile: '9898000004',
        whatsappNumber: '9898000004',
        email: 'mehsana.dealer@anantatraders.com',
        addressLine1: 'Plot 12, GIDC Industrial Estate',
        addressLine2: 'Near Modhera Cross Road',
        area: 'Highway Logistics Zone',
        city: 'Mehsana',
        state: 'Gujarat',
        pincode: '384001',
        latitude: 23.59796,
        longitude: 72.36932,
        officeAddress: 'Plot 12, GIDC Industrial Estate, Near Modhera Cross Road, Highway Logistics Zone, Mehsana, Gujarat - 384001',
        role: 'DEALER',
        isActive: true,
        passwordHash: dealerPasswordHash
      },
      {
        name: 'Siddhpur Stone & Sand Logistics',
        companyName: 'Siddhpur Supply Co',
        mobile: '9898000001',
        whatsappNumber: '9898000001',
        email: 'siddhpur.dealer@anantatraders.com',
        addressLine1: 'Station Road Depot',
        addressLine2: 'Opposite Railway Freight Yard',
        area: 'Station Area',
        city: 'Siddhpur',
        state: 'Gujarat',
        pincode: '384151',
        latitude: 23.91672,
        longitude: 72.38334,
        officeAddress: 'Station Road Depot, Opposite Railway Freight Yard, Station Area, Siddhpur, Gujarat - 384151',
        role: 'DEALER',
        isActive: true,
        passwordHash: dealerPasswordHash
      },
      {
        name: 'Sabarmati Minerals & Aggregates',
        companyName: 'Sabarmati Fleet Logistics',
        mobile: '9898000002',
        whatsappNumber: '9898000002',
        email: 'sabarmati.dealer@anantatraders.com',
        addressLine1: 'Riverfront Cargo Bay 4',
        addressLine2: 'Sector 10 Transport Nagar',
        area: 'Infocity Zone',
        city: 'Gandhinagar',
        state: 'Gujarat',
        pincode: '382010',
        latitude: 23.21563,
        longitude: 72.63694,
        officeAddress: 'Riverfront Cargo Bay 4, Sector 10 Transport Nagar, Infocity Zone, Gandhinagar, Gujarat - 382010',
        role: 'DEALER',
        isActive: true,
        passwordHash: dealerPasswordHash
      },
      {
        name: 'Patan Sand Transport Hub',
        companyName: 'Patan Express Materials',
        mobile: '9898000003',
        whatsappNumber: '9898000003',
        email: 'patan.dealer@anantatraders.com',
        addressLine1: 'Chansma Highway Bypass',
        addressLine2: 'Saraswati River Logistics Park',
        area: 'Chansma Highway',
        city: 'Patan',
        state: 'Gujarat',
        pincode: '384265',
        latitude: 23.84932,
        longitude: 72.12662,
        officeAddress: 'Chansma Highway Bypass, Saraswati River Logistics Park, Chansma Highway, Patan, Gujarat - 384265',
        role: 'DEALER',
        isActive: true,
        passwordHash: dealerPasswordHash
      }
    ]);

    console.log('Creating sample Customers/Users...');
    const userPasswordHash = await User.hashPassword('User@12345');
    const users = await User.create([
      {
        name: 'Rajesh Patel',
        mobile: '9825000001',
        whatsappNumber: '9825000001',
        email: 'rajesh.builder@example.com',
        gstNumber: '24AAACA1234A1Z5',
        addressLine1: 'Plot 42, GIDC Industrial Estate',
        addressLine2: 'Phase 2 Near Power Substation',
        area: 'Sanand GIDC',
        city: 'Sanand',
        state: 'Gujarat',
        pincode: '382110',
        latitude: 22.9868,
        longitude: 72.3787,
        officeAddress: 'Plot 42, GIDC Industrial Estate, Sanand, Ahmedabad, Gujarat - 382110',
        userType: 'Builder',
        companyName: 'Patel Infrastructure Ltd',
        role: 'USER',
        isActive: true,
        passwordHash: userPasswordHash
      },
      {
        name: 'Vikram Shah',
        mobile: '9825000002',
        whatsappNumber: '9825000002',
        email: 'vikram.contractor@example.com',
        gstNumber: '24BBBCB5678B2Z6',
        addressLine1: 'Skyline Commercial Project',
        addressLine2: 'Tower B, 4th Floor',
        area: 'SG Highway',
        city: 'Ahmedabad',
        state: 'Gujarat',
        pincode: '380054',
        latitude: 23.0531,
        longitude: 72.5085,
        officeAddress: 'Skyline Commercial Project, Tower B, SG Highway, Ahmedabad, Gujarat - 380054',
        userType: 'Contractor',
        companyName: 'Shah Construction & Co',
        role: 'USER',
        isActive: true,
        passwordHash: userPasswordHash
      }
    ]);

    console.log('Creating Products...');
    const products = await Product.create([
      {
        name: 'Premium River Sand (Send)',
        category: 'Sand',
        description: 'High-grade washed riverbed sand with genuine river royalty certification. Free from clay and organic matter, perfect for concrete casting, masonry, and plastering.',
        pricePerTon: 2350,
        priceSinglePatiya: 2350,
        priceDoublePatiya: 4500,
        unit: 'Tractor',
        sandLocations: ['Patan', 'Sabarmati', 'Vijapur', 'Siddhpur'],
        aggregateTypes: [],
        isActive: true
      },
      {
        name: 'Crushed Black Trap Aggregate',
        category: 'Aggregate',
        description: 'Machine-crushed basalt aggregate with cubical shape and high compressive strength. Strictly graded for RCC slab, column, and foundation work.',
        pricePerTon: 2800,
        priceSinglePatiya: 2800,
        priceDoublePatiya: 5400,
        unit: 'Tractor',
        aggregateTypes: ['20mm', '10mm', '6mm', '(10 + 20 ) mm Mix', 'Wetmix', 'Refo Dust', 'Metal 40×63', 'Rubble'],
        dumperAggregateTypes: ['20mm', '10mm', '6mm', '(10 + 20 ) mm Mix', 'Wetmix', 'Refo Dust', 'Metal 40×63', 'Rubble'],
        tractorAggregateTypes: ['20mm', '10mm', '6mm', '(10 + 20 ) mm Mix', 'Wetmix', 'Refo Dust', 'Metal 40×63', 'Rubble'],
        tractorGrainPricing: [
          { name: '20mm', priceSinglePatiya: 2800, priceDoublePatiya: 5400 },
          { name: '10mm', priceSinglePatiya: 2850, priceDoublePatiya: 5500 },
          { name: '6mm', priceSinglePatiya: 2750, priceDoublePatiya: 5300 },
          { name: '(10 + 20 ) mm Mix', priceSinglePatiya: 2900, priceDoublePatiya: 5600 },
          { name: 'Wetmix', priceSinglePatiya: 2700, priceDoublePatiya: 5200 },
          { name: 'Refo Dust', priceSinglePatiya: 2500, priceDoublePatiya: 4800 },
          { name: 'Metal 40×63', priceSinglePatiya: 2800, priceDoublePatiya: 5400 },
          { name: 'Rubble', priceSinglePatiya: 2600, priceDoublePatiya: 5000 }
        ],
        dumperGrainPricing: [
          { name: '20mm', pricePerTon: 800 },
          { name: '10mm', pricePerTon: 850 },
          { name: '6mm', pricePerTon: 750 },
          { name: '(10 + 20 ) mm Mix', pricePerTon: 900 },
          { name: 'Wetmix', pricePerTon: 700 },
          { name: 'Refo Dust', pricePerTon: 650 },
          { name: 'Metal 40×63', pricePerTon: 800 },
          { name: 'Rubble', pricePerTon: 700 }
        ],
        sandLocations: [],
        isActive: true
      },
      {
        name: 'Fine Washed Stone Grit',
        category: 'Grit',
        description: 'Precision-graded 2mm-4mm stone grit with minimal silt content. Ideal for pavement blocks, precast tiles, flyash brick manufacturing, and waterproofing screeds.',
        pricePerTon: 1100,
        priceSinglePatiya: 1100,
        priceDoublePatiya: 2100,
        unit: 'Tractor',
        aggregateTypes: [],
        sandLocations: [],
        isActive: true
      }
    ]);

    console.log('Seeding Dynamic Independent Locations for Dumper and Tractor...');
    const locations = await Location.create([
      // Dumper Sand Locations
      { name: 'Patan', vehicleType: 'DUMPER', category: 'Sand', state: 'Gujarat', description: 'Certified pure riverbed sand quarry for heavy dumpers', displayOrder: 1, isActive: true },
      { name: 'Siddhpur', vehicleType: 'DUMPER', category: 'Sand', state: 'Gujarat', description: 'High-silica fine river sand source for bulk dumpers', displayOrder: 2, isActive: true },
      { name: 'Sabarmati', vehicleType: 'DUMPER', category: 'Sand', state: 'Gujarat', description: 'Coarse concrete riverbed aggregate & sand for dumpers', displayOrder: 3, isActive: true },
      { name: 'Vijapur', vehicleType: 'DUMPER', category: 'Sand', state: 'Gujarat', description: 'Regional quarry & processing hub for dumpers', displayOrder: 4, isActive: true },

      // Dumper Aggregate Locations (Vadagam & Sayala)
      { name: 'Vadagam', vehicleType: 'DUMPER', category: 'Aggregate', state: 'Gujarat', description: 'Certified black trap basalt quarry & crushing plant for dumpers', displayOrder: 5, isActive: true },
      { name: 'Sayala', vehicleType: 'DUMPER', category: 'Aggregate', state: 'Gujarat', description: 'High compressive strength machine-crushed aggregate origin', displayOrder: 6, isActive: true },

      // Tractor Locations (Sand)
      { name: 'Patan', vehicleType: 'TRACTOR', category: 'Sand', state: 'Gujarat', description: 'Local tractor dispatch depot for Patan city & villages', displayOrder: 1, isActive: true },
      { name: 'Siddhpur', vehicleType: 'TRACTOR', category: 'Sand', state: 'Gujarat', description: 'Local tractor dispatch depot for Siddhpur region', displayOrder: 2, isActive: true },
      { name: 'Sabarmati', vehicleType: 'TRACTOR', category: 'Sand', state: 'Gujarat', description: 'Local tractor dispatch depot for Ahmedabad/Gandhinagar', displayOrder: 3, isActive: true },
      { name: 'Vijapur', vehicleType: 'TRACTOR', category: 'Sand', state: 'Gujarat', description: 'Local tractor dispatch depot for Vijapur taluka', displayOrder: 4, isActive: true }
    ]);

    console.log('Seeding Vehicle Visibility Settings...');
    await VehicleSetting.create({
      dumperEnabled: true,
      tractorEnabled: true
    });

    console.log('Seeding Dynamic Vehicle Configurations (Options & Capacities)...');
    await VehicleConfig.create([
      // Dumper - Filter Sand
      { vehicleType: 'DUMPER', optionName: 'Filter Sand', wheelCount: 10, approximateTon: 25, basePricePerTon: 800, displayOrder: 1, isActive: true },
      { vehicleType: 'DUMPER', optionName: 'Filter Sand', wheelCount: 12, approximateTon: 35, basePricePerTon: 800, displayOrder: 2, isActive: true },
      { vehicleType: 'DUMPER', optionName: 'Filter Sand', wheelCount: 16, approximateTon: 45, basePricePerTon: 800, displayOrder: 3, isActive: true },
      { vehicleType: 'DUMPER', optionName: 'Filter Sand', wheelCount: 18, approximateTon: 50, basePricePerTon: 800, displayOrder: 4, isActive: true },

      // Dumper - Without Filter
      { vehicleType: 'DUMPER', optionName: 'Without Filter', wheelCount: 10, approximateTon: 25, basePricePerTon: 700, displayOrder: 5, isActive: true },
      { vehicleType: 'DUMPER', optionName: 'Without Filter', wheelCount: 12, approximateTon: 35, basePricePerTon: 700, displayOrder: 6, isActive: true },
      { vehicleType: 'DUMPER', optionName: 'Without Filter', wheelCount: 16, approximateTon: 45, basePricePerTon: 700, displayOrder: 7, isActive: true },
      { vehicleType: 'DUMPER', optionName: 'Without Filter', wheelCount: 18, approximateTon: 50, basePricePerTon: 700, displayOrder: 8, isActive: true },

      // Dumper - Choliyu
      { vehicleType: 'DUMPER', optionName: 'Choliyu', wheelCount: 10, approximateTon: 25, basePricePerTon: 750, displayOrder: 9, isActive: true },
      { vehicleType: 'DUMPER', optionName: 'Choliyu', wheelCount: 12, approximateTon: 35, basePricePerTon: 750, displayOrder: 10, isActive: true },
      { vehicleType: 'DUMPER', optionName: 'Choliyu', wheelCount: 16, approximateTon: 45, basePricePerTon: 750, displayOrder: 11, isActive: true },
      { vehicleType: 'DUMPER', optionName: 'Choliyu', wheelCount: 18, approximateTon: 50, basePricePerTon: 750, displayOrder: 12, isActive: true },

      // Tractor - Single Patiya
      { vehicleType: 'TRACTOR', optionName: 'Single Patiya', wheelCount: null, approximateTon: 3.5, basePricePerTon: 671, flatPrice: 2350, displayOrder: 13, isActive: true },

      // Tractor - Double Patiya
      { vehicleType: 'TRACTOR', optionName: 'Double Patiya', wheelCount: null, approximateTon: 7.0, basePricePerTon: 642, flatPrice: 4500, displayOrder: 14, isActive: true }
    ]);

    console.log('Creating initial sample orders & counters...');
    await Counter.create({ _id: 'order_2026', seq: 3 });

    // Pre-create OTP hash for sample active delivery
    const { rawOtp, otpHash, expiresAt } = await OtpService.generateOtp(1440);

    const orders = await Order.create([
      {
        orderNumber: 'AT-2026-000001',
        userId: users[0]._id,
        dealerId: dealers[0]._id,
        assignedDealerId: dealers[0]._id,
        dealerDistanceKm: 2.1,
        productId: products[0]._id,
        productNameSnapshot: products[0].name,
        category: 'Sand',
        sandLocation: 'Patan',
        vehicleType: 'Single Patiya',
        vehicleCapacity: 3,
        quantity: 3,
        pricePerTonSnapshot: 2350,
        pricePerTractorSnapshot: 2350,
        numberOfTractors: 3,
        tractorType: 'Single Patiya',
        subtotal: 7050,
        deliveryCharge: 0,
        tax: 0,
        totalAmount: 7050,
        shippingAddress: 'Plot 42, GIDC Industrial Estate, Sanand, Ahmedabad, Gujarat - 382110',
        pincode: '382110',
        shippingDetails: {
          fullName: 'Rajesh Patel',
          mobile: '9825000001',
          addressLine1: 'Plot 42, GIDC Industrial Estate',
          addressLine2: 'Phase 2',
          area: 'Sanand GIDC',
          city: 'Sanand',
          state: 'Gujarat',
          pincode: '382110',
          landmark: 'Near Power Substation'
        },
        latitude: 22.9868,
        longitude: 72.3787,
        paymentStatus: 'PAID',
        paymentId: 'pay_sample_001',
        razorpayOrderId: 'order_sample_001',
        orderStatus: 'DELIVERED',
        driverName: 'Ramesh Kumar',
        driverMobile: '9879001122',
        vehicleNumber: 'GJ-01-AB-4567',
        riverRoyaltyUrl: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800&auto=format&fit=crop',
        waybridgePhotoUrl: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800&auto=format&fit=crop',
        deliveryOtpHash: otpHash,
        deliveryOtpExpiresAt: expiresAt,
        otpAttempts: 1,
        acceptedAt: new Date(Date.now() - 24 * 3600 * 1000),
        outForDeliveryAt: new Date(Date.now() - 20 * 3600 * 1000),
        deliveredAt: new Date(Date.now() - 18 * 3600 * 1000),
        deliveryVerifiedAt: new Date(Date.now() - 18 * 3600 * 1000)
      },
      {
        orderNumber: 'AT-2026-000002',
        userId: users[1]._id,
        dealerId: dealers[2]._id,
        assignedDealerId: dealers[2]._id,
        dealerDistanceKm: 18.2,
        productId: products[1]._id,
        productNameSnapshot: products[1].name,
        category: 'Aggregate',
        aggregateType: '20mm',
        vehicleType: 'Double Patiya',
        vehicleCapacity: 2,
        quantity: 2,
        pricePerTonSnapshot: 5400,
        pricePerTractorSnapshot: 5400,
        numberOfTractors: 2,
        tractorType: 'Double Patiya',
        subtotal: 10800,
        deliveryCharge: 0,
        tax: 0,
        totalAmount: 10800,
        shippingAddress: 'Skyline Commercial Project, Tower B, SG Highway, Ahmedabad, Gujarat - 380054',
        pincode: '380054',
        shippingDetails: {
          fullName: 'Vikram Shah',
          mobile: '9825000002',
          addressLine1: 'Skyline Commercial Project',
          addressLine2: 'Tower B, 4th Floor',
          area: 'SG Highway',
          city: 'Ahmedabad',
          state: 'Gujarat',
          pincode: '380054',
          landmark: 'Opposite Infotower'
        },
        latitude: 23.0531,
        longitude: 72.5085,
        paymentStatus: 'PAID',
        paymentId: 'pay_sample_002',
        razorpayOrderId: 'order_sample_002',
        orderStatus: 'OUT_FOR_DELIVERY',
        driverName: 'Suresh Parmar',
        driverMobile: '9879003344',
        vehicleNumber: 'GJ-18-XY-9876',
        riverRoyaltyUrl: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800&auto=format&fit=crop',
        waybridgePhotoUrl: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800&auto=format&fit=crop',
        deliveryOtpHash: otpHash,
        deliveryOtpExpiresAt: expiresAt,
        otpAttempts: 0,
        acceptedAt: new Date(Date.now() - 4 * 3600 * 1000),
        outForDeliveryAt: new Date(Date.now() - 1 * 3600 * 1000)
      },
      {
        orderNumber: 'AT-2026-000003',
        userId: users[0]._id,
        dealerId: null,
        assignedDealerId: dealers[0]._id,
        dealerDistanceKm: 1.4,
        productId: products[2]._id,
        productNameSnapshot: products[2].name,
        category: 'Grit',
        vehicleType: 'Single Patiya',
        vehicleCapacity: 4,
        quantity: 4,
        pricePerTonSnapshot: 1100,
        pricePerTractorSnapshot: 1100,
        numberOfTractors: 4,
        tractorType: 'Single Patiya',
        subtotal: 4400,
        deliveryCharge: 0,
        tax: 0,
        totalAmount: 4400,
        shippingAddress: 'Highway Commercial Zone, Mehsana, Gujarat - 384001',
        pincode: '384001',
        shippingDetails: {
          fullName: 'Jainil Patel',
          mobile: '9825000001',
          addressLine1: 'ABC Road, Plot 5',
          addressLine2: '',
          area: 'Highway Zone',
          city: 'Mehsana',
          state: 'Gujarat',
          pincode: '384001',
          landmark: 'Near Highway Toll'
        },
        latitude: 23.59796,
        longitude: 72.36932,
        paymentStatus: 'PAID',
        paymentId: 'pay_sample_003',
        razorpayOrderId: 'order_sample_003',
        orderStatus: 'PLACED'
      }
    ]);

    console.log('Creating sample notifications...');
    await Notification.create([
      {
        recipientId: users[1]._id,
        recipientRole: 'USER',
        type: 'OUT_FOR_DELIVERY',
        title: 'Material Out for Delivery! 🚚',
        message: `Your material is en route! Driver: Suresh Parmar (9879003344), Vehicle: GJ-18-XY-9876. Your Delivery OTP is ${rawOtp}.`,
        orderId: orders[1]._id,
        isRead: false
      },
      {
        recipientId: dealers[0]._id,
        recipientRole: 'DEALER',
        type: 'ORDER_PLACED',
        title: 'New Nearest Delivery Assigned 🚛',
        message: `New order #AT-2026-000003 in Mehsana (PIN 384001, ~1.4 km from depot): Fine Washed Stone Grit.`,
        orderId: orders[2]._id,
        isRead: false
      }
    ]);

    console.log('====================================================');
    console.log('  ANANTA TRADERS SEED DATA CREATED SUCCESSFULLY!');
    console.log('====================================================');
    console.log('Admin Account:');
    console.log('  Mobile:    9876543210');
    console.log('  Password:  Admin@12345');
    console.log('  Role:      ADMIN');
    console.log('----------------------------------------------------');
    console.log('Dealer Accounts:');
    console.log('  Mobile:    9898000004 (Mehsana - PIN 384001)');
    console.log('  Mobile:    9898000001 (Siddhpur - PIN 384151)');
    console.log('  Mobile:    9898000002 (Sabarmati/Gandhinagar - PIN 382010)');
    console.log('  Mobile:    9898000003 (Patan - PIN 384265)');
    console.log('  Password:  Dealer@12345');
    console.log('----------------------------------------------------');
    console.log('Customer Accounts:');
    console.log('  Mobile:    9825000001 (Rajesh Patel - Builder - PIN 382110)');
    console.log('  Mobile:    9825000002 (Vikram Shah - Contractor - PIN 380054)');
    console.log('  Password:  User@12345');
    console.log('====================================================');

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Seed error:', error);
    process.exit(1);
  }
};

seedData();
