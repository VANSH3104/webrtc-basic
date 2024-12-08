export interface Participant {
  id: string;
  name: string;
  role: "sender" | "receiver";
}

export interface Meeting {
  [x: string]: any;
  meeting: any;
  passcode: string;
  sender: WebSocket | null;
  receivers: WebSocket[];
}

export interface ClientMessage {
  type: string;
  meetingId: string;
  passcode?: string;
  senderName?: string;
  data?: any;
}

export interface ServerMessage {
  type: string;
  message?: string;
  participants?: Participant[];
}
