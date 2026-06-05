import { SignIn } from "@clerk/nextjs";

export default function Page() {
  return <div className="auth"><SignIn /></div>;
}
