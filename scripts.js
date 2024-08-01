const userName = "MJ - " + Math.floor(Math.random() * 1000000);
const password = "Z";
document.querySelector("#user-name").innerHTML = userName;
const socket = io.connect("https://192.168.1.12:8181", {
  auth: {
    userName,
    password,
  },
});

const localVideoEl = document.querySelector("#local-video");
const remoteVideoEl = document.querySelector("#remote-video");

let localStream;
let remoteStream;
let peerConnection;
let didIOffer = false;

let peerConfiguration = {
  iceServers: [
    {
      urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"],
    },
  ],
};

const call = async (e) => {
  await fetchUserMedia();

  await createPeerConnection();

  // Crate offer
  try {
    console.log("Creating offer...");
    const offer = await peerConnection.createOffer();
    console.log(offer);
    peerConnection.setLocalDescription(offer);
    didIOffer = true;
    socket.emit("newOffer", offer);
  } catch (err) {
    console.log(err);
  }
};

const answerOffer = async (offerObj) => {
  await fetchUserMedia();
  await createPeerConnection(offerObj);
  const answer = await peerConnection.createAnswer();
  peerConnection.setLocalDescription(answer); // This is CLIENT2 and CLIENT2 uses the answer as localDescription
  // Add the answer to offerObj so the server knows which answer this is related to
  offerObj.answer = answer;
  console.log("answer Offer", offerObj);
  // Emit the answer to signaling server, so it can emit to CLIENT1
  socket.emit("newAnswer", offerObj);
};

const addAnswer = async (offerObj) => {
  // addAnswer is called in socketListeners when an answerRespose is emittied
  // at this point, the offer and the answer have been exchaned!
  // now CLIENT1 needs to set remoteDescription
  await peerConnection.setRemoteDescription(offerObj.answer);
};

const fetchUserMedia = () => {
  return new Promise(async (resolve, reject) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      localVideoEl.srcObject = stream;
      localStream = stream;
      resolve();
    } catch (err) {
      console.log(err);
      reject();
    }
  });
};

const createPeerConnection = (offerObj) => {
  return new Promise(async (resolve, reject) => {
    peerConnection = await new RTCPeerConnection(peerConfiguration);

    localStream.getTracks().forEach((track) => {
      peerConnection.addTrack(track, localStream);
    });

    peerConnection.addEventListener("signalingstatechange", (event) => {
      console.log(event);
    });

    peerConnection.addEventListener("icecandidate", (e) => {
      console.log("....................Ice candidate found!..................");
      console.log(e);
      if (e.candidate) {
        socket.emit("sendIceCandidateToSignalingServer", {
          iceCandidate: e.candidate,
          iceUserName: userName,
          didIOffer,
        });
      }
    });
    if (offerObj) {
      peerConnection.setRemoteDescription(offerObj.offer);
    }
    resolve();
  });
};

document.querySelector("#call").addEventListener("click", call);
