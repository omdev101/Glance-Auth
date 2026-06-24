import React, { useEffect } from 'react';
import SimpleNavbar from '@/components/SimpleNavbar';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

const Privacy = () => {
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
          
          
          <h1 className="text-3xl font-bold mb-6">Privacy Policy</h1>
          
          <div className="prose max-w-none">
            <p className="text-lg mb-4">
              Last Updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
            
            <p className="mb-4">
              At Glance Auth, we take your privacy seriously. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our facial recognition attendance system.
            </p>
            
            <h2 className="text-xl font-semibold mt-6 mb-3">1. Information We Collect</h2>
            <p>We collect the following types of information:</p>
            <ul className="list-disc pl-6 my-3">
              <li><strong>Personal Information:</strong> Name, email address, student/employee ID, and contact details.</li>
              <li><strong>Biometric Data:</strong> Facial recognition data in the form of facial geometry and feature points.</li>
              <li><strong>Attendance Records:</strong> Date, time, and location of attendance check-ins.</li>
              <li><strong>Device Information:</strong> IP address, browser type, and operating system when accessing our web interface.</li>
            </ul>
            
            <h2 className="text-xl font-semibold mt-6 mb-3">2. How We Use Your Information</h2>
            <p>We use the collected information for the following purposes:</p>
            <ul className="list-disc pl-6 my-3">
              <li>To identify and authenticate users</li>
              <li>To record and maintain attendance records</li>
              <li>To generate attendance reports for administrative purposes</li>
              <li>To improve and optimize our facial recognition algorithms</li>
              <li>To communicate with you regarding your account or attendance status</li>
              <li>To comply with legal obligations</li>
            </ul>
            
            <h2 className="text-xl font-semibold mt-6 mb-3">3. Biometric Data Processing</h2>
            <p>
              We understand the sensitive nature of biometric data. Our processing of facial recognition data adheres to the following principles:
            </p>
            <ul className="list-disc pl-6 my-3">
              <li>Facial data is converted into an encrypted numerical template that cannot be reverse-engineered into an image</li>
              <li>Raw facial images are not stored after template creation</li>
              <li>Templates are stored with strong encryption</li>
              <li>Biometric data is used solely for attendance verification purposes</li>
            </ul>
            
            <h2 className="text-xl font-semibold mt-6 mb-3">4. Data Sharing and Disclosure</h2>
            <p>We do not sell, rent, or trade your personal information. We may share your information in the following circumstances:</p>
            <ul className="list-disc pl-6 my-3">
              <li>With the educational institution or employer that has implemented our system</li>
              <li>With service providers who assist in our operations (subject to confidentiality agreements)</li>
              <li>When required by law, such as to comply with a subpoena or similar legal process</li>
              <li>To protect against fraud or potential threats to the safety of persons</li>
            </ul>
            
            <h2 className="text-xl font-semibold mt-6 mb-3">5. Data Security</h2>
            <p>
              We implement appropriate technical and organizational measures to protect your personal information, including:
            </p>
            <ul className="list-disc pl-6 my-3">
              <li>Encryption of sensitive data both in transit and at rest</li>
              <li>Regular security assessments and penetration testing</li>
              <li>Access controls and authentication mechanisms</li>
              <li>Staff training on data protection and security practices</li>
            </ul>
            
            <h2 className="text-xl font-semibold mt-6 mb-3">6. Data Retention</h2>
            <p>
              We retain your personal information and biometric data for as long as necessary to fulfill the purposes outlined in this Privacy Policy, unless a longer retention period is required by law. Biometric data is deleted when:
            </p>
            <ul className="list-disc pl-6 my-3">
              <li>You graduate or leave the institution</li>
              <li>You request deletion of your data</li>
              <li>Three years have passed since your last interaction with the system</li>
            </ul>
            
            <h2 className="text-xl font-semibold mt-6 mb-3">7. Your Rights</h2>
            <p>Depending on your location, you may have the following rights regarding your data:</p>
            <ul className="list-disc pl-6 my-3">
              <li>Right to access the personal information we hold about you</li>
              <li>Right to request correction of inaccurate data</li>
              <li>Right to request deletion of your data</li>
              <li>Right to object to or restrict certain processing activities</li>
              <li>Right to data portability</li>
            </ul>
            
            <h2 className="text-xl font-semibold mt-6 mb-3">8. Children's Privacy</h2>
            <p>
              Our service is not intended for individuals under the age of 16 without parental consent. We do not knowingly collect personal information from children under 16. If you are a parent or guardian and believe your child has provided us with personal information, please contact us.
            </p>
            
            <h2 className="text-xl font-semibold mt-6 mb-3">9. Changes to This Privacy Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. We will notify users of any material changes by posting the new Privacy Policy on this page and updating the "Last Updated" date.
            </p>
            
            <h2 className="text-xl font-semibold mt-6 mb-3">10. Contact Us</h2>
            <p>
              If you have any questions about this Privacy Policy, please contact us at:
            </p>
            <p className="mt-2">
              Email: ombaikerikar@gmail.com
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

export default Privacy; 