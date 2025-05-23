const net = require('net');
const readline = require('readline');

// Configuration
const SERVER_HOST = 'localhost';
const SERVER_PORT = 8001;
const DEVICE_ID = '6209877375'; // Can be changed
const POSITION_UPDATE_INTERVAL = 60000; // 10 seconds between updates
const LINK_MAINTENANCE_INTERVAL = 480000; // 8 minutes (protocol default)
const LINK_RETRY_INTERVAL = 60000; // 1 minute (when no response)
const MAX_LINK_RETRIES = 5; // Max retries before restart

// Simulated device state
let deviceState = {
  battery: 95,
  steps: 0,
  rollCount: 0,
  terminalStatus: '00000000', // Normal operation
  gpsFixed: 'A', // 'A' for fixed, 'V' for no fix
  satellites: 9,
  gsmSignal: 100,
  linkRetries: 0,
  linkMaintenanceTimer: null,
  positionUpdateTimer: null,
  uploadInterval: 1, // Default upload interval in minutes
  centerNumber: '00000000000',
  controlPassword: '111111',
  sosNumbers: ['00000000000', '00000000000', '00000000000'],
  ipAddress: '113.81.229.95',
  port: '900',
  language: 1, // Chinese simplified
  timeZone: 8,
  sosSmsEnabled: 1,
  lowBatteryAlert: 1,
  removeBraceletAlert: 1,
  pedometerEnabled: 1,
  profileMode: 1, // Vibrate and ring
  awaitingLkResponse: false,
  lkResponseTimer: null
};

// Create TCP connection to server
const client = new net.Socket();

// Connect to server
function connectToServer() {
  client.connect(SERVER_PORT, SERVER_HOST, () => {
    console.log(`Connected to server at ${SERVER_HOST}:${SERVER_PORT}`);
    startDeviceCommunication();
  });
}

// Calculate message length in hexadecimal
function calculateMessageLength(messageBody) {
  const length = messageBody.length;
  return length.toString(16).toUpperCase().padStart(4, '0'); // Convert to hex and pad to 4 characters
}

// Handle server responses and commands
function handleServerMessage(data) {
  const message = data.toString().trim();
  console.log(`Received from server: ${message}`);

  // Extract message parts (format: [CS*YYYYYYYYY*LEN*COMMAND,...])
  const messageParts = message.match(/^\[(3G|SG|CS)\*(\d+)\*([0-9A-Fa-f]+)\*([^,\]]+)(?:,(.*))?\]$/);
  
  if (!messageParts) {
    console.log('Invalid message format');
    return;
  }

  const [_, cs, deviceId, len, command, params] = messageParts;

  // Verify device ID matches (if specified)
  if (deviceId && deviceId !== DEVICE_ID) {
    console.log('Message not for this device');
    return;
  }
