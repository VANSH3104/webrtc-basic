import React, { useState } from "react";
import { Sender } from "./sender";
import { Receiver } from "./receivers";

export const Room: React.FC = () => {
  const [meetingId, setMeetingId] = useState<string>("");
  const [passcode, setPasscode] = useState<string>("");
  const [role, setRole] = useState<"sender" | "receiver" | null>(null);
  const [isMeetingCreated, setMeetingCreated] = useState<boolean>(false);
  const ws = new WebSocket("ws://localhost:8080");

  const createMeeting = () => {
    const id = Math.random().toString(36).substr(2, 8); // Generate unique meeting ID
    setMeetingId(id);
    const code = Math.random().toString(36).substr(2, 5); // Generate random passcode
    setPasscode(code);

    ws.send(
      JSON.stringify({
        type: "createMeeting",
        meetingId: id,
        passcode: code,
      })
    );
    setMeetingCreated(true);
  };

  const joinMeeting = (role: "sender" | "receiver") => {
    ws.send(
      JSON.stringify({
        type: "joinMeeting",
        meetingId,
        passcode,
        role,
      })
    );
    setRole(role);
  };

  return (
    <div>
      {!isMeetingCreated && (
        <>
          <button onClick={createMeeting}>Create Meeting</button>
          <br />
        </>
      )}

      {isMeetingCreated && !role && (
        <div>
          <h2>Meeting Created</h2>
          <p>Meeting ID: {meetingId}</p>
          <p>Passcode: {passcode}</p>
          <button onClick={() => joinMeeting("sender")}>Join as Sender</button>
          <button onClick={() => joinMeeting("receiver")}>Join as Receiver</button>
        </div>
      )}

      {role === "sender" && <Sender meetingId={meetingId} passcode={passcode} />}
      {role === "receiver" && <Receiver meetingId={meetingId} passcode={passcode} />}
    </div>
  );
};
