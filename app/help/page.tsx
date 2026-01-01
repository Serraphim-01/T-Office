'use client';

import { Navbar } from '@/components/navbar';

export const dynamic = 'force-dynamic';
import { Footer } from '@/components/footer';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Mail, Phone, MessageCircle, Clock, Search } from 'lucide-react';

export default function HelpPage() {
  const faqs = [
    {
      question: 'How do I access the Task Office system?',
      answer: 'You can access Task Office through your web browser by visiting the login page. Use your company-provided email and password to sign in. The system is also available as a Progressive Web App (PWA) that you can install on your device for offline access.'
    },
    {
      question: 'What features are available in the Dashboard?',
      answer: 'The Dashboard provides an overview of your personal information, department updates, and compliance checklist. You can view analytics through interactive charts, track your progress on tasks, and stay updated with the latest announcements from your department.'
    },
    {
      question: 'How does the Anonymous Chat feature work?',
      answer: 'The Anonymous Chat feature allows team members to communicate openly without revealing their identity. This promotes honest feedback and discussion. Messages are stored temporarily during your session and are designed to foster open communication within your organization.'
    },
    {
      question: 'Can I update my profile information?',
      answer: 'Yes, you can update your profile information by navigating to the Profile page. You can modify your name, email, phone number, and department information. Changes are validated in real-time and saved to your local profile.'
    },
    {
      question: 'Is Task Office available on mobile devices?',
      answer: 'Absolutely! Task Office is built as a responsive Progressive Web App (PWA), which means it works seamlessly across all devices - desktop, tablet, and mobile. You can even install it on your mobile device for a native app-like experience.'
    },
    {
      question: 'What should I do if I forget my password?',
      answer: 'Currently, the system is in MVP mode with demo authentication. For production use, contact your system administrator or IT department to reset your password. They will provide you with new login credentials or guide you through the password reset process.'
    },
    {
      question: 'How is my data protected in Task Office?',
      answer: 'Task Office implements industry-standard security measures to protect your data. In the current MVP version, data is stored locally on your device. For production deployments, all data transmission is encrypted, and we follow best practices for data privacy and security.'
    },
    {
      question: 'Can I use Task Office offline?',
      answer: 'Yes! Thanks to the PWA technology, Task Office can work offline for basic functions. Once you install the app, you can access previously loaded content and continue working even without an internet connection. Changes will sync when you reconnect.'
    },
    {
      question: 'How do I install Task Office as an app?',
      answer: 'When you visit Task Office on your mobile device or desktop browser, you\'ll see an "Install" prompt or an "Add to Home Screen" option. Click this to install Task Office as a standalone app. You can also find install options in your browser\'s menu.'
    },
    {
      question: 'Who can I contact for technical support?',
      answer: 'For technical support, you can reach out through multiple channels: email us at support@taskoffice.com, call our support line at (555) 123-4567, or use the live chat feature available during business hours (Mon-Fri, 9AM-5PM).'
    }
  ];

  const supportChannels = [
    {
      icon: Mail,
      title: 'Email Support',
      description: 'Get detailed help via email',
      contact: 'support@taskoffice.com',
      badge: 'Usually responds in 24 hours'
    },
    {
      icon: Phone,
      title: 'Phone Support',
      description: 'Speak with our support team',
      contact: '(555) 123-4567',
      badge: 'Mon-Fri, 9AM-5PM EST'
    },
    {
      icon: MessageCircle,
      title: 'Live Chat',
      description: 'Real-time chat support',
      contact: 'Available in app',
      badge: 'Business hours only'
    }
  ];

  const quickTips = [
    'Use Ctrl+/ to quickly navigate between sections',
    'Your data is automatically saved as you work',
    'Install the PWA for the best mobile experience',
    'Anonymous chat messages are session-based only',
    'Dashboard charts update in real-time',
    'Profile changes are validated instantly'
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-primary to-yellow-600 text-primary-foreground py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <Search className="h-16 w-16 text-yellow-200 mx-auto mb-6" />
            <h1 className="text-4xl md:text-5xl font-bold mb-6">Help & Support</h1>
            <p className="text-xl md:text-2xl text-yellow-100 max-w-4xl mx-auto">
              Find answers to common questions and get the support you need to make the most of Task Office.
            </p>
          </div>
        </div>
      </section>

      {/* Quick Tips Section */}
      <section className="py-12 bg-secondary/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-foreground mb-4">Quick Tips</h2>
            <p className="text-muted-foreground">Essential tips to enhance your Task Office experience</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {quickTips.map((tip, index) => (
              <Card key={index} className="border-l-4 border-l-primary bg-card">
                <CardContent className="p-4">
                  <p className="text-sm text-card-foreground">{tip}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Frequently Asked Questions
            </h2>
            <p className="text-xl text-muted-foreground">
              Find answers to the most common questions about Task Office
            </p>
          </div>
          
          <Accordion type="single" collapsible className="space-y-4">
            {faqs.map((faq, index) => (
              <AccordionItem 
                key={index} 
                value={`item-${index}`}
                className="border border-border rounded-lg px-6 bg-card"
              >
                <AccordionTrigger className="text-left hover:no-underline">
                  <span className="font-semibold text-card-foreground">{faq.question}</span>
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground pb-6">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* Support Channels Section */}
      <section className="py-20 bg-secondary/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Still Need Help?
            </h2>
            <p className="text-xl text-muted-foreground">
              Our support team is here to assist you through multiple channels
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {supportChannels.map((channel, index) => {
              const Icon = channel.icon;
              return (
                <Card key={index} className="text-center shadow-lg hover:shadow-xl transition-shadow bg-card">
                  <CardHeader>
                    <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Icon className="h-8 w-8 text-primary" />
                    </div>
                    <CardTitle className="text-xl text-card-foreground">{channel.title}</CardTitle>
                    <CardDescription>{channel.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="font-semibold text-card-foreground">{channel.contact}</p>
                    <Badge variant="secondary">{channel.badge}</Badge>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Additional Resources */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-foreground mb-6">
              Additional Resources
            </h2>
            <p className="text-lg text-muted-foreground mb-8 max-w-3xl mx-auto">
              Explore more resources to help you get the most out of Task Office
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button variant="outline" size="lg">
                <Clock className="mr-2 h-5 w-5" />
                System Status
              </Button>
              <Button variant="outline" size="lg">
                User Guide
              </Button>
              <Button variant="outline" size="lg">
                Video Tutorials
              </Button>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}