console.log(`Command: ${command}, Params: ${params}`);
  // Handle different commands
  switch (command) {
    case 'UD':
      // Position update command
      console.log('Position update command acknowledged');
      // sendPositionUpdate();
      break;
    case 'UD2':
      // Position update with additional data
      console.log('Position update with additional data acknowledged');
      // sendPositionUpdate();
      break;
    case 'AL':
      // Alarm command
      console.log('Alarm command acknowledged');
      // sendAlarm();
      break;
    case 'LK':
      // Link maintenance acknowledgment    
      console.log('Received LK acknowledgment');
      resetLinkMaintenance();
      break;

    case 'CR':
      // Location request - send immediate position updates for 3 minutes
      sendPositionUpdate();
      // Protocol says 10-second updates for 3 minutes
      const crInterval = setInterval(sendPositionUpdate, 10000);
      setTimeout(() => clearInterval(crInterval), 180000);
      break;

    case 'UPLOAD':
      // Upload interval setting
      const interval = parseInt(params) || 10;
      deviceState.uploadInterval = interval;
      console.log(`Upload interval set to ${interval} minutes`);
      client.write(`[3G*${DEVICE_ID}*0006*UPLOAD]`);
      break;

    case 'CENTER':
      // Center number setting
      deviceState.centerNumber = params || '00000000000';
      console.log(`Center number set to ${deviceState.centerNumber}`);
      client.write(`[3G*${DEVICE_ID}*0006*CENTER]`);
      break;

    case 'PW':
      // Control password setting
      deviceState.controlPassword = params || '111111';
      console.log(`Control password set to ${deviceState.controlPassword}`);
      client.write(`[3G*${DEVICE_ID}*0002*PW]`);
      break;

    case 'SOS':
      // SOS numbers setting
      const sosNumbers = params ? params.split(',') : [];
      deviceState.sosNumbers = [
        sosNumbers[0] || '00000000000',
        sosNumbers[1] || '00000000000',
        sosNumbers[2] || '00000000000'
      ];
      console.log(`SOS numbers set to ${deviceState.sosNumbers.join(', ')}`);
      client.write(`[3G*${DEVICE_ID}*0003*SOS]`);
      break;

    case 'IP':
      // IP/port setting
      const [ip, port] = params ? params.split(',') : ['113.81.229.95', '900'];
      deviceState.ipAddress = ip;
      deviceState.port = port;
      console.log(`IP/port set to ${ip}:${port}`);
      // Protocol says device should reconnect with new settings
      setTimeout(() => {
        client.end();
        connectToServer();
      }, 1000);
      break;

    case 'FACTORY':
      // Factory reset
      console.log('Performing factory reset...');
      resetDeviceToFactory();
      client.write(`[3G*${DEVICE_ID}*0007*FACTORY]`);
      break;

    case 'LZ':
      // Language/timezone setting
      const [lang, tz] = params ? params.split(',') : ['1', '8'];
      deviceState.language = parseInt(lang) || 1;
      deviceState.timeZone = parseInt(tz) || 8;
      console.log(`Language set to ${deviceState.language}, timezone to ${deviceState.timeZone}`);
      client.write(`[3G*${DEVICE_ID}*0002*LZ]`);
      break;

    case 'SOSSMS':
      // SOS SMS alert setting
      deviceState.sosSmsEnabled = parseInt(params) || 0;
      console.log(`SOS SMS alerts ${deviceState.sosSmsEnabled ? 'enabled' : 'disabled'}`);
      client.write(`[3G*${DEVICE_ID}*0006*SOSSMS]`);
      break;

    case 'LOWBAT':
      // Low battery alert setting
      deviceState.lowBatteryAlert = parseInt(params) || 0;
      console.log(`Low battery alerts ${deviceState.lowBatteryAlert ? 'enabled' : 'disabled'}`);
      client.write(`[3G*${DEVICE_ID}*0006*LOWBAT]`);
      break;

    case 'REMOVE':
      // Remove bracelet alert setting
      deviceState.removeBraceletAlert = parseInt(params) || 0;
      console.log(`Bracelet removal alerts ${deviceState.removeBraceletAlert ? 'enabled' : 'disabled'}`);
      client.write(`[3G*${DEVICE_ID}*0006*REMOVE]`);
      break;

    case 'PEDO':
      // Pedometer setting
      deviceState.pedometerEnabled = parseInt(params) || 0;
      console.log(`Pedometer ${deviceState.pedometerEnabled ? 'enabled' : 'disabled'}`);
      client.write(`[3G*${DEVICE_ID}*0004*PEDO]`);
      break;

    case 'PROFILE':
      // Profile mode setting
      deviceState.profileMode = parseInt(params) || 1;
      const modes = ['', 'Vibrate and ring', 'Ring only', 'Vibrate only', 'Mute'];
      console.log(`Profile mode set to ${modes[deviceState.profileMode]}`);
      client.write(`[3G*${DEVICE_ID}*0007*PROFILE]`);
      break;

    case 'VERNO':
      // Version query
      client.write(`[3G*${DEVICE_ID}*0028*VERNO,G29_BASE_V1.00_2014.04.23_17.46.49]`);
      break;

    case 'RESET':
      // Reset command
      console.log('Device restarting...');
      setTimeout(() => {
        client.end();
        connectToServer();
      }, 2000);
      client.write(`[3G*${DEVICE_ID}*0005*RESET]`);
      break;

    case 'POWEROFF':
      // Power off command
      console.log('Device powering off...');
      setTimeout(() => {
        client.end();
        process.exit(0);
      }, 2000);
      client.write(`[3G*${DEVICE_ID}*0008*POWEROFF]`);
      break;

    case 'FIND':
      // Find device command
      console.log('Find device command received - beeping for 1 minute');
      client.write(`[3G*${DEVICE_ID}*0004*FIND]`);
      break;

    default:
      console.log(`Unknown command: ${command}`);
  }
}

