import { Navbar } from '@/components/navbar';
import { Footer } from '@/components/footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, Users, MessageSquare, Shield, BarChart, Calendar } from 'lucide-react';
import Link from 'next/link';

export default function Home() {
  const features = [
    {
      icon: Users,
      title: 'Team Management',
      description: 'Efficiently manage your team and track performance across departments.'
    },
    {
      icon: MessageSquare,
      title: 'Anonymous Chat',
      description: 'Foster open communication with secure anonymous chat functionality.'
    },
    {
      icon: Shield,
      title: 'Compliance Tracking',
      description: 'Stay compliant with automated tracking and reporting features.'
    },
    {
      icon: BarChart,
      title: 'Analytics Dashboard',
      description: 'Get insights with comprehensive analytics and reporting tools.'
    },
    {
      icon: Calendar,
      title: 'Task Scheduling',
      description: 'Organize tasks and schedules with integrated calendar functionality.'
    },
    {
      icon: Building2,
      title: 'Department Updates',
      description: 'Keep everyone informed with real-time department announcements.'
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      {/* Hero Section */}
      <section className="relative bg-gradient-to-r from-primary to-yellow-600 text-primary-foreground">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              Streamline Your
              <span className="block text-yellow-200">Office Operations</span>
            </h1>
            <p className="text-xl md:text-2xl mb-8 text-yellow-100 max-w-3xl mx-auto">
              Modern internal office management system designed for enhanced productivity, seamless collaboration, and efficient workflow management.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/login">
                <Button size="lg" variant="secondary" className="min-w-[150px]">
                  Get Started
                </Button>
              </Link>
              <Link href="/about">
                <Button size="lg" variant="outline" className="min-w-[150px] border-white text-white hover:bg-white hover:text-primary">
                  Learn More
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-secondary/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Powerful Features for Modern Offices
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Everything you need to manage your office operations effectively, from team collaboration to compliance tracking.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <Card key={index} className="border-border shadow-lg hover:shadow-xl transition-shadow duration-300 bg-card">
                  <CardHeader>
                    <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                      <Icon className="h-6 w-6 text-primary" />
                    </div>
                    <CardTitle className="text-xl text-card-foreground">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-muted-foreground">
                      {feature.description}
                    </CardDescription>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Ready to Transform Your Office?
          </h2>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Join thousands of organizations already using Task Office to streamline their operations and boost productivity.
          </p>
          <Link href="/login">
            <Button size="lg" className="min-w-[200px]">
              Start Your Journey
            </Button>
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}