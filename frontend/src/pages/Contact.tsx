import React, { useState, useEffect } from 'react';
import SimpleNavbar from '@/components/SimpleNavbar';
import { ArrowLeft, Mail, Phone, MapPin, Send } from 'lucide-react';
import { Link } from 'react-router-dom';
import CustomButton from '@/components/ui/CustomButton';
import { useToast } from '@/hooks/use-toast';
import { contactService } from '@/services/api';

const Contact = () => {
  const { toast } = useToast();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Submit the form to the backend
      await contactService.submitContactForm(formData);

      // Show success message
      toast({
        title: "Message Sent",
        description: "Thank you for your message. We'll get back to you soon.",
      });

      // Clear the form
      setFormData({
        name: '',
        email: '',
        subject: '',
        message: ''
      });
    } catch (error: any) {
      // Show error message
      let errorMessage = 'Failed to send message. Please try again.';
      if (error.response && error.response.data && error.response.data.error) {
        errorMessage = error.response.data.error;
      }

      toast({
        title: "Error",
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background relative overflow-hidden">
      <SimpleNavbar />
      {/* Subtle background glow */}
      <div className="fixed top-1/4 left-0 w-[500px] h-[500px] rounded-full bg-primary/5 blur-[120px] pointer-events-none -z-10"></div>
      <div className="fixed bottom-0 right-0 w-[500px] h-[500px] rounded-full bg-primary/5 blur-[120px] pointer-events-none -z-10"></div>

      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">


          <h1 className="text-3xl font-bold mb-6">Contact Us</h1>

          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <p className="mb-6">
                Have questions about Glance Auth? Want to learn more about our facial recognition attendance system?
                We'd love to hear from you. Fill out the form or use the contact information below.
              </p>

              <div className="space-y-4 mt-8">
                <div className="flex items-center">
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center mr-3">
                    <Mail className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="font-medium">ombaikerikar@gmail.com</p>
                  </div>
                </div>


              </div>

              <div className="mt-8 p-4 bg-muted rounded-lg">
                <h3 className="font-medium mb-2">About the Developer</h3>
                <p className="text-sm text-muted-foreground">
                  Glance Auth was built by Om N Baikerikar,
                  an MCA student and developer with a focus on applied computer vision and web technologies.
                  The project stemmed from a practical interest in replacing manual attendance systems with something more reliable
                  and scalable for educational institutions.
                </p>
              </div>
            </div>

            <div className="bg-card p-6 rounded-lg shadow-sm border">
              <h2 className="text-xl font-semibold mb-4">Send us a message</h2>

              <form onSubmit={handleSubmit}>
                <div className="space-y-4">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium mb-1">
                      Your Name
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-3 border border-border rounded-xl bg-muted/50 focus:bg-background focus:outline-none focus:ring-2 focus:ring-ring/20 transition-all text-foreground"
                    />
                  </div>

                  <div>
                    <label htmlFor="email" className="block text-sm font-medium mb-1">
                      Your Email
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-3 border border-border rounded-xl bg-muted/50 focus:bg-background focus:outline-none focus:ring-2 focus:ring-ring/20 transition-all text-foreground"
                    />
                  </div>

                  <div>
                    <label htmlFor="subject" className="block text-sm font-medium mb-1">
                      Subject
                    </label>
                    <input
                      type="text"
                      id="subject"
                      name="subject"
                      value={formData.subject}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-3 border border-border rounded-xl bg-muted/50 focus:bg-background focus:outline-none focus:ring-2 focus:ring-ring/20 transition-all text-foreground"
                    />
                  </div>

                  <div>
                    <label htmlFor="message" className="block text-sm font-medium mb-1">
                      Message
                    </label>
                    <textarea
                      id="message"
                      name="message"
                      value={formData.message}
                      onChange={handleChange}
                      required
                      rows={5}
                      className="w-full px-4 py-3 border border-border rounded-xl bg-muted/50 focus:bg-background focus:outline-none focus:ring-2 focus:ring-ring/20 transition-all text-foreground"
                    />
                  </div>

                  <div>
                    <CustomButton
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full"
                      rightIcon={<Send className="h-4 w-4" />}
                    >
                      {isSubmitting ? 'Sending...' : 'Send Message'}
                    </CustomButton>
                  </div>
                </div>
              </form>
            </div>
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

export default Contact; 