// Generate random position near center point
function generateRandomPosition() {
  const VARIATION = 0.01; // +/- variation in degrees
  const latVariation = (Math.random() * 2 - 1) * VARIATION;
  const lngVariation = (Math.random() * 2 - 1) * VARIATION;
  return {
    lat: (22.570733 + latVariation).toFixed(6),
    lng: (113.8626083 + lngVariation).toFixed(6),
    speed: (Math.random() * 10).toFixed(2),
    direction: Math.floor(Math.random() * 360),
    altitude: Math.floor(Math.random() * 100)
  };
}

// Format current date/time in device format
function getCurrentDateTime() {
  const now = new Date();
  const date = [
    now.getDate().toString().padStart(2, '0'),
    (now.getMonth() + 1).toString().padStart(2, '0'),
    now.getFullYear().toString().substr(2, 2)
  ].join('');
  
  const time = [
    now.getHours().toString().padStart(2, '0'),
    now.getMinutes().toString().padStart(2, '0'),
    now.getSeconds().toString().padStart(2, '0')
  ].join('');
  
  return { date, time };
}

// Send position update (UD command)
function sendPositionUpdate() {
  const { date, time } = getCurrentDateTime();
  const pos = generateRandomPosition();

  // Simulate battery drain
  deviceState.battery = Math.max(10, deviceState.battery - 1);
  deviceState.steps += Math.floor(Math.random() * 10);
  deviceState.rollCount += Math.floor(Math.random() * 2);

  const messageBody = `UD,${date},${time},${deviceState.gpsFixed},${pos.lat},N,${pos.lng},E,${pos.speed},${pos.direction},${pos.altitude},${deviceState.satellites},${deviceState.gsmSignal},${deviceState.battery},${deviceState.steps},${deviceState.rollCount},${deviceState.terminalStatus},7,255,460,1,9529,21809,158,9529,63555,133,9529,63554,129,9529,21405,126,9529,21242,124,9529,21151,120,9529,63556,119,0,40.7`;
  const messageLength = calculateMessageLength(messageBody);
  const message = `[3G*${DEVICE_ID}*${messageLength}*${messageBody}]`;

  client.write(message);
  console.log(`Sent position update: ${message}`);
}

// Send link maintenance (LK command)
function sendLinkMaintenance() {
  const messageBody = `LK,${deviceState.steps},${deviceState.rollCount},${deviceState.battery}`;
  const messageLength = calculateMessageLength(messageBody);
  const message = `[3G*${DEVICE_ID}*${messageLength}*${messageBody}]`;

  client.write(message);
  console.log(`Sent link maintenance: ${message}`);

  // Set waiting flag
  deviceState.awaitingLkResponse = true;

  // Clear any existing timer
  if (deviceState.lkResponseTimer) {
    clearTimeout(deviceState.lkResponseTimer);
  }

  // Start timer to check for response
  deviceState.lkResponseTimer = setTimeout(() => {
    deviceState.linkRetries++;
    console.log(`No response to LK, retry ${deviceState.linkRetries}/${MAX_LINK_RETRIES}`);

    if (deviceState.linkRetries >= MAX_LINK_RETRIES) {
      console.log('Max retries reached, restarting device...');
      restartDevice();
    } else {
      // Reset waiting flag before retry
      deviceState.awaitingLkResponse = false;
      sendLinkMaintenance();
    }
  }, 30000); // Wait 30 seconds for response
}

