import { useState } from "react";
import { useNavigate } from "react-router-dom";

const Home: React.FC = () => {
  const [meetingCode, setMeetingCode] = useState<string>("");
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (meetingCode.trim()) {
      navigate(`/room/${meetingCode}`);
    }
  };

  return (
    <div style={{ padding: "20px" }}>
      <h1>Video Conferencing App</h1>
      <form onSubmit={handleSubmit}>
        <label>
          Meeting Code:
          <input
            type="text"
            value={meetingCode}
            onChange={(e) => setMeetingCode(e.target.value)}
            required
          />
        </label>
        <button type="submit">Join/Create Meeting</button>
      </form>
    </div>
  );
};

export default Home;
