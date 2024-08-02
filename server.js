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
expressServer.listen(8181, "0.0.0.0");

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

  socket.on("newAnswer", (offerObj, ackFunction) => {
    console.log("new Answer", offerObj);
    // Emit this answer (offerObj) back to CLIENT1
    // in order to that we need CLIENT1'a socket id
    const socketToAnswer = connectedSockets.find(
      (s) => s.userName === offerObj.offererUserName
    );
    if (!socketToAnswer) {
      console.log("No matching socket");
      return;
    }
    // We found the matching socket, so we can emit to it!
    const socketIdToAnswer = socketToAnswer.socketId;
    const offerToUpdate = offers.find(
      (o) => o.offererUserName === offerObj.offererUserName
    );
    if (!offerToUpdate) {
      console.log("No socket to update");
      return;
    }
    // send back to answerer all the iceCandidates we have already collected
    ackFunction(offerToUpdate.offerIceCandidates);
    offerToUpdate.answer = offerObj.answer;
    offerToUpdate.answererUserName = userName;
    // socket has a .to() method which allows emiting to a "room"
    // every socket has it's own room
    socket.to(socketIdToAnswer).emit("answerResponse", offerToUpdate);
  });

  socket.on("sendIceCandidateToSignalingServer", (iceCandiateObj) => {
    const { didIOffer, iceUserName, iceCandidate } = iceCandiateObj;
    if (didIOffer) {
      const offerInOffers = offers.find(
        (o) => o.offererUserName === iceUserName
      );
      if (offerInOffers) {
        // this ice is coming from the offerer. Send to the answerer
        offerInOffers.offerIceCandidates.push(iceCandidate);
        // 1.When the answerer answers, all the existing ICE candidates are sent
        // 2.Any candidates that come in after the offer has been answered, will be passed through
        if (offerInOffers.answererUserName) {
          // pass it through to the other socket
          const socketToSendTo = connectedSockets.find(
            (s) => s.userName === offerInOffers.answererUserName
          );
          if (socketToSendTo) {
            socket
              .to(socketToSendTo.socketId)
              .emit("receviedIceCandidateFromServer", iceCandidate);
          } else {
            console.log("Ice candidate recevied but could not find answerer");
          }
        }
      } else {
        // this ice is coming from the answerer. Send to the offerer
        // pass it through to the other socket
        const offerInOffers = offers.find(
          (o) => o.answererUserName === iceUserName
        );
        const socketToSendTo = connectedSockets.find(
          (s) => s.userName === offerInOffers.offererUserName
        );
        if (socketToSendTo) {
          socket
            .to(socketToSendTo.socketId)
            .emit("receviedIceCandidateFromServer", iceCandidate);
        } else {
          console.log("Ice candidate recevied but could not find offerer");
        }
      }
    }
  });
});
