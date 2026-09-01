const Order = require('../models/Order');
const User = require('../models/User');
const Product = require('../models/Product');
const xlsx = require('xlsx');
const { successResponse, errorResponse } = require('../utils/responseHelper');

// @desc    Admin Dashboard Overview Stats & Today's Command Center
// @route   GET /api/admin/dashboard
// @access  Private (Admin)
const getDashboardStats = async (req, res) => {
  try {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    // Global aggregations
    const [
      totalOrders,
      totalUsers,
      totalDealers,
      revenueResult,
      todayOrders,
      statusCounts,
      recentOrders,
      categoryStats
    ] = await Promise.all([
      Order.countDocuments(),
      User.countDocuments({ role: 'USER' }),
      User.countDocuments({ role: 'DEALER', isActive: true }),
      Order.aggregate([
        { $match: { paymentStatus: 'PAID' } },
        { $group: { _id: null, totalRevenue: { $sum: '$totalAmount' }, totalTonnage: { $sum: '$quantity' } } }
      ]),
      Order.find({ createdAt: { $gte: startOfToday, $lte: endOfToday } })
        .populate('userId', 'name mobile')
        .populate('dealerId', 'name companyName')
        .sort({ createdAt: -1 }),
      Order.aggregate([
        { $group: { _id: '$orderStatus', count: { $sum: 1 } } }
      ]),
      Order.find()
        .populate('userId', 'name mobile')
        .populate('dealerId', 'name companyName')
        .sort({ createdAt: -1 })
        .limit(10),
      Order.aggregate([
        { $match: { paymentStatus: 'PAID' } },
        { $group: { _id: '$category', totalQuantity: { $sum: '$quantity' }, totalAmount: { $sum: '$totalAmount' }, count: { $sum: 1 } } }
      ])
    ]);

    const totalRevenue = revenueResult[0]?.totalRevenue || 0;
    const totalTonnage = revenueResult[0]?.totalTonnage || 0;

    // Today's summary
    const todaySummary = {
      total: todayOrders.length,
      pending: todayOrders.filter((o) => ['PENDING_PAYMENT', 'PLACED'].includes(o.orderStatus)).length,
      accepted: todayOrders.filter((o) => o.orderStatus === 'ACCEPTED').length,
      outForDelivery: todayOrders.filter((o) => o.orderStatus === 'OUT_FOR_DELIVERY').length,
      delivered: todayOrders.filter((o) => o.orderStatus === 'DELIVERED').length,
      cancelled: todayOrders.filter((o) => o.orderStatus === 'CANCELLED').length,
      revenue: todayOrders
        .filter((o) => o.paymentStatus === 'PAID')
        .reduce((sum, o) => sum + o.totalAmount, 0)
    };

    const statusMap = {};
    statusCounts.forEach((s) => {
      statusMap[s._id] = s.count;
    });

    return successResponse(res, 'Admin dashboard stats retrieved.', {
      overview: {
        totalOrders,
        totalUsers,
        totalDealers,
        totalRevenue,
        totalTonnage
      },
      todaySummary,
      statusCounts: statusMap,
      recentOrders,
      categoryStats,
      todayOrders
    });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

// @desc    Admin Reports (Daily, Monthly, Dealer-wise)
// @route   GET /api/admin/reports
// @access  Private (Admin)
const getReports = async (req, res) => {
  try {
    const { month, year } = req.query;

    const currentYear = year ? Number(year) : new Date().getFullYear();
    const currentMonth = month ? Number(month) - 1 : new Date().getMonth();

    const startOfMonth = new Date(currentYear, currentMonth, 1);
    const endOfMonth = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59, 999);

    // Monthly orders & revenue
    const monthlyStats = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startOfMonth, $lte: endOfMonth }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          totalOrders: { $sum: 1 },
          totalRevenue: {
            $sum: { $cond: [{ $eq: ['$paymentStatus', 'PAID'] }, '$totalAmount', 0] }
          },
          totalQuantity: { $sum: '$quantity' },
          deliveredOrders: {
            $sum: { $cond: [{ $eq: ['$orderStatus', 'DELIVERED'] }, 1, 0] }
          },
          cancelledOrders: {
            $sum: { $cond: [{ $eq: ['$orderStatus', 'CANCELLED'] }, 1, 0] }
          }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Dealer Performance Matrix
    const dealerPerformance = await Order.aggregate([
      { $match: { dealerId: { $ne: null } } },
      {
        $group: {
          _id: '$dealerId',
          assignedOrders: { $sum: 1 },
          acceptedOrders: {
            $sum: {
              $cond: [
                { $in: ['$orderStatus', ['ACCEPTED', 'OUT_FOR_DELIVERY', 'DELIVERED']] },
                1,
                0
              ]
            }
          },
          deliveredOrders: {
            $sum: { $cond: [{ $eq: ['$orderStatus', 'DELIVERED'] }, 1, 0] }
          },
          cancelledOrders: {
            $sum: { $cond: [{ $eq: ['$orderStatus', 'CANCELLED'] }, 1, 0] }
          },
          revenue: {
            $sum: { $cond: [{ $eq: ['$orderStatus', 'DELIVERED'] }, '$totalAmount', 0] }
          },
          totalTonnage: {
            $sum: { $cond: [{ $eq: ['$orderStatus', 'DELIVERED'] }, '$quantity', 0] }
          }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'dealer'
        }
      },
      { $unwind: '$dealer' },
      {
        $project: {
          dealerId: '$_id',
          dealerName: '$dealer.name',
          companyName: '$dealer.companyName',
          mobile: '$dealer.mobile',
          assignedOrders: 1,
          acceptedOrders: 1,
          deliveredOrders: 1,
          cancelledOrders: 1,
          revenue: 1,
          totalTonnage: 1,
          completionRate: {
            $cond: [
              { $gt: ['$assignedOrders', 0] },
              { $multiply: [{ $divide: ['$deliveredOrders', '$assignedOrders'] }, 100] },
              100
            ]
          }
        }
      },
      { $sort: { deliveredOrders: -1 } }
    ]);

    return successResponse(res, 'Reports generated.', {
      monthlyStats,
      dealerPerformance,
      period: {
        month: currentMonth + 1,
        year: currentYear
      }
    });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

// @desc    Export Orders Report to Excel (.xlsx) / CSV
// @route   GET /api/admin/reports/export
// @access  Private (Admin)
const exportOrders = async (req, res) => {
  try {
    const { format = 'csv', status, startDate, endDate } = req.query;

    const filter = {};
    if (status) filter.orderStatus = status;
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = end;
      }
    }

    const orders = await Order.find(filter)
      .populate('userId', 'name mobile gstNumber userType companyName')
      .populate('dealerId', 'name companyName mobile')
      .sort({ createdAt: -1 });

    const rows = orders.map((o) => ({
      'Order ID': o.orderNumber,
      'Date': o.createdAt ? o.createdAt.toISOString().split('T')[0] : '',
      'Customer Name': o.userId?.name || 'N/A',
      'Customer Mobile': o.userId?.mobile || 'N/A',
      'Customer GST': o.userId?.gstNumber || 'N/A',
      'User Type': o.userId?.userType || 'N/A',
      'Material': o.productNameSnapshot,
      'Category': o.category,
      'Spec / Sand Location': o.aggregateType || o.sandLocation || 'Standard',
      'Transport': o.transportType || 'Tractor',
      'Tractor Type': o.tractorType || o.vehicleType,
      'Number of Tractors': o.numberOfTractors || o.quantity,
      'Price Per Tractor (INR)': o.pricePerTractorSnapshot ?? o.pricePerTonSnapshot,
      'Subtotal (INR)': o.subtotal,
      'Delivery (INR)': o.deliveryCharge,
      'Tax (INR)': o.tax,
      'Total Amount (INR)': o.totalAmount,
      'Payment Status': o.paymentStatus,
      'Order Status': o.orderStatus,
      'Assigned Dealer': o.dealerId?.companyName || o.dealerId?.name || 'Unassigned',
      'Driver Name': o.driverName || 'N/A',
      'Driver Mobile': o.driverMobile || 'N/A',
      'Vehicle Number': o.vehicleNumber || 'N/A',
      'Shipping Address': o.shippingAddress,
      'Delivered Date': o.deliveredAt ? o.deliveredAt.toISOString() : 'N/A'
    }));

    const worksheet = xlsx.utils.json_to_sheet(rows);
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, 'Orders_Report');

    if (format === 'xlsx') {
      const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=ANANTA_Orders_Report_${Date.now()}.xlsx`);
      return res.send(buffer);
    } else {
      const csv = xlsx.utils.sheet_to_csv(worksheet);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=ANANTA_Orders_Report_${Date.now()}.csv`);
      return res.send(csv);
    }
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

module.exports = {
  getDashboardStats,
  getReports,
  exportOrders
};
