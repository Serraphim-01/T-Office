import { Building2 } from 'lucide-react';

export function Footer() {
  return (
    <footer className="bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Building2 className="h-6 w-6 text-blue-400" />
              <span className="text-lg font-bold">Task Office</span>
            </div>
            <p className="text-gray-400 text-sm">
              Modern internal office management system for enhanced productivity and collaboration.
            </p>
          </div>
          
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider mb-4">Quick Links</h3>
            <ul className="space-y-2">
              <li><a href="/about" className="text-gray-400 hover:text-white transition-colors">About</a></li>
              <li><a href="/help" className="text-gray-400 hover:text-white transition-colors">Help & FAQ</a></li>
              <li><a href="/login" className="text-gray-400 hover:text-white transition-colors">Login</a></li>
            </ul>
          </div>
          
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider mb-4">Support</h3>
            <ul className="space-y-2">
              <li className="text-gray-400 text-sm">Email: support@taskoffice.com</li>
              <li className="text-gray-400 text-sm">Phone: (555) 123-4567</li>
              <li className="text-gray-400 text-sm">Hours: Mon-Fri 9AM-5PM</li>
            </ul>
          </div>
        </div>
        
        <div className="mt-8 pt-8 border-t border-gray-800 text-center">
          <p className="text-gray-400 text-sm">
            © {new Date().getFullYear()} Task Office. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}