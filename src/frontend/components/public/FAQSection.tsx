import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface FAQItem {
  question: string;
  answer: string;
}

const faqData: FAQItem[] = [
  {
    question: 'What are credits and how do they work?',
    answer:
      'Credits are our usage currency. Each request consumes credits based on the engine used and complexity. HTTP requests cost 1 credit, Browser requests cost 10 credits, and Stealth requests cost 25 credits. Your plan includes a monthly credit allowance, and you can purchase additional credit packs anytime.',
  },
  {
    question: 'Can I switch plans at any time?',
    answer:
      'Yes, you can upgrade or downgrade your plan at any time. When upgrading, you will be charged the prorated difference immediately. When downgrading, the change takes effect at the end of your current billing cycle.',
  },
  {
    question: 'Do unused credits roll over?',
    answer:
      'Credits included in your monthly plan do not roll over. However, any credit packs you purchase separately never expire and remain available until used.',
  },
  {
    question: 'What happens if I exceed my credit limit?',
    answer:
      'If you exceed your monthly credit allocation, requests will be paused until you purchase additional credits or your plan renews. You can set up automatic credit pack purchases to avoid interruptions.',
  },
  {
    question: 'Is there a free trial for paid plans?',
    answer:
      'Yes, all paid plans include a 14-day free trial with full access to all features. You can cancel anytime during the trial period without being charged.',
  },
  {
    question: 'What payment methods do you accept?',
    answer:
      'We accept all major credit cards (Visa, Mastercard, American Express, Discover) and PayPal. Enterprise customers can also pay via invoice with NET 30 terms.',
  },
  {
    question: 'How does the stealth engine differ from the browser engine?',
    answer:
      'The browser engine executes JavaScript and renders pages like a real browser. The stealth engine adds advanced anti-bot evasion techniques including fingerprint randomization, CAPTCHA solving, and residential proxy rotation to bypass sophisticated detection systems.',
  },
  {
    question: 'Do you offer refunds?',
    answer:
      'We offer a 30-day money-back guarantee for annual plans. Monthly subscriptions are non-refundable, but you can cancel at any time to avoid future charges. Unused credit packs are refundable within 7 days of purchase.',
  },
  {
    question: 'What kind of support is included?',
    answer:
      'Free plans include community forum support. Pro plans include email support with 24-hour response time. Enterprise plans include 24/7 priority support via email, chat, and phone, plus a dedicated account manager.',
  },
  {
    question: 'Can I use Scrapifie for commercial purposes?',
    answer:
      'Yes, all plans allow commercial use. However, you must comply with our Acceptable Use Policy and respect the robots.txt and terms of service of the websites you scrape.',
  },
];

export function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section className="py-20 bg-white dark:bg-gray-950">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white">
            Frequently Asked Questions
          </h2>
          <p className="mt-4 text-lg text-gray-600 dark:text-gray-300">
            Got questions? We have answers.
          </p>
        </div>

        <div className="space-y-4">
          {faqData.map((faq, index) => (
            <div
              key={index}
              className="bg-gray-50 dark:bg-gray-900 rounded-lg overflow-hidden"
            >
              <button
                onClick={() => toggleFAQ(index)}
                className="w-full flex items-center justify-between p-6 text-left hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                aria-expanded={openIndex === index}
              >
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white pr-4">
                  {faq.question}
                </h3>
                {openIndex === index ? (
                  <ChevronUp className="w-5 h-5 text-gray-500 flex-shrink-0" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-500 flex-shrink-0" />
                )}
              </button>
              {openIndex === index && (
                <div className="px-6 pb-6">
                  <p className="text-gray-700 dark:text-gray-300">{faq.answer}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
