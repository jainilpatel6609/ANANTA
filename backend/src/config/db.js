const mongoose = require('mongoose');
const { MONGODB_URI } = require('./env');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(MONGODB_URI, {
      autoIndex: true
    });
    console.log(`[ANANTA TRADERS] MongoDB Connected: ${conn.connection.host}/${conn.connection.name}`);
    return conn;
  } catch (error) {
    console.error(`[ANANTA TRADERS] Database Connection Error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
