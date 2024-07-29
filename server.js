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
expressServer.listen(8181, "192.168.1.102");

const offers = [];
const connectedSockets = [];

io.on("connection", (socket) => {
  const userName = socket.handshake.auth.userName;
  const password = socket.handshake.auth.password;
  console.log(`${userName} has connected`);

  if (password !== "Z") {
    socket.disconnect(true);
    return;
  }

  connectedSockets.push({
    socketId: socket.id,
    userName,
  });

  if (offers.length) {
    socket.emit("availableOffers", offers);
  }

  socket.on("newOffer", (newOffer) => {
    offers.push({
      offererUserName: userName,
      offer: newOffer,
      offerIceCandidates: [],
      answererUserName: null,
      answer: null,
      answererIceCandidates: [],
    });

    socket.broadcast.emit("newOfferAwaiting", offers.slice(-1));
  });

  socket.on("sendIceCandidateToSignalingServer", (iceCandiateObj) => {
    const { didIOffer, iceUserName, iceCandidate } = iceCandiateObj;
    if (didIOffer) {
      const offerInOffers = offers.find(
        (o) => o.offererUserName === iceUserName
      );
      if (offerInOffers) {
        offerInOffers.offerIceCandidates.push(iceCandidate);
      }
    }
  });
});
