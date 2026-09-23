import React from 'react';
import StarkEdgeLogo from './StarkEdgeLogo';
import { 
  MapPin, 
  Mail, 
  Phone, 
  ExternalLink, 
  MessageCircle, 
  Sparkles, 
  Globe
} from 'lucide-react';

export default function Footer() {
  return (
    <footer className="w-full text-slate-300 font-sans">
      {/* ===================================================
          1. OFFICE LOCATIONS SECTION (MATCHING REFERENCE 1)
      =================================================== */}
      <div className="bg-[#0A192F] py-14 px-4 sm:px-6 lg:px-8 border-t border-slate-800/80">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          
          {/* Left Column: Stacked Location Cards */}
          <div className="lg:col-span-7 space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/30 text-[#F7941D] text-xs font-bold uppercase tracking-wider mb-2">
              <MapPin className="w-3.5 h-3.5" />
              <span>Global Presence</span>
            </div>

            {/* India Office Card */}
            <div className="flex items-stretch rounded-2xl overflow-hidden shadow-lg border border-slate-700/60 group hover:border-orange-500/50 transition-all">
              <div className="bg-gradient-to-br from-[#F7941D] to-[#EE3124] text-white p-5 flex items-center justify-center shrink-0 w-16 sm:w-20">
                <MapPin className="w-7 h-7 group-hover:scale-110 transition-transform" />
              </div>
              <div className="bg-[#14263C] p-5 flex-1 text-xs sm:text-sm text-slate-200 font-medium leading-relaxed border-l border-slate-700/40">
                <div className="text-[10px] font-bold uppercase tracking-widest text-[#F7941D] mb-1">India Office</div>
                D 235 A, Near Hindustan Times, Industrial Area, Sector 74, Sahibzada Ajit Singh Nagar, Punjab 160074
              </div>
            </div>

            {/* USA Office Card */}
            <div className="flex items-stretch rounded-2xl overflow-hidden shadow-lg border border-slate-700/60 group hover:border-red-500/50 transition-all">
              <div className="bg-gradient-to-br from-[#EE3124] to-[#C81A12] text-white p-5 flex items-center justify-center shrink-0 w-16 sm:w-20">
                <MapPin className="w-7 h-7 group-hover:scale-110 transition-transform" />
              </div>
              <div className="bg-[#14263C] p-5 flex-1 text-xs sm:text-sm text-slate-200 font-medium leading-relaxed border-l border-slate-700/40">
                <div className="text-[10px] font-bold uppercase tracking-widest text-[#EE3124] mb-1">USA Office</div>
                350 Rhodes Island St, #240, Suite 233 San Francisco, CA 94103
              </div>
            </div>
          </div>

          {/* Right Column: Interactive Styled Map Preview */}
          <div className="lg:col-span-5">
            <div className="relative rounded-2xl overflow-hidden border border-slate-700/80 shadow-2xl h-56 bg-[#122238] flex items-center justify-center p-4 group">
              {/* Map background graphic overlay */}
              <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#F7941D_1px,transparent_1px)] [background-size:16px_16px]"></div>
              
              {/* Animated Location Pins */}
              <div className="relative z-10 w-full h-full flex flex-col justify-between p-4">
                <div className="flex items-center justify-between text-xs">
                  <span className="bg-white/10 backdrop-blur-md px-3 py-1 rounded-full text-slate-200 font-mono text-[11px] border border-white/20">
                    📍 SF, CA 94103
                  </span>
                  <span className="bg-white/10 backdrop-blur-md px-3 py-1 rounded-full text-slate-200 font-mono text-[11px] border border-white/20">
                    📍 Punjab 160074
                  </span>
                </div>

                <div className="text-center space-y-2">
                  <Globe className="w-10 h-10 text-[#F7941D] mx-auto animate-pulse" />
                  <p className="text-xs font-bold text-slate-300">
                    Serving Clients Worldwide Across 15+ Countries
                  </p>
                  <a
                    href="https://www.starkedge.com"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-[#F7941D] hover:underline"
                  >
                    <span>View Map Directions</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* ===================================================
          2. CTA BANNER SECTION (MATCHING REFERENCE 2 TOP)
      =================================================== */}
      <div className="bg-gradient-to-r from-[#F7941D] via-[#EE3124] to-[#d82417] text-white py-12 px-6 sm:px-12 shadow-inner">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center justify-between gap-6">
          <div className="space-y-2 text-center lg:text-left">
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Grow Your Brand Online with Confidence
            </h2>
            <p className="text-xs sm:text-sm text-orange-100 max-w-2xl font-medium leading-relaxed">
              Let's discuss your project in a free 30-minute call. We'll answer your questions, share our expertise, and help you make the right decision.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 shrink-0">
            <a
              href="https://www.starkedge.com"
              target="_blank"
              rel="noreferrer"
              className="px-6 py-3 rounded-xl border-2 border-white text-white hover:bg-white hover:text-[#EE3124] font-extrabold text-xs uppercase tracking-wider transition-all"
            >
              START YOUR PROJECT
            </a>
            <a
              href="https://www.starkedge.com"
              target="_blank"
              rel="noreferrer"
              className="px-6 py-3 rounded-xl bg-white text-[#EE3124] hover:bg-orange-50 font-extrabold text-xs uppercase tracking-wider shadow-lg transition-all"
            >
              REQUEST A QUOTE
            </a>
          </div>
        </div>
      </div>

      {/* ===================================================
          3. DETAILED FOOTER LINKS GRID (MATCHING REFERENCE 2 MAIN)
      =================================================== */}
      <div className="bg-[#09172A] py-16 px-4 sm:px-6 lg:px-8 border-t border-slate-800">
        <div className="max-w-7xl mx-auto space-y-12">
          
          {/* Top Row: Brand Logo, Experience Badge & Partner Ratings */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-8 border-b border-slate-800/80">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <StarkEdgeLogo className="h-10 w-auto" textColor="#ffffff" />
              <div className="px-3.5 py-1.5 rounded-full bg-white/5 border border-slate-700 text-xs font-bold text-slate-300 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#F7941D]" />
                <span>11+ Years of Experience in the Industry</span>
              </div>
            </div>

            {/* Partner Ratings Badges */}
            <div className="flex flex-wrap items-center gap-2 text-[11px] font-extrabold">
              <div className="px-3 py-1.5 rounded-lg bg-slate-800/90 border border-slate-700 text-white flex items-center gap-1.5">
                <span className="text-[#EE3124]">Clutch</span>
                <span className="text-amber-400">★★★★★</span>
              </div>
              <div className="px-3 py-1.5 rounded-lg bg-slate-800/90 border border-slate-700 text-slate-300">
                Google Ads
              </div>
              <div className="px-3 py-1.5 rounded-lg bg-slate-800/90 border border-slate-700 text-slate-300">
                Google Analytics
              </div>
              <div className="px-3 py-1.5 rounded-lg bg-slate-800/90 border border-slate-700 text-slate-300">
                Wix Partner
              </div>
              <div className="px-3 py-1.5 rounded-lg bg-slate-800/90 border border-slate-700 text-slate-300">
                Shopify Partner
              </div>
            </div>
          </div>

          {/* Links Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8 text-xs text-slate-400">
            {/* Col 1: Quick Links */}
            <div>
              <h4 className="font-extrabold text-white uppercase tracking-wider text-xs mb-3.5">Quick Links</h4>
              <ul className="space-y-2">
                <li><a href="https://www.starkedge.com" className="hover:text-white transition-colors">Portfolio</a></li>
                <li><a href="https://www.starkedge.com" className="hover:text-white transition-colors">About</a></li>
                <li><a href="https://www.starkedge.com" className="hover:text-white transition-colors">Blog</a></li>
                <li><a href="https://www.starkedge.com" className="hover:text-white transition-colors">Contact</a></li>
              </ul>
            </div>

            {/* Col 2: UI/UX */}
            <div>
              <h4 className="font-extrabold text-white uppercase tracking-wider text-xs mb-3.5">UI/UX</h4>
              <ul className="space-y-2">
                <li><a href="https://www.starkedge.com" className="hover:text-white transition-colors">UX & UI Design</a></li>
                <li><a href="https://www.starkedge.com" className="hover:text-white transition-colors">Print & PDF</a></li>
                <li><a href="https://www.starkedge.com" className="hover:text-white transition-colors">Figma Design</a></li>
                <li><a href="https://www.starkedge.com" className="hover:text-white transition-colors">Website Branding</a></li>
                <li><a href="https://www.starkedge.com" className="hover:text-white transition-colors">Conversion Pages</a></li>
                <li><a href="https://www.starkedge.com" className="hover:text-white transition-colors">Email Templates</a></li>
              </ul>
            </div>

            {/* Col 3: Digital Marketing */}
            <div>
              <h4 className="font-extrabold text-white uppercase tracking-wider text-xs mb-3.5">Digital Marketing</h4>
              <ul className="space-y-2">
                <li><a href="https://www.starkedge.com" className="hover:text-white transition-colors">SEO Optimization</a></li>
                <li><a href="https://www.starkedge.com" className="hover:text-white transition-colors">SMM Marketing</a></li>
                <li><a href="https://www.starkedge.com" className="hover:text-white transition-colors">PPC Campaigns</a></li>
                <li><a href="https://www.starkedge.com" className="hover:text-white transition-colors">CRO Analytics</a></li>
                <li><a href="https://www.starkedge.com" className="hover:text-white transition-colors">CRM Integrations</a></li>
              </ul>
            </div>

            {/* Col 4: HubSpot Services */}
            <div>
              <h4 className="font-extrabold text-white uppercase tracking-wider text-xs mb-3.5">Hubspot Services</h4>
              <ul className="space-y-2">
                <li><a href="https://www.starkedge.com" className="hover:text-white transition-colors">Hubspot Onboarding</a></li>
                <li><a href="https://www.starkedge.com" className="hover:text-white transition-colors">Hubspot Migration</a></li>
                <li><a href="https://www.starkedge.com" className="hover:text-white transition-colors">Hubspot Audit Services</a></li>
                <li><a href="https://www.starkedge.com" className="hover:text-white transition-colors">Hubspot CMS Development</a></li>
                <li><a href="https://www.starkedge.com" className="hover:text-white transition-colors">Hubspot Integration Services</a></li>
              </ul>
            </div>

            {/* Col 5: Our Office Contact Info */}
            <div className="col-span-2 md:col-span-4 lg:col-span-1 space-y-4">
              <h4 className="font-extrabold text-white uppercase tracking-wider text-xs mb-3.5">Our Office</h4>
              
              <div className="space-y-2">
                <div className="font-bold text-white text-[11px] uppercase tracking-wider text-[#F7941D]">INDIA</div>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  D 235 A, Near Hindustan Times, Sector 74, Mohali, Punjab 160074
                </p>
                <div className="text-[11px] font-mono text-slate-300">
                  <div className="flex items-center gap-1.5"><Mail className="w-3 h-3 text-[#EE3124]" /> info@starkedge.com</div>
                  <div className="flex items-center gap-1.5 mt-0.5"><Phone className="w-3 h-3 text-[#F7941D]" /> +91 9780970000</div>
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-800">
                <div className="font-bold text-white text-[11px] uppercase tracking-wider text-[#EE3124]">USA</div>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  350 Rhodes Island St, #240, Suite 233 San Francisco, CA 94103
                </p>
                <div className="text-[11px] font-mono text-slate-300">
                  <div className="flex items-center gap-1.5"><Mail className="w-3 h-3 text-[#EE3124]" /> sales@starkedge.com</div>
                  <div className="flex items-center gap-1.5 mt-0.5"><Phone className="w-3 h-3 text-[#F7941D]" /> +1 (209) 379-0229</div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* ===================================================
          4. COPYRIGHT & FLOATING WHATSAPP BUTTON (MATCHING REF 2 BOTTOM)
      =================================================== */}
      <div className="bg-[#050D1A] py-6 px-4 sm:px-6 lg:px-8 border-t border-slate-800/80 text-xs text-slate-400">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            © {new Date().getFullYear()} starkedge. All rights reserved.
          </div>

          <div className="flex items-center gap-6 font-medium">
            <a href="https://www.facebook.com" target="_blank" rel="noreferrer" className="hover:text-white transition-colors">Facebook</a>
            <a href="https://www.twitter.com" target="_blank" rel="noreferrer" className="hover:text-white transition-colors">Twitter</a>
            <a href="https://www.instagram.com" target="_blank" rel="noreferrer" className="hover:text-white transition-colors">Instagram</a>
            <a href="https://www.linkedin.com" target="_blank" rel="noreferrer" className="hover:text-white transition-colors">LinkedIn</a>
          </div>
        </div>
      </div>

      {/* Floating WhatsApp CTA */}
      <a
        href="https://api.whatsapp.com/send?phone=919780970000"
        target="_blank"
        rel="noreferrer"
        className="fixed bottom-6 right-6 z-50 bg-[#25D366] hover:bg-[#20ba5a] text-white px-4 py-2.5 rounded-full shadow-2xl font-bold text-xs flex items-center gap-2 border border-emerald-400/50 transition-all hover:scale-105 active:scale-95 cursor-pointer"
      >
        <MessageCircle className="w-4 h-4 fill-white text-[#25D366]" />
        <span>WhatsApp Us</span>
      </a>
    </footer>
  );
}
