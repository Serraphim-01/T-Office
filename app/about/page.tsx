import { Navbar } from '@/components/navbar';
import { Footer } from '@/components/footer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Building2, Users, Target, Shield, Zap, Globe } from 'lucide-react';

export default function AboutPage() {
  const values = [
    {
      icon: Target,
      title: 'Mission Focused',
      description: 'We streamline office operations to help organizations achieve their goals more efficiently.'
    },
    {
      icon: Users,
      title: 'People First',
      description: 'Our solutions prioritize user experience and foster better workplace collaboration.'
    },
    {
      icon: Shield,
      title: 'Security Driven',
      description: 'We implement robust security measures to protect your sensitive business data.'
    },
    {
      icon: Zap,
      title: 'Innovation Ready',
      description: 'We continuously evolve our platform with cutting-edge technology and features.'
    }
  ];

  const features = [
    'Real-time Dashboard Analytics',
    'Anonymous Communication Tools',
    'Department Coordination',
    'Performance Tracking',
    'Mobile-First Design',
    'Progressive Web App',
    'Offline Capabilities'
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-primary to-yellow-600 text-primary-foreground py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <Building2 className="h-16 w-16 text-yellow-200 mx-auto mb-6" />
            <h1 className="text-4xl md:text-5xl font-bold mb-6">About Task Office</h1>
            <p className="text-xl md:text-2xl text-yellow-100 max-w-4xl mx-auto">
              Transforming the way organizations manage their internal operations through 
              innovative technology and intuitive design.
            </p>
          </div>
        </div>
      </section>

      {/* Mission Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6">
                Our Mission
              </h2>
              <p className="text-lg text-muted-foreground mb-6">
                Task Office was created to address the growing complexity of modern workplace management. 
                We believe that effective internal operations are the backbone of successful organizations.
              </p>
              <p className="text-lg text-muted-foreground mb-6">
                Our platform combines powerful analytics, seamless communication tools, and compliance 
                management features into a unified system that scales with your organization's needs.
              </p>
              <div className="flex items-center space-x-2">
                <Globe className="h-5 w-5 text-primary" />
                <span className="text-muted-foreground">Serving organizations worldwide since 2024</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-6">
              {values.map((value, index) => {
                const Icon = value.icon;
                return (
                  <Card key={index} className="text-center bg-card">
                    <CardHeader>
                      <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-2">
                        <Icon className="h-6 w-6 text-primary" />
                      </div>
                      <CardTitle className="text-lg text-card-foreground">{value.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <CardDescription>{value.description}</CardDescription>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-secondary/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              What Makes Us Different
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Task Office combines essential office management features with modern technology 
              to deliver an unparalleled user experience.
            </p>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h3 className="text-2xl font-bold text-foreground mb-6">
                Comprehensive Feature Set
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {features.map((feature, index) => (
                  <Badge key={index} variant="secondary" className="justify-center py-2 px-3">
                    {feature}
                  </Badge>
                ))}
              </div>
            </div>
            
            <Card className="shadow-lg bg-card">
              <CardHeader>
                <CardTitle className="text-card-foreground">Why Choose Task Office?</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-primary rounded-full mt-2"></div>
                  <div>
                    <h4 className="font-semibold text-card-foreground">Easy Implementation</h4>
                    <p className="text-muted-foreground text-sm">Get up and running in minutes, not months</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-primary rounded-full mt-2"></div>
                  <div>
                    <h4 className="font-semibold text-card-foreground">Scalable Architecture</h4>
                    <p className="text-muted-foreground text-sm">Grows with your organization's needs</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-primary rounded-full mt-2"></div>
                  <div>
                    <h4 className="font-semibold text-card-foreground">24/7 Support</h4>
                    <p className="text-muted-foreground text-sm">Our team is here to help when you need it</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-primary rounded-full mt-2"></div>
                  <div>
                    <h4 className="font-semibold text-card-foreground">Regular Updates</h4>
                    <p className="text-muted-foreground text-sm">Continuous improvements and new features</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold text-primary mb-2">1000+</div>
              <div className="text-muted-foreground">Organizations</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-primary mb-2">50k+</div>
              <div className="text-muted-foreground">Active Users</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-primary mb-2">99.9%</div>
              <div className="text-muted-foreground">Uptime</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-primary mb-2">24/7</div>
              <div className="text-muted-foreground">Support</div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}