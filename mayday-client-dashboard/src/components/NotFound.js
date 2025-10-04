import Lottie from "react-lottie";
import Lottie404 from "../assets/404.json"; // Update with the actual path to your Lottie JSON file

const defaultOptions = {
  loop: true,
  autoplay: true,
  animationData: Lottie404,
  rendererSettings: {
    preserveAspectRatio: "xMidYMid slice",
  },
};

const NotFound = () => {
  return (
    <div style={{ textAlign: "center", marginTop: "40px" }}>
      <Lottie options={defaultOptions} height={400} width={400} />
      {/* <h1>Oops! Page not found.</h1> */}
      <h1>No integration done yet!</h1>
      <p>Please contact your administrator to enable integration.</p>
      {/* Include a link to navigate back to the home page or previous page */}
    </div>
  );
};

export default NotFound;
