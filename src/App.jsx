import { Routes, Route } from "react-router-dom";
import ScrollToTop from "./components/common/ScrollToTop";
import Layout from "./components/layout/Layout";
import ToastProvider from "./components/ui/ToastProvider";
import Analytics from "./pages/Analytics";
import DesignSystem from "./pages/DesignSystem";
import Explore from "./pages/Explore";
import Home from "./pages/Home";
import MockTests from "./pages/MockTests";
import NotFound from "./pages/NotFound";
import Practice from "./pages/Practice";
import Pricing from "./pages/Pricing";
import ResourceDetails from "./pages/ResourceDetails";

export default function App() {
  return (
    <ToastProvider>
      <ScrollToTop />
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/explore" element={<Explore />} />
          <Route path="/resource/:id" element={<ResourceDetails />} />
          <Route path="/practice" element={<Practice />} />
          <Route path="/mock-tests" element={<MockTests />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/design" element={<DesignSystem />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </ToastProvider>
  );
}
