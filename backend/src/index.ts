import WebSocket, { WebSocketServer } from "ws";
const wss = new WebSocketServer({port:8080})
let senderSocket:null | WebSocket =null  
let receiverSocket: null | WebSocket= null; 
wss.on('connection', function connection(ws){
    console.log("connection on")
    ws.on("error", console.error)
    ws.on('message', function message(data:any){
        const message = JSON.parse(data)
        if(message.type === "sender"){
            console.log("type == sender")
            senderSocket = ws;
        }
        else if (message.type === "receiver"){
            console.log("type == receiver")
            receiverSocket = ws;
        }
        else if(message.type === 'createuser'){
            console.log("type == create")
            if(ws != senderSocket){
                return;
            }
            receiverSocket?.send(JSON.stringify({type: 'createOffer', sdp: message.sdp}));}
            else if(message.type === "createAnswer"){
                if(ws != receiverSocket){
                    return;
                }
                senderSocket?.send(JSON.stringify({type: 'createAnswer', sdp: message.sdp}))
            }
            else if(message.type === "iceCandidate"){
                console.log("icecandidate send")
                if(ws == senderSocket){
                    receiverSocket?.send(JSON.stringify({type: 'iceCandidate', candidate: message.candidate}))
                } else if(ws == receiverSocket){
                    senderSocket?.send(JSON.stringify({type: 'iceCandidate', candidate: message.candidate}))
                }
            }
            ws.on('close', ()=>{
                if(ws===senderSocket){senderSocket = null}
                if(ws ===receiverSocket){receiverSocket = null}
            })
    })
    ws.send('something')
})