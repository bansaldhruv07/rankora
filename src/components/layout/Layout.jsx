import { Outlet } from 'react-router-dom'
import Navbar from './Navbar'
import OfferBanner from './OfferBanner'
import Footer from './Footer'
import ScrollProgress from './ScrollProgress'
import WhatsAppFloat from './WhatsAppFloat'

export default function Layout() {
  return (
    <div className="flex min-h-screen flex-col">
      <ScrollProgress />
      <OfferBanner />
      <Navbar />
      <main id="main" className="flex-1">
        <Outlet />
      </main>
      <Footer />
      <WhatsAppFloat />
    </div>
  )
}
