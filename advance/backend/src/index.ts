import WebSocket, { WebSocketServer } from "ws";

let senderSocket: null | WebSocket = null;
let receiverSocket: WebSocket[] = [];

const wss = new WebSocketServer({ port: 8080 });
let id:string;
wss.on('connection', function connection(ws) {
    console.log("websocket is running...")
    ws.on("message", function message(data: any) {
        const message = JSON.parse(data);
        if (message.type === "sender" && message.meetId !="") {
            senderSocket = ws;
            console.log("sender set");
            id = message.meetId;
        } else if (message.type === "receiver" && message.meetId == id) {
            console.log(message.meetId , id , "id")
            receiverSocket.push(ws);
            console.log("receiver set");
            console.log(receiverSocket.length)
        }
    });
    // wss.on('connection', function connection(ws) {
    //     ws.on("message", function message(data: any) {
    //         const message = JSON.parse(data);
            
    //         if (message.type === "sender") {
    //             senderSocket = ws;
    //             console.log("sender set");
    //         } else if (message.type === "receiver") {
    //             receiverSocket.push(ws);
    //             console.log("receiver set" , receiverSocket);
    //         } else if (message.type === "createOffer") {
    //             receiverSocket.forEach((receiver)=>{receiver.send(JSON.stringify({ type: "createOffer", sdp: message.sdp }))});
    //             console.log("offer create");
    //         } else if (message.type === "createAnswer") {
    //             senderSocket?.send(JSON.stringify({ type: "createAnswer", sdp: message.sdp }));
    //             console.log("answer create");
    //         } else if (message.type === "iceCandidate") {
    //             if (ws === senderSocket) {
    //                 receiverSocket.forEach((receiver)=>{receiver.send(JSON.stringify({ type: "iceCandidate", candidate: message.candidate }));})
    //             } else {
    //                 senderSocket?.send(JSON.stringify({ type: "iceCandidate", candidate: message.candidate }));
    //             }
    //         }
});