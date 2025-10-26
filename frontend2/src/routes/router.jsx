// router.jsx or routes.jsx
import { createBrowserRouter } from "react-router-dom";
import App from "../App.jsx";
import Uploaddoc from "../pages/Uploaddoc.jsx";
import HomePage from "../pages/Homepage.jsx";
import Verification from "../pages/VerificationPage.jsx";
import OtpVerification from "../pages/Otpverification.jsx";

const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      { index: true, element: <HomePage /> },
      { path: "register", element: <Uploaddoc /> },
      { path: "verification", element: <Verification /> },
      { path: "verification/Otpverification", element: <OtpVerification /> },
    ],
  },
]);

export default router;
