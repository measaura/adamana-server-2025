// device-sim.cjs
const net = require('net');
const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
  server: {
    host: 'localhost',
    port: 8001
  },
  device: {
    id: '6209826872',    // Device ID
    imei: '352662098268726', // IMEI number
    interval: 30000,   // Milliseconds between location updates
    sosInterval: 0, // How often to send an SOS (0 to disable)
    battery: 85       // Initial battery level
  },
  simulation: {
    routeFile: './kl_route.json', // Path to the route JSON file
    loop: true,       // Whether to loop the route when finished
    speedMultiplier: 1 // Increase to speed up the simulation
  }
};

// -------------------------------------------
// Route data handling
// -------------------------------------------

// Load route data from JSON file
function loadRouteData() {
  try {
    const routeFilePath = path.resolve(__dirname, CONFIG.simulation.routeFile);
    const routeData = JSON.parse(fs.readFileSync(routeFilePath, 'utf8'));
    console.log(`Loaded ${routeData.length} waypoints from ${CONFIG.simulation.routeFile}`);
    return routeData;
  } catch (error) {
    console.error('Failed to load route data:', error.message);
    // Fallback to some default coords if file loading fails
    return [
      { lat: 3.1390, lng: 101.6869, timestamp: Date.now() }, // KL center
      { lat: 3.1410, lng: 101.6879, timestamp: Date.now() + 30000 },
      { lat: 3.1430, lng: 101.6889, timestamp: Date.now() + 60000 },
      { lat: 3.1450, lng: 101.6899, timestamp: Date.now() + 90000 }
    ];
  }
}

// -------------------------------------------
// Device message formatting (protocol-compliant)
// -------------------------------------------

// Calculate message length in hexadecimal (protocol expects length of message body, not the whole packet)
function calculateMessageLength(body) {
  return body.length.toString(16).toUpperCase().padStart(4, '0');
}

// Helper to get current date/time in protocol format
function getCurrentDateTime() {
  const now = new Date();
  const date = [
    now.getDate().toString().padStart(2, '0'),
    (now.getMonth() + 1).toString().padStart(2, '0'),
    now.getFullYear().toString().slice(-2)
  ].join('');
  const time = [
    now.getHours().toString().padStart(2, '0'),
    now.getMinutes().toString().padStart(2, '0'),
    now.getSeconds().toString().padStart(2, '0')
  ].join('');
  return { date, time };
}

// Protocol-compliant location message (UD or AL)
function formatLocationMessage(coords, type = 'UD') {
  const { lat, lng } = coords;
  const { date, time } = getCurrentDateTime();
  // Example: UD,DDMMYY,HHMMSS,A,lat,N,lng,E,0.00,0,0,9,100,battery,0,0,00000000,7,255,460,1,9529,21809,158
  // You can expand fields as needed for your protocol
  const body = `${type},${date},${time},A,${lat.toFixed(6)},N,${lng.toFixed(6)},E,0.00,0,0,9,100,${CONFIG.device.battery},0,0,00000000,7,255,460,1,9529,21809,158`;
  const len = calculateMessageLength(body);
  return Buffer.from(`[3G*${CONFIG.device.id}*${len}*${body}]`);
}

// Protocol-compliant SOS/Alarm message
function formatSosMessage(coords) {
  return formatLocationMessage(coords, 'AL');
}

// Protocol-compliant heartbeat
function formatHeartbeat() {
  // Use steps, rollCount, and battery from CONFIG.device or your device state
  const steps = 0; // Or use your actual step count if tracked
  const rollCount = 0; // Or use your actual roll count if tracked
  const battery = CONFIG.device.battery;
  const body = `LK,${steps},${rollCount},${battery}`;
  const len = calculateMessageLength(body);
  return Buffer.from(`[3G*${CONFIG.device.id}*${len}*${body}]`);
}

// -------------------------------------------
// Simulation runner
// -------------------------------------------

class DeviceSimulator {
  constructor() {
    this.client = new net.Socket();
    this.routeData = loadRouteData();
    this.currentIndex = 0;
    this.connected = false;
    this.lastSosTime = 0;
    
    // Gradually reduce battery level during simulation
    this.batteryInterval = setInterval(() => {
      if (CONFIG.device.battery > 5) {
        CONFIG.device.battery -= 1;
      }
    }, 5 * 60 * 1000); // Reduce battery every 5 minutes
  }
  
  connect() {
    this.client.connect(CONFIG.server.port, CONFIG.server.host, () => {
      console.log(`Connected to server at ${CONFIG.server.host}:${CONFIG.server.port}`);
      this.connected = true;
      
      // Start sending heartbeats
      this.heartbeatInterval = setInterval(() => {
        this.sendHeartbeat();
      }, 60000);
      
      // Start the simulation
      this.startSimulation();
    });
    
    this.client.on('data', (data) => {
      console.log(`Server response: ${data.toString()}`);
    });
    
    this.client.on('close', () => {
      console.log('Connection closed');
      this.connected = false;
      clearInterval(this.heartbeatInterval);
      clearInterval(this.locationInterval);
      clearInterval(this.batteryInterval);
    });
    
    this.client.on('error', (err) => {
      console.error('Connection error:', err.message);
    });
  }
  
  sendHeartbeat() {
    if (this.connected) {
      const message = formatHeartbeat();
      this.client.write(message);
      console.log(`Sent heartbeat: ${message.toString()}`);
    }
  }
  
