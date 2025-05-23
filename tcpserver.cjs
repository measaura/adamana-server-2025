vhost = "localhost";
//check if localhost is ok with prod

// Load the TCP Library
net = require("net");
http = require("http");
querystring = require("querystring");

// Keep track of the chat clients
var clients = [];

var noReply = [
  "CR",
  "LZ",
  "PHB",
  "PHB2",
  "POWEROFF",
  "UPLOAD",
  "CALL",
  "IP",
  "FACTORY",
  "VERNO",
  "RESET",
  "REMOVE",
  "PEDO",
  "WALKTIME",
  "SLEEPTIME",
  "SILENCETIME",
  "FIND",
  "REMIND",
  "PROFILE",
  "APPLOCK",
  "SOS",
  "SOS1",
  "SOS2",
  "SOS3",
  "auto send call on",
  "heart"
];

Date.prototype.today = function() {
  return (
    (this.getDate() < 10 ? "0" : "") +
    this.getDate() +
    "/" +
    (this.getMonth() + 1 < 10 ? "0" : "") +
    (this.getMonth() + 1) +
    "/" +
    this.getFullYear()
  );
};

// For the time now
Date.prototype.timeNow = function() {
  return (
    (this.getHours() < 10 ? "0" : "") +
    this.getHours() +
    ":" +
    (this.getMinutes() < 10 ? "0" : "") +
    this.getMinutes() +
    ":" +
    (this.getSeconds() < 10 ? "0" : "") +
    this.getSeconds()
  );
};

