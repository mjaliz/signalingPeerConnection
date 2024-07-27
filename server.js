const fs = require("fs");
const https = require("https");
const socketio = require("socket.io");
const express = require("express");
const app = express();
app.use(express.static(__dirname));

const key = fs.readFileSync("cert.key");
const cert = fs.readFileSync("cert.crt");

const expressServer = https.createServer({ key, cert }, app);
const io = socketio(expressServer);
expressServer.listen(8181);

io.on("connection", (socket) => {
  console.log("Someone has connected");
});
