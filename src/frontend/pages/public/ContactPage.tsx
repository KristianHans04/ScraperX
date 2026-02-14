import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { PublicLayout } from '../../components/layout/PublicLayout';
import { Mail, MapPin, Clock } from 'lucide-react';

const contactSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  subject: z.string().min(5, 'Subject must be at least 5 characters'),
  message: z.string().min(20, 'Message must be at least 20 characters'),
  honeypot: z.string().max(0, 'Bot detected'),
});

type ContactFormData = z.infer<typeof contactSchema>;

export function ContactPage() {
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema),
  });

  const onSubmit = async (data: ContactFormData) => {
    try {
      const response = await fetch('/api/public/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to send message');
      }

      setSubmitStatus('success');
      reset();
    } catch (error) {
      setSubmitStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'An error occurred');
    }
  };

  return (
    <PublicLayout>
      <section className="py-24 bg-black min-h-screen relative overflow-hidden">
        {/* Glow Effects */}
        <div className="absolute top-[10%] right-[-10%] w-[500px] h-[500px] bg-white/5 blur-[120px] rounded-full pointer-events-none opacity-20" />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center mb-16">
            <h1 className="text-4xl sm:text-6xl font-bold text-white mb-6 tracking-tight drop-shadow-2xl">
              Get in Touch
            </h1>
            <p className="text-xl text-silver-400">
              Have questions? We would love to hear from you.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            {/* Contact Form */}
            <div className="lg:col-span-2 bg-white/5 border border-white/10 rounded-2xl shadow-xl p-8 backdrop-blur-md">
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                {/* Success Message */}
                {submitStatus === 'success' && (
                  <div className="p-4 bg-green-900/20 border border-green-800/50 rounded-lg">
                    <p className="text-green-200 text-sm flex items-center">
                      <span className="w-2 h-2 bg-green-500 rounded-full mr-2" />
                      Thank you for your message. We will get back to you within 24 hours.
                    </p>
                  </div>
                )}

                {/* Error Message */}
                {submitStatus === 'error' && (
                  <div className="p-4 bg-red-900/20 border border-red-800/50 rounded-lg">
                    <p className="text-red-200 text-sm flex items-center">
                      <span className="w-2 h-2 bg-red-500 rounded-full mr-2" />
                      {errorMessage}
                    </p>
                  </div>
                )}

                {/* Honeypot Field (hidden) */}
                <input
                  type="text"
                  {...register('honeypot')}
                  style={{ display: 'none' }}
                  tabIndex={-1}
                  autoComplete="off"
                />

                {/* Name Field */}
                <div>
                  <label
                    htmlFor="name"
                    className="block text-sm font-bold text-silver-300 mb-2 uppercase tracking-wide"
                  >
                    Name
                  </label>
                  <input
                    {...register('name')}
                    type="text"
                    id="name"
                    className="w-full px-4 py-3 border border-white/10 rounded-xl bg-black/50 text-white placeholder:text-silver-600 focus:outline-none focus:border-white/30 focus:ring-1 focus:ring-white/20 transition-all"
                    placeholder="John Doe"
                  />
                  {errors.name && (
                    <p className="mt-1 text-sm text-red-400">
                      {errors.name.message}
                    </p>
                  )}
                </div>

                {/* Email Field */}
                <div>
                  <label
                    htmlFor="email"
                    className="block text-sm font-bold text-silver-300 mb-2 uppercase tracking-wide"
                  >
                    Email
                  </label>
                  <input
                    {...register('email')}
                    type="email"
                    id="email"
                    className="w-full px-4 py-3 border border-white/10 rounded-xl bg-black/50 text-white placeholder:text-silver-600 focus:outline-none focus:border-white/30 focus:ring-1 focus:ring-white/20 transition-all"
                    placeholder="john@example.com"
                  />
                  {errors.email && (
                    <p className="mt-1 text-sm text-red-400">
                      {errors.email.message}
                    </p>
                  )}
                </div>

                {/* Subject Field */}
                <div>
                  <label
                    htmlFor="subject"
                    className="block text-sm font-bold text-silver-300 mb-2 uppercase tracking-wide"
                  >
                    Subject
                  </label>
                  <input
                    {...register('subject')}
                    type="text"
                    id="subject"
                    className="w-full px-4 py-3 border border-white/10 rounded-xl bg-black/50 text-white placeholder:text-silver-600 focus:outline-none focus:border-white/30 focus:ring-1 focus:ring-white/20 transition-all"
                    placeholder="How can we help?"
                  />
                  {errors.subject && (
                    <p className="mt-1 text-sm text-red-400">
                      {errors.subject.message}
                    </p>
                  )}
                </div>

                {/* Message Field */}
                <div>
                  <label
                    htmlFor="message"
                    className="block text-sm font-bold text-silver-300 mb-2 uppercase tracking-wide"
                  >
                    Message
                  </label>
                  <textarea
                    {...register('message')}
                    id="message"
                    rows={6}
                    className="w-full px-4 py-3 border border-white/10 rounded-xl bg-black/50 text-white placeholder:text-silver-600 focus:outline-none focus:border-white/30 focus:ring-1 focus:ring-white/20 transition-all resize-none"
                    placeholder="Tell us more about your inquiry..."
                  />
                  {errors.message && (
                    <p className="mt-1 text-sm text-red-400">
                      {errors.message.message}
                    </p>
                  )}
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-4 px-6 rounded-xl bg-white text-black font-bold text-lg hover:bg-silver-200 disabled:bg-silver-600 disabled:cursor-not-allowed transition-all shadow-[0_0_20px_rgba(255,255,255,0.2)] hover:scale-[1.01]"
                >
                  {isSubmitting ? 'Sending...' : 'Send Message'}
                </button>
              </form>
            </div>

            {/* Contact Info Panel */}
            <div className="space-y-6">
              <div className="bg-white/5 border border-white/10 rounded-2xl p-8 backdrop-blur-md">
                <div className="flex items-start mb-6">
                  <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-white/10 mr-4 border border-white/5">
                    <Mail className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white mb-1">Email</h3>
                    <a
                      href="mailto:support@scrapifie.com"
                      className="text-silver-400 hover:text-white transition-colors underline decoration-white/20 hover:decoration-white"
                    >
                      support@scrapifie.com
                    </a>
                  </div>
                </div>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-2xl p-8 backdrop-blur-md">
                <div className="flex items-start mb-6">
                  <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-white/10 mr-4 border border-white/5">
                    <Clock className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white mb-1">
                      Support Hours
                    </h3>
                    <p className="text-silver-400 text-sm mb-1">
                      Monday - Friday: 9:00 AM - 6:00 PM UTC
                    </p>
                    <p className="text-silver-400 text-sm">
                      Enterprise: 24/7 support available
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-2xl p-8 backdrop-blur-md">
                <div className="flex items-start">
                  <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-white/10 mr-4 border border-white/5">
                    <MapPin className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white mb-1">
                      Response Time
                    </h3>
                    <p className="text-silver-400 text-sm">
                      We typically respond within 24 hours during business days.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
