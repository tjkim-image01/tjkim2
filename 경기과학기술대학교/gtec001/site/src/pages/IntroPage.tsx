import { useNavigate } from "react-router-dom";
import { Intro } from "../components/Intro";

export default function IntroPage() {
  const nav = useNavigate();
  return <Intro onDone={() => nav("/gallery?skipintro=1")} />;
}
