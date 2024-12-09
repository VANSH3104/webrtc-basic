"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ws_1 = require("ws");
let senderSocket = null;
let receiverSocket = [];
const wss = new ws_1.WebSocketServer({ port: 8080 });
wss.on('connection', function connection(ws) {
    ws.on("message", function message(data) {
        const message = JSON.parse(data);
        if (message.type === "sender") {
            senderSocket = ws;
            console.log("sender set");
        }
        else if (message.type === "receiver") {
            receiverSocket.push(ws);
            console.log("receiver set", receiverSocket);
        }
        else if (message.type === "createOffer") {
            receiverSocket.forEach((receiver) => { receiver.send(JSON.stringify({ type: "createOffer", sdp: message.sdp })); });
            console.log("offer create");
        }
        else if (message.type === "createAnswer") {
            senderSocket === null || senderSocket === void 0 ? void 0 : senderSocket.send(JSON.stringify({ type: "createAnswer", sdp: message.sdp }));
            console.log("answer create");
        }
        else if (message.type === "iceCandidate") {
            if (ws === senderSocket) {
                receiverSocket.forEach((receiver) => { receiver.send(JSON.stringify({ type: "iceCandidate", candidate: message.candidate })); });
            }
            else {
                senderSocket === null || senderSocket === void 0 ? void 0 : senderSocket.send(JSON.stringify({ type: "iceCandidate", candidate: message.candidate }));
            }
        }
        console.log(message);
    });
});
