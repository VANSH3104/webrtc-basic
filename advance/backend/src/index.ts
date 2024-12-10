import { WebSocketServer } from "ws";

const server = new WebSocketServer({ port: 3000 });
let clients: any[] = [];
let meetingId : any[] = [];
server.on("connection", (socket: any) => {
  // Assign a unique ID for each client
  const clientId = generateUniqueId();
  clients.push({ id: clientId, socket });

  // Notify all clients about the new connection
  broadcast({ type: "new-connection", clientId });

  socket.on("message", (data: any) => {
    const message = JSON.parse(data);
    const { type } = message;

    switch (type) {
      case "create-meeting":
        createMeeting(message);
      case "join-meeting":
        joinMeeting(message, clientId);
      case "chat":
        broadcast({ type: "chat", message: message.content, clientId }, clientId);
        console.log("chatting started");
        break;

      case "ice-candidate":
        broadcast(message, clientId);
        console.log("ICE candidate transferred");
        break;

      case "leave":
        handleClientLeave(clientId, socket);
        break;
    }
  });

  socket.on("close", () => {
    handleClientLeave(clientId, socket);
  });
});

function handleClientLeave(clientId: string, socket: any) {
  clients = clients.filter(client => client.id !== clientId);
  broadcast({ type: "client-left", clientId });
  if (socket.readyState === socket.OPEN) {
    socket.close(1000, "Client voluntarily left");
  }

  console.log(`Client ${clientId} has left.`);
}
function createMeeting(message:{type: string , code: string}){
    meetingId.push(message.code)
}
function joinMeeting(message:{type:string, code: string}, clientId:string){
    if(message.code){
        meetingId.filter((e)=>{
            if(e.code === message.code){
                broadcast({type: "meeting-joined" , clientId})
            }
        })
    }
}
function broadcast(message: { type: string; clientId: string; message?: any }, senderId?: string) {
  clients.forEach(client => {   
    if (client.id !== senderId) {
      client.socket.send(JSON.stringify(message));
    }
  });
}

function generateUniqueId() {
  return Math.random().toString(36).substr(2, 9);
}
