import { lazy, Suspense } from "react";
import { Navigate, Routes, Route } from "react-router-dom";
import ScrollToTop from "./components/common/ScrollToTop";
import Layout from "./components/layout/Layout";
import AuthProvider from "./components/auth/AuthProvider";
import ToastProvider from "./components/ui/ToastProvider";
import Account from "./pages/Account";
import Home from "./pages/Home";
import NotFound from "./pages/NotFound";
import Pricing from "./pages/Pricing";
import Library from "./pages/Library";
import NoteDetails from "./pages/NoteDetails";
import Notes from "./pages/Notes";
import Policies from "./pages/Policies";
import ResetPassword from "./pages/ResetPassword";

// The reader (PDF.js) and the admin area are only downloaded when someone opens them.
const Reader = lazy(() => import("./pages/Reader"));
const AdminApp = lazy(() => import("./pages/admin/AdminApp"));

const Loading = () => (
  <div role="status" className="grid min-h-[60vh] place-items-center text-ink-600">
    Loading…
  </div>
);

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
      <ScrollToTop />
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <Suspense fallback={<Loading />}>
      <Routes>
        <Route path="/read/:slug" element={<Reader />} />
        <Route path="/admin/*" element={<AdminApp />} />
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          {/* Old addresses from the earlier site now lead to the notes store. */}
          {["/explore", "/practice", "/mock-tests", "/analytics"].map((path) => (
            <Route key={path} path={path} element={<Navigate to="/notes" replace />} />
          ))}
          <Route path="/resource/:id" element={<Navigate to="/notes" replace />} />
          <Route path="/notes" element={<Notes />} />
          <Route path="/notes/:slug" element={<NoteDetails />} />
          <Route path="/library" element={<Library />} />
          <Route path="/policies" element={<Policies />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/account" element={<Account />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
      </Suspense>
      </AuthProvider>
    </ToastProvider>
  );
}
