import { spread } from "axios";
import WebSocket, { WebSocketServer } from "ws";
let senderSocket: null | WebSocket = null;
let receiverSocket: null | WebSocket = null;
const wss = new WebSocketServer({port:8080})
wss.on('connection', function connection(ws){
   ws.on("message" , function message(data:any){
    const message = JSON.parse(data)
    if(message.type === "sender"){
        senderSocket= ws
    }
    else if(message.type === "receiver"){
        receiverSocket = ws;
    }
    else if (message.type === "createOffer"){
        receiverSocket?.send(JSON.stringify({type: "createOffer" , sdp: message.sdp}))
    }
    else if(message.type === "createAnswer"){
        senderSocket?.send(JSON.stringify({type: "createAnswer" , sdp: message.sdp}))
    }
    else if(message.type === "iceCandidate"){
        if(ws === senderSocket){
            receiverSocket?.send(JSON.stringify({type: "iceCandidate" , candidate: message.candidate}))
        }
        else if (ws === receiverSocket){
            senderSocket?.send(JSON.stringify({type: "iceCandidate" , candidate: message.candidate}))
        }
    }
    //identify sender
    //identify receiver
    //create message
    //create answer
    //create ice candidate
    console.log(message)
   }) 
});