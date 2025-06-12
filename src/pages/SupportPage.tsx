
import React, { useState } from 'react';
import { LandingHeader } from '@/components/landing/LandingHeader';
import { LandingFooter } from '@/components/landing/LandingFooter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Mail, Phone, MessageCircle, Book } from 'lucide-react';
import { LiveChatWidget } from '@/components/support/LiveChatWidget';
import { DocumentationModal } from '@/components/support/DocumentationModal';
import { useToast } from '@/hooks/use-toast';

const SupportPage = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isDocsOpen, setIsDocsOpen] = useState(false);
  const { toast } = useToast();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Support form submitted:', formData);
    
    toast({
      title: "Message Sent Successfully",
      description: "Thank you for your message. We'll get back to you within 24 hours!",
    });
    
    setFormData({ name: '', email: '', subject: '', message: '' });
  };

  return (
    <div className="min-h-screen bg-white">
      <LandingHeader />
      
      <div className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Help & Support
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              We're here to help you get the most out of your CCTV Roster experience. 
              Reach out to us through any of the channels below.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-16">
            <Card>
              <CardHeader className="text-center">
                <Mail className="w-12 h-12 text-blue-600 mx-auto mb-4" />
                <CardTitle>Email Support</CardTitle>
                <CardDescription>
                  Get help via email within 24 hours
                </CardDescription>
              </CardHeader>
              <CardContent className="text-center">
                <a 
                  href="mailto:support@cctvlevelentry.com"
                  className="text-blue-600 hover:text-blue-700 font-medium"
                >
                  support@cctvlevelentry.com
                </a>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="text-center">
                <MessageCircle className="w-12 h-12 text-blue-600 mx-auto mb-4" />
                <CardTitle>Live Chat</CardTitle>
                <CardDescription>
                  Chat with our support team in real-time
                </CardDescription>
              </CardHeader>
              <CardContent className="text-center">
                <Button 
                  variant="outline"
                  onClick={() => setIsChatOpen(true)}
                >
                  Start Chat
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="text-center">
                <Book className="w-12 h-12 text-blue-600 mx-auto mb-4" />
                <CardTitle>Documentation</CardTitle>
                <CardDescription>
                  Browse our comprehensive help articles
                </CardDescription>
              </CardHeader>
              <CardContent className="text-center">
                <Button 
                  variant="outline"
                  onClick={() => setIsDocsOpen(true)}
                >
                  View Docs
                </Button>
              </CardContent>
            </Card>
          </div>

          <div className="max-w-2xl mx-auto">
            <Card>
              <CardHeader>
                <CardTitle>Send us a message</CardTitle>
                <CardDescription>
                  Fill out the form below and we'll get back to you as soon as possible.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="name">Name</Label>
                      <Input
                        id="name"
                        name="name"
                        type="text"
                        value={formData.name}
                        onChange={handleInputChange}
                        required
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        required
                        className="mt-1"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="subject">Subject</Label>
                    <Input
                      id="subject"
                      name="subject"
                      type="text"
                      value={formData.subject}
                      onChange={handleInputChange}
                      required
                      className="mt-1"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="message">Message</Label>
                    <Textarea
                      id="message"
                      name="message"
                      rows={6}
                      value={formData.message}
                      onChange={handleInputChange}
                      required
                      className="mt-1"
                    />
                  </div>
                  
                  <Button type="submit" className="w-full">
                    Send Message
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      
      <LandingFooter />
      
      {/* Live Chat Widget */}
      <LiveChatWidget 
        isOpen={isChatOpen} 
        onClose={() => setIsChatOpen(false)} 
      />
      
      {/* Documentation Modal */}
      <DocumentationModal 
        isOpen={isDocsOpen} 
        onClose={() => setIsDocsOpen(false)} 
      />
    </div>
  );
};

export default SupportPage;