// Start a TCP Server
net
  .createServer(function(socket) {
    // Put this new client in the list
    clients.push(socket);

    socket.id = Math.floor(1000 + Math.random() * 9000);

    // Send a nice welcome message and announce
    // socket.write("You are connected\n")
    console.log("==============================");
    console.log(
      "(" +
        new Date().today() +
        " " +
        new Date().timeNow() +
        ") " +
        "Client Joined " +
        socket.id
    );
    console.log("Number of Client: " + clients.length + "\n");

    // Handle incoming messages from clients.
    socket.on("data", function(data) {
    	dataArr = data.toString().split("*");
    	info = dataArr[3];
      infoArr = info.split(",");
      code = infoArr[0];

      if (code === "TK") {
      // Message is a voice chat
				console.log(
					"(" +
						new Date().today() +
						" " +
						new Date().timeNow() +
						") " +
						socket.id +
						" >>> HEX data: " + 
						data.toString("hex")
				);
      } else {      
      // normal message
				console.log(
					"(" +
						new Date().today() +
						" " +
						new Date().timeNow() +
						") " +
						socket.id +
						" >>> " +
						data.toString()
				);
			}

      if (data.toString().startsWith("pm")) {
        pm(data.toString());
      } else {
        dataArr = data.toString().split(/\[(.*?)\]/);
        dataArr.forEach(function(splitData) {
          dataprocess(splitData);
        });
        // broadcast(data.toString(), socket);
        // console.log("HEX data: " + data.toString("hex"));
      }
    });

    // Remove the client from the list when it leaves
    socket.on("end", function() {
      // better way handling client
      removeFromClients(socket.id);
      console.log(
        "(" +
          new Date().today() +
          " " +
          new Date().timeNow() +
          ") " +
          "Client left " +
          socket.id +
          "\n"
      );
      socket.destroy();
    });

    socket.on("error", function(ex) {
      removeFromClients(socket.id);
      console.log(
        "(" +
          new Date().today() +
          " " +
          new Date().timeNow() +
          ") " +
          "Client Error " +
          socket.id +
          "\n"
      );
      socket.destroy();
    });

    // Send a message to all clients
    function broadcast(message) {
      clients.forEach(function(client) {
        // Don't want to send it to sender
        if (client === socket) return;
        client.write(message);
      });
    }

    // Send a message to all clients
    function pm(message) {
      var send = 0;
      var message = message.trim();
      var msArr = message.split("|");
      var receiver = msArr[1];
      var body = msArr[2];
      var code = msArr[3];

      var receiverSocket = null;

      clients.forEach(function(client) {
        if (client.device === receiver) {
          client.write(body);
          console.log(
            "(" +
              new Date().today() +
              " " +
              new Date().timeNow() +
              ") " +
              "Message Send to " +
              client.id +
              " - " +
              body +
              "\n"
          );
          send = 1;
          client.promise = code;
          promiseTimeout(client);
        }
      });

      if (send) {
        socket.write(
          "(" +
            new Date().today() +
            " " +
            new Date().timeNow() +
            ") " +
            "Message send"
        );
        sendPromise(receiver, code, "send");
      } else {
        socket.write(
          "(" +
            new Date().today() +
            " " +
            new Date().timeNow() +
            ") " +
            "Device currently not connected"
        );
        sendPromise(receiver, code, "offline");
      }
    }

    function removeFromClients(socketid) {
      clients = clients.filter(function(el) {
        return el.id !== socketid;
      });
    }

    function promiseTimeout(client) {
      setInterval(function() {
        if (client.promise) {
          socket.write(
            "(" +
              new Date().today() +
              " " +
              new Date().timeNow() +
              ") " +
              "Device connected but not reply on time"
          );
          sendPromise(client.device, client.promise, "offline");
          client.promise = null;
        }
      }, 60000);
    }

    function dataprocess(message) {
      // check if data is form device
      if (message.startsWith("3G*")) {
        message = message.trim();

        msArr = message.split("*");
        setDeviceID(msArr[1]);
        var info = msArr[3];
        var infoArr = info.split(",");
        var code = infoArr[0];

        // check if there is a data to send
        if (infoArr.length > 1) {
          sendUpdate(info);
        }
        // reply to device to keep alive
        if (socket.promise == code) {
          // promise resolve device will send data
          sendPromise(socket.device, code, "promise");
          socket.promise = null;
        } else {
          if (noReply.indexOf(code) == -1) {
            socket.write(
              "[3G*" +
                socket.device +
                "*" +
                decimalToHex(code.length, 4) +
                "*" +
                code +
                "]"
            );
          }
        }
      }
    }

    function hex2bin(hex) {
      return parseInt(hex, 16).toString(2).padStart(16, "0");
    }

    function terminalprocess(terminalstats) {
      var hi = terminalstats.substr(0, 4);
      var lo = terminalstats.substr(4, 4);
      var term = hex2bin(hi) + hex2bin(lo);
      var termstats = term.split("");
      var ts = termstats.reverse();
      var res = "";
      if (ts[0] == 1) res = res + "Low Batt State, ";
      if (ts[1] == 1) res = res + "Out Of Fence State, ";
      if (ts[2] == 1) res = res + "Into Fence State, ";
      if (ts[3] == 1) res = res + "Watch Removed State, ";
      if (ts[16] == 1) res = res + "SOS Alert, ";
      if (ts[17] == 1) res = res + "Low Batt Alert, ";
      if (ts[18] == 1) res = res + "Out Of Fence Alert, ";
      if (ts[19] == 1) res = res + "Into Fence Alert, ";
      if (ts[20] == 1) res = res + "Watch Removed Alert, ";
      return res;
    }

    function sendPromise(device_id, code, status) {
      post_data = querystring.stringify({
        device_id: device_id,
        code: code,
        status: status
      });

      var post_options = {
        host: vhost,
        port: "8000",
        path: "/api/promise",
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Content-Length": Buffer.byteLength(post_data)
        }
      };

      httpRequest(post_options, post_data);
    }

    function sendUpdate(info) {
      infoArr = info.split(",");

      code = infoArr[0];

      if (code === "CONFIG" || code === "ICCID") {
        return 0;
      }

      lat = infoArr[4];
      lng = infoArr[6];
      terminal = infoArr[16];

      if (terminal) {
        console.log("terminal status (" + terminal + "): " + terminalprocess(terminal));
      }

      if (infoArr[13]) {
        bat = infoArr[13];
      } else {
        bat = infoArr[3];
      }

      console.log("device: " + socket.device);
      if (lat != undefined && lng != undefined) {
        console.log("lat: " + lat + " lng: " + lng);
      }
      console.log("battery: " + bat);

      post_data = querystring.stringify({
        device_id: socket.device,
        data: info
      });

      var post_options = {
        host: vhost,
        port: "8000",
        path: "/api/updatedevice",
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Content-Length": Buffer.byteLength(post_data)
        }
      };

      httpRequest(post_options, post_data);
    }

    function httpRequest(post_options, post_data) {
      const req = http.request(post_options, res => {
        console.log(`Server Update STATUS: ${res.statusCode}`);
        // console.log(`HEADERS: ${JSON.stringify(res.headers)}`);
        res.setEncoding("utf8");
        if (res.statusCode == 200) {
          res.on("data", chunk => {
            console.log(
              "(" +
                new Date().today() +
                " " +
                new Date().timeNow() +
                ") " +
                `BODY: ${chunk}`
            );
          });
        }
        res.on("end", () => {
          console.log("No more data in response.");
        });
      });

      req.on("error", e => {
        console.error(`problem with request: ${e.message}`);
      });

      // write data to request body
      req.write(post_data);
      req.end();
    }

    function decimalToHex(d, padding) {
      var hex = Number(d).toString(16);
      padding =
        typeof padding === "undefined" || padding === null
          ? (padding = 2)
          : padding;

      while (hex.length < padding) {
        hex = "0" + hex;
      }

      return hex;
    }

    function setDeviceID(deviceid) {
      // check if client deviceid is empty
      if (!socket.hasOwnProperty("device")) {
        // check if client have similar device id - destroy that client
        clients.forEach(function(client) {
          if (client.device === deviceid) {
            removeFromClients(client.id);
            client.destroy();
            console.log("socket duplicate - destroy");
          }
        });
        socket.device = deviceid;
      }
    }
  })
  .listen(8001);

// Put a friendly message on the terminal of the server.
console.log("Tracking server running at port 8001\n");