  sendLocation(type = 'normal') {
    if (!this.connected || this.currentIndex >= this.routeData.length) {
      if (CONFIG.simulation.loop) {
        this.currentIndex = 0;
        console.log('Route completed, looping back to start');
      } else {
        console.log('Route completed');
        return;
      }
    }
    
    const coords = this.routeData[this.currentIndex];
    const message = type === 'sos' 
      ? formatSosMessage(coords) 
      : formatLocationMessage(coords);
    
    this.client.write(message);
    console.log(`Sent ${type} location update: ${message.toString()}`);
    
    this.currentIndex++;
  }
  
  startSimulation() {
    // Send location updates at the configured interval
    this.locationInterval = setInterval(() => {
      // Check if it's time to send an SOS
      const now = Date.now();
      if (CONFIG.device.sosInterval > 0 && 
          now - this.lastSosTime > CONFIG.device.sosInterval) {
        this.sendLocation('sos');
        this.lastSosTime = now;
      } else {
        this.sendLocation('normal');
      }
    }, CONFIG.device.interval / CONFIG.simulation.speedMultiplier);
  }
  
  triggerSos() {
    if (this.connected && this.currentIndex < this.routeData.length) {
      this.sendLocation('sos');
      this.lastSosTime = Date.now();
      console.log('SOS alert triggered manually!');
    }
  }
}

// -------------------------------------------
// Route data generation helper (for creating new route files)
// -------------------------------------------

function generateRouteFile(filename, startLat, startLng, numPoints, radiusKm) {
  const route = [];
  const earthRadius = 6371; // Earth's radius in km
  
  for (let i = 0; i < numPoints; i++) {
    // Generate a point within the radius of the starting point
    const angle = Math.random() * 2 * Math.PI;
    const distance = Math.random() * radiusKm;
    
    // Calculate new coordinates
    const latOffset = (distance / earthRadius) * (180 / Math.PI);
    const lngOffset = (distance / earthRadius) * (180 / Math.PI) / Math.cos(startLat * Math.PI / 180);
    
    // Random direction
    const lat = startLat + latOffset * Math.sin(angle);
    const lng = startLng + lngOffset * Math.cos(angle);
    
    route.push({
      lat,
      lng,
      timestamp: Date.now() + (i * 30000) // 30 seconds between points
    });
  }
  
  fs.writeFileSync(filename, JSON.stringify(route, null, 2));
  console.log(`Generated route with ${numPoints} points and saved to ${filename}`);
}

// -------------------------------------------
// Command line interface
// -------------------------------------------

function setupCommandInterface(simulator) {
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', (data) => {
    const command = data.trim().toLowerCase();
    
    switch (command) {
      case 'sos':
        simulator.triggerSos();
        break;
      case 'speed':
        console.log('Enter speed multiplier (1-10):');
        process.stdin.once('data', (input) => {
          const speed = parseInt(input.trim());
          if (!isNaN(speed) && speed >= 1 && speed <= 10) {
            CONFIG.simulation.speedMultiplier = speed;
            console.log(`Speed multiplier set to ${speed}x`);
          } else {
            console.log('Invalid speed value. Must be between 1-10.');
          }
        });
        break;
      case 'battery':
        console.log('Enter battery level (0-100):');
        process.stdin.once('data', (input) => {
          const level = parseInt(input.trim());
          if (!isNaN(level) && level >= 0 && level <= 100) {
            CONFIG.device.battery = level;
            console.log(`Battery level set to ${level}%`);
          } else {
            console.log('Invalid battery level. Must be between 0-100.');
          }
        });
        break;
      case 'create-route':
        const startLat = 3.1390; // KL center
        const startLng = 101.6869;
        generateRouteFile(
          './routes/custom_route.json', 
          startLat, 
          startLng, 
          50, // 50 points
          2   // 2km radius
        );
        break;
      case 'help':
        console.log(`
Available commands:
  sos - Trigger an SOS alert
  speed - Change simulation speed
  battery - Set device battery level
  create-route - Generate a new random route file
  help - Show this help
  exit - Close the simulator
        `);
        break;
      case 'exit':
        console.log('Closing simulator...');
        process.exit(0);
        break;
      default:
        console.log('Unknown command. Type "help" for available commands.');
    }
  });
}

// -------------------------------------------
// Main execution
// -------------------------------------------

// Make sure routes directory exists
const routesDir = path.resolve(__dirname, './routes');
if (!fs.existsSync(routesDir)) {
  fs.mkdirSync(routesDir);
}

// Check if the specified route file exists, if not, create a sample one
const routeFilePath = path.resolve(__dirname, CONFIG.simulation.routeFile);
const routeDir = path.dirname(routeFilePath);

if (!fs.existsSync(routeDir)) {
  fs.mkdirSync(routeDir, { recursive: true });
}

if (!fs.existsSync(routeFilePath)) {
  console.log(`Route file not found. Creating a sample route at ${CONFIG.simulation.routeFile}`);
  generateRouteFile(
    CONFIG.simulation.routeFile,
    3.1390, // Kuala Lumpur center as starting point
    101.6869,
    30,  // 30 points
    1.5  // 1.5km radius
  );
}

// Start the simulator
const simulator = new DeviceSimulator();
simulator.connect();

// Setup command interface
console.log('\nDevice simulator started. Type "help" for available commands.');
setupCommandInterface(simulator);