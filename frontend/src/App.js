import React, { useEffect } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import AOS from "aos";
import { Toaster } from "sonner";
import { HelmetProvider } from "react-helmet-async";

import { AuthProvider } from "@/context/AuthContext";
import { I18nProvider } from "@/context/I18nContext";

import Header from "@/components/Header";
import Footer from "@/components/Footer";

import Home from "@/pages/Home";
import ThemePreview from "@/pages/ThemePreview";
import About from "@/pages/About";
import Services from "@/pages/Services";
import Enquiry from "@/pages/Enquiry";
import Contact from "@/pages/Contact";
import FAQ from "@/pages/FAQ";
import Downloads from "@/pages/Downloads";
import Notices from "@/pages/Notices";
import Gallery from "@/pages/Gallery";
import Vacancies from "@/pages/Vacancies";
import VacancyDetail from "@/pages/VacancyDetail";
import Blogs from "@/pages/Blogs";
import BlogDetail from "@/pages/BlogDetail";

// Admin panel — hidden from public nav. Routes protected by AdminLayout which
// checks for the admin JWT in localStorage and redirects to /admin/login.
import AdminLayout from "@/pages/admin/AdminLayout";
import AdminLogin from "@/pages/admin/AdminLogin";
import AdminHome from "@/pages/admin/AdminHome";
import AdminSite from "@/pages/admin/AdminSite";
import AdminSEO from "@/pages/admin/AdminSEO";
import AdminContent from "@/pages/admin/AdminContent";
import AdminVacancies from "@/pages/admin/AdminVacancies";
import AdminJobSEO from "@/pages/admin/AdminJobSEO";
import AdminBlogs from "@/pages/admin/AdminBlogs";
import AdminResumes from "@/pages/admin/AdminResumes";
import AdminIntegrations from "@/pages/admin/AdminIntegrations";
import AdminSlides from "@/pages/admin/AdminSlides";
import AdminReviews from "@/pages/admin/AdminReviews";
import AdminSearchAnalytics from "@/pages/admin/AdminSearchAnalytics";
import SeoHead from "@/components/SeoHead";
import { ThemeProvider } from "@/context/ThemeContext";

const ScrollToTop = () => {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
};

function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<Vacancies />} />
      <Route path="/theme-preview" element={<ThemePreview />} />
      <Route path="/solar" element={<Home />} />
      <Route path="/about" element={<About />} />
      <Route path="/services" element={<Services />} />
      <Route path="/enquiry" element={<Enquiry />} />
      <Route path="/solar/apply" element={<Navigate to="/enquiry" replace />} />
      <Route path="/loan/apply" element={<Navigate to="/enquiry?service=Solar%20Financing%20Information" replace />} />
      <Route path="/csc" element={<Navigate to="/services" replace />} />
      <Route path="/csc/apply" element={<Navigate to="/enquiry" replace />} />
      <Route path="/irrigation" element={<Navigate to="/services" replace />} />
      <Route path="/irrigation/apply" element={<Navigate to="/enquiry" replace />} />
      <Route path="/vacancies" element={<Navigate to="/" replace />} />
      <Route path="/vacancies/:id" element={<VacancyDetail />} />
      <Route path="/blogs" element={<Blogs />} />
      <Route path="/blogs/:slug" element={<BlogDetail />} />
      <Route path="/gallery" element={<Gallery />} />
      <Route path="/notices" element={<Notices />} />
      <Route path="/downloads" element={<Downloads />} />
      <Route path="/faq" element={<FAQ />} />
      <Route path="/contact" element={<Contact />} />
      <Route path="/login" element={<Navigate to="/enquiry" replace />} />
      <Route path="/register" element={<Navigate to="/enquiry" replace />} />
      <Route path="/dashboard" element={<Navigate to="/" replace />} />
      <Route path="/status" element={<Navigate to="/contact" replace />} />

      {/* ─── Admin panel (hidden from public nav) ─── */}
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<AdminHome />} />
        <Route path="seo" element={<AdminSEO />} />
        <Route path="content" element={<AdminContent />} />
        <Route path="vacancies" element={<AdminVacancies />} />
        <Route path="job-seo" element={<AdminJobSEO />} />
        <Route path="blogs" element={<AdminBlogs />} />
        <Route path="resumes" element={<AdminResumes />} />
        <Route path="integrations" element={<AdminIntegrations />} />
        <Route path="site" element={<AdminSite />} />
        <Route path="slides" element={<AdminSlides />} />
        <Route path="reviews" element={<AdminReviews />} />
        <Route path="search-analytics" element={<AdminSearchAnalytics />} />
      </Route>

      <Route path="*" element={
        <div className="max-w-3xl mx-auto px-4 py-20 text-center">
          <h1 className="font-display text-6xl font-extrabold text-emerald-400">404</h1>
          <p className="text-slate-400 mt-3">Page not found</p>
        </div>
      } />
    </Routes>
  );
}

function ChromeWrap({ children }) {
  const { pathname } = useLocation();
  const isAdmin = pathname.startsWith("/admin");
  return (
    <>
      {!isAdmin && <Header />}
      <main className="flex-1">{children}</main>
      {!isAdmin && <Footer />}
    </>
  );
}

function AppInner() {
  useEffect(() => {
    AOS.init({ duration: 700, once: true, offset: 60, easing: "ease-out-cubic" });
  }, []);
  return (
    <div className="App">
      <BrowserRouter>
        <ScrollToTop />
        <SeoHead />
        <ChromeWrap>
          <AppRouter />
        </ChromeWrap>
      </BrowserRouter>
      <Toaster richColors position="top-right" theme="dark" />
    </div>
  );
}

function App() {
  return (
    <HelmetProvider>
      <I18nProvider>
        <AuthProvider>
          <ThemeProvider>
            <AppInner />
          </ThemeProvider>
        </AuthProvider>
      </I18nProvider>
    </HelmetProvider>
  );
}

export default App;
