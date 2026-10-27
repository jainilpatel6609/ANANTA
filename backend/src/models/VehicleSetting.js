const mongoose = require('mongoose');

const vehicleSettingSchema = new mongoose.Schema(
  {
    dumperEnabled: {
      type: Boolean,
      default: true
    },
    tractorEnabled: {
      type: Boolean,
      default: true
    },
    // Flat platform service charge added on top of the dealer's own rate before it's shown to
    // or charged from the customer -- Dumper's is per Ton (added to Rate Per Ton), Tractor's is
    // per Trip (added to Rate Per Tractor).
    dumperServiceCharge: {
      type: Number,
      default: 25,
      min: 0
    },
    tractorServiceCharge: {
      type: Number,
      default: 200,
      min: 0
    },
    // Flat upfront "booking" amount charged when a Dumper order is placed, regardless of the
    // real per-ton rate -- the actual weight-based total is settled later (see
    // orderController.enterTotalWeight), net of this amount.
    dumperBookingAmount: {
      type: Number,
      default: 1000,
      min: 0
    }
  },
  {
    timestamps: true
  }
);

// Singleton helper to get or initialize settings
vehicleSettingSchema.statics.getSettings = async function () {
  let setting = await this.findOne();
  if (!setting) {
    setting = await this.create({ dumperEnabled: true, tractorEnabled: true });
  }
  return setting;
};

const VehicleSetting = mongoose.model('VehicleSetting', vehicleSettingSchema);
module.exports = VehicleSetting;

