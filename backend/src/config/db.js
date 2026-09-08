const mongoose = require('mongoose');
const net = require('net');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const { MONGODB_URI } = require('./env');

const checkMongoRunning = (port = 27017, host = '127.0.0.1') => {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(800);
    socket.on('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.on('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    socket.on('error', () => {
      socket.destroy();
      resolve(false);
    });
    socket.connect(port, host);
  });
};

const findMongodExe = () => {
  const possiblePaths = [
    'C:\\Program Files\\MongoDB\\Server\\4.4\\bin\\mongod.exe',
    'C:\\Program Files\\MongoDB\\Server\\5.0\\bin\\mongod.exe',
    'C:\\Program Files\\MongoDB\\Server\\6.0\\bin\\mongod.exe',
    'C:\\Program Files\\MongoDB\\Server\\7.0\\bin\\mongod.exe',
    'C:\\Program Files\\MongoDB\\Server\\8.0\\bin\\mongod.exe'
  ];
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) return p;
  }
  return 'mongod';
};

const isLocalMongoUri = (uri) => {
  if (!uri) return true;
  return uri.includes('127.0.0.1') || uri.includes('localhost');
};

const ensureMongoRunning = async () => {
  // Do not attempt local daemon spawn on Render / Production or remote cloud URIs
  if (process.env.NODE_ENV === 'production' || process.env.RENDER || !isLocalMongoUri(MONGODB_URI)) {
    return false;
  }

  const isRunning = await checkMongoRunning(27017);
  if (isRunning) return true;

  console.log('[ANANTA TRADERS] Local MongoDB is not running. Auto-starting MongoDB server...');
  const mongodExe = findMongodExe();
  const dbPath = path.resolve(__dirname, '../../../data/db');

  try {
    if (!fs.existsSync(dbPath)) {
      fs.mkdirSync(dbPath, { recursive: true });
    }

    const child = spawn(mongodExe, ['--dbpath', dbPath, '--port', '27017'], {
      detached: true,
      stdio: 'ignore'
    });

    child.on('error', (err) => {
      console.warn(`[ANANTA TRADERS] Local mongod spawn note: ${err.message}`);
    });

    child.unref();

    for (let i = 0; i < 15; i++) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      if (await checkMongoRunning(27017)) {
        console.log('[ANANTA TRADERS] Local MongoDB server auto-started successfully!');
        return true;
      }
    }
  } catch (err) {
    console.warn(`[ANANTA TRADERS] Auto-start mongod note: ${err.message}`);
  }
  return false;
};

const connectDB = async () => {
  try {
    await ensureMongoRunning();

    const conn = await mongoose.connect(MONGODB_URI, {
      autoIndex: true,
      serverSelectionTimeoutMS: 5000
    });
    console.log(`[ANANTA TRADERS] MongoDB Connected: ${conn.connection.host}/${conn.connection.name}`);
    return conn;
  } catch (error) {
    console.error(`[ANANTA TRADERS] Database Connection Error: ${error.message}`);
    console.warn('[ANANTA TRADERS] Retrying MongoDB connection in 5 seconds... Make sure MONGODB_URI is set on Render dashboard.');
    setTimeout(connectDB, 5000);
  }
};

module.exports = connectDB;
