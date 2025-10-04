import { Box } from "@mui/material";
import Lottie from "react-lottie";
import TableLoadingIndicator from "../../assets/tableLoadingIndicator.json";

const defaultOptions = {
  loop: true,
  autoplay: true,
  animationData: TableLoadingIndicator,
  rendererSettings: {
    preserveAspectRatio: "xMidYMid slice",
  },
};

const LoadingIndicator = ({ height = 250, width = 250 }) => (
  <Box
    sx={{
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      height: "100%",
    }}
  >
    <Lottie options={defaultOptions} height={height} width={width} />
  </Box>
);

export default LoadingIndicator;
