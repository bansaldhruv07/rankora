import { Routes, Route } from 'react-router-dom'
import ScrollToTop from './components/common/ScrollToTop'
import Layout from './components/layout/Layout'
import ToastProvider from './components/ui/ToastProvider'
import ComingSoon from './pages/ComingSoon'
import DesignSystem from './pages/DesignSystem'
import Explore from './pages/Explore'
import Home from './pages/Home'
import MockTests from './pages/MockTests'
import Practice from './pages/Practice'
import ResourceDetails from './pages/ResourceDetails'

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
          <Route path="/analytics" element={<ComingSoon title="Analytics" />} />
          <Route path="/pricing" element={<ComingSoon title="Pricing" />} />
          <Route path="/design" element={<DesignSystem />} />
          <Route path="*" element={<ComingSoon title="Page not found" />} />
        </Route>
      </Routes>
    </ToastProvider>
  )
}