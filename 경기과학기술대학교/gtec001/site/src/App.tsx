import { useEffect } from "react";
import { Navigate, Route, Routes, useLocation, useParams } from "react-router-dom";
import { Layout } from "./components/Layout";
import HomePage from "./pages/HomePage";
import ArtistsPage from "./pages/ArtistsPage";
import ArtistPage from "./pages/ArtistPage";
import AboutPage from "./pages/AboutPage";
import QRPage from "./pages/QRPage";
import GalleryPage from "./pages/GalleryPage";
import IntroPage from "./pages/IntroPage";
import PhotoPage from "./pages/PhotoPage";
import GuestbookPage from "./pages/GuestbookPage";

function ScrollTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo({ top: 0 }); }, [pathname]);
  return null;
}
// 부스 QR 은 /booth/:id 로 찍힌다 → 3D 전시장의 해당 부스로 바로 입장
function BoothRedirect() { const { id } = useParams(); return <Navigate to={`/gallery?booth=${id}`} replace />; }

export default function App() {
  const { pathname } = useLocation();
  const bare = pathname.startsWith("/gallery") || pathname.startsWith("/intro") || pathname.startsWith("/qr");
  const routes = (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/gallery" element={<GalleryPage />} />
      <Route path="/booth/:id" element={<BoothRedirect />} />
      <Route path="/intro" element={<IntroPage />} />
      <Route path="/artists" element={<ArtistsPage />} />
      <Route path="/artists/:id" element={<ArtistPage />} />
      <Route path="/a/:id" element={<ArtistPage />} />
      <Route path="/about" element={<AboutPage />} />
      <Route path="/qr" element={<QRPage />} />
      <Route path="/photo" element={<PhotoPage />} />
      <Route path="/guestbook" element={<GuestbookPage />} />
      <Route path="*" element={<HomePage />} />
    </Routes>
  );
  return bare ? routes : <Layout><ScrollTop />{routes}</Layout>;
}
