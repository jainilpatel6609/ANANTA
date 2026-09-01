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

