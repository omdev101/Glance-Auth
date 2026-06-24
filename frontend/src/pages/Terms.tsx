import React, { useEffect } from 'react';
import SimpleNavbar from '@/components/SimpleNavbar';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

const Terms = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);
  return (
    <div className="min-h-screen flex flex-col bg-background relative overflow-hidden">
      <SimpleNavbar />
      {/* Subtle background glow */}
      <div className="fixed top-1/4 left-0 w-[500px] h-[500px] rounded-full bg-primary/5 blur-[120px] pointer-events-none -z-10"></div>
      <div className="fixed bottom-0 right-0 w-[500px] h-[500px] rounded-full bg-primary/5 blur-[120px] pointer-events-none -z-10"></div>
      
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          
          
          <h1 className="text-3xl font-bold mb-6">Terms and Conditions</h1>
          
          <div className="prose max-w-none">
            <p className="text-lg mb-4">
              Last Updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
            
            <h2 className="text-xl font-semibold mt-6 mb-3">1. Acceptance of Terms</h2>
            <p>
              By accessing and using the Glance Auth facial recognition attendance system ("Service"), you agree to be bound by these Terms and Conditions. If you disagree with any part of these terms, you may not access or use the Service.
            </p>
            
            <h2 className="text-xl font-semibold mt-6 mb-3">2. Description of Service</h2>
            <p>
              Glance Auth is a facial recognition-based attendance system designed for educational institutions. The Service uses biometric data in the form of facial recognition to mark and track attendance.
            </p>
            
            <h2 className="text-xl font-semibold mt-6 mb-3">3. User Registration and Data Collection</h2>
            <p>
              To use the Service, users must register and provide certain information, including but not limited to name, email, student ID, and facial biometric data. Users consent to the collection and processing of this data for the purpose of attendance tracking.
            </p>
            
            <h2 className="text-xl font-semibold mt-6 mb-3">4. Biometric Data Usage</h2>
            <p>
              The facial recognition data collected is used solely for the purpose of:
            </p>
            <ul className="list-disc pl-6 my-3">
              <li>User identification and authentication</li>
              <li>Attendance tracking and verification</li>
              <li>System improvement and accuracy enhancement</li>
            </ul>
            <p>
              We do not sell, rent, or share biometric data with third parties for commercial purposes.
            </p>
            
            <h2 className="text-xl font-semibold mt-6 mb-3">5. User Responsibilities</h2>
            <p>
              Users agree to:
            </p>
            <ul className="list-disc pl-6 my-3">
              <li>Provide accurate and current information during registration</li>
              <li>Not attempt to manipulate or falsify attendance records</li>
              <li>Not attempt to reverse engineer or compromise the system</li>
              <li>Not use the system on behalf of another person</li>
            </ul>
            
            <h2 className="text-xl font-semibold mt-6 mb-3">6. Data Retention</h2>
            <p>
              Facial biometric data will be retained for the duration of the user's enrollment or employment with the institution, plus a reasonable period thereafter for record-keeping purposes, after which it will be securely deleted.
            </p>
            
            <h2 className="text-xl font-semibold mt-6 mb-3">7. Data Security</h2>
            <p>
              We implement appropriate technical and organizational measures to protect the security and confidentiality of all user data, including biometric data. However, no system can guarantee 100% security, and we cannot be held liable for unauthorized access that is beyond our reasonable control.
            </p>
            
            <h2 className="text-xl font-semibold mt-6 mb-3">8. Limitation of Liability</h2>
            <p>
              The Service is provided "as is" without warranties of any kind. We are not liable for any indirect, incidental, special, or consequential damages arising out of or in connection with the use of the Service.
            </p>
            
            <h2 className="text-xl font-semibold mt-6 mb-3">9. Changes to Terms</h2>
            <p>
              We reserve the right to modify these Terms at any time. Users will be notified of significant changes. Continued use of the Service after such modifications constitutes acceptance of the updated Terms.
            </p>
            
            <h2 className="text-xl font-semibold mt-6 mb-3">10. Governing Law</h2>
            <p>
              These Terms shall be governed by and construed in accordance with the laws of India, without regard to its conflict of law provisions.
            </p>
            
            <h2 className="text-xl font-semibold mt-6 mb-3">11. Contact Information</h2>
            <p>
              For questions about these Terms, please contact us at ombaikerikar@gmail.com.
            </p>
          </div>
        </div>
      </main>
      
      
      <footer className="p-6 flex flex-col items-center gap-2 text-sm text-muted-foreground font-medium z-10 mt-auto border-t border-border/50">
        <div>Glance Auth Internal Portal • System Operational</div>
        <div className="flex gap-6 mt-2">
          <Link to="/contact" className="hover:text-foreground transition-colors">Contact Support</Link>
          <Link to="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link>
          <Link to="/terms" className="hover:text-foreground transition-colors">Terms of Service</Link>
        </div>
      </footer>

    </div>
  );
};

export default Terms; 