// Reset link maintenance state after successful response
function resetLinkMaintenance() {
  if (deviceState.lkResponseTimer) {
    clearTimeout(deviceState.lkResponseTimer);
    deviceState.lkResponseTimer = null;
  }
  deviceState.awaitingLkResponse = false;
  deviceState.linkRetries = 0;
}

// Send alarm (AL command)
function sendAlarm() {
  const { date, time } = getCurrentDateTime();

  const messageBody = `AL,${date},${time},${deviceState.gpsFixed},${deviceState.battery}`;
  const messageLength = calculateMessageLength(messageBody);
  const message = `[3G*${DEVICE_ID}*${messageLength}*${messageBody}]`;

  client.write(message);
  console.log(`Sent alarm: ${message}`);
}

// Reset device to factory settings
function resetDeviceToFactory() {
  deviceState = {
    ...deviceState,
    battery: 95,
    steps: 0,
    rollCount: 0,
    terminalStatus: '00000010',
    gpsFixed: 'A',
    uploadInterval: 10,
    centerNumber: '00000000000',
    controlPassword: '111111',
    sosNumbers: ['00000000000', '00000000000', '00000000000'],
    ipAddress: '113.81.229.95',
    port: '900',
    language: 1,
    timeZone: 8,
    sosSmsEnabled: 1,
    lowBatteryAlert: 1,
    removeBraceletAlert: 1,
    pedometerEnabled: 1,
    profileMode: 1
  };
}

// Restart the device simulation
function restartDevice() {
  console.log('Restarting device simulation...');
  // Clear all timers
  if (deviceState.linkMaintenanceTimer) {
    clearTimeout(deviceState.linkMaintenanceTimer);
  }
  if (deviceState.lkResponseTimer) {
    clearTimeout(deviceState.lkResponseTimer);
  }
  // Reset state
  deviceState.awaitingLkResponse = false;
  deviceState.linkRetries = 0;
  client.end();
  setTimeout(connectToServer, 5000);
}

// Start device communication
function startDeviceCommunication() {
  // Initial link maintenance
  sendLinkMaintenance();
  
  // Regular position updates based on configured interval
  deviceState.positionUpdateTimer = setInterval(
    sendPositionUpdate, 
    deviceState.uploadInterval * 60000
  );
  
  // Random alarms (20% chance every interval)
  setInterval(() => {
    if (Math.random() < 0.2) {
      sendAlarm();
    }
  }, deviceState.uploadInterval * 60000);
  
  // Command line interface for manual control
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  console.log('\nCommands:');
  console.log('1 - Send position update now');
  console.log('2 - Send alarm now');
  console.log('3 - Toggle GPS fix (current: ' + deviceState.gpsFixed + ')');
  console.log('4 - Change battery level');
  console.log('5 - Force link maintenance');
  console.log('6 - Simulate server not responding');
  console.log('q - Quit\n');
  
  rl.on('line', (input) => {
    switch(input.trim()) {
      case '1':
        sendPositionUpdate();
        break;
      case '2':
        sendAlarm();
        break;
      case '3':
        deviceState.gpsFixed = deviceState.gpsFixed === 'A' ? 'V' : 'A';
        console.log(`GPS fix now: ${deviceState.gpsFixed}`);
        break;
      case '4':
        rl.question('Enter new battery level (1-100): ', (level) => {
          deviceState.battery = Math.min(100, Math.max(1, parseInt(level) || 50));
          console.log(`Battery level set to: ${deviceState.battery}`);
        });
        break;
      case '5':
        sendLinkMaintenance();
        break;
      case '6':
        // Simulate server not responding by not sending LK response
        console.log('Simulating server not responding to LK...');
        break;
      case 'q':
        client.end();
        rl.close();
        process.exit(0);
        break;
      default:
        console.log('Unknown command');
    }
  });
}

// Set up event handlers
client.on('data', handleServerMessage);
client.on('close', () => console.log('Connection closed'));
client.on('error', (err) => console.error('Connection error:', err));

// Initial connection
connectToServer();