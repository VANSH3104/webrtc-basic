import { Sender } from './Sender';
import { Receiver } from './Receiver';

export const MainFile= () => {
  return (
    <div>
      <h1>WebRTC Video Chat</h1>
      <Sender />
      <Receiver />
    </div>
  );
};

export default MainFile;
