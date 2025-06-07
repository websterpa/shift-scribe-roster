
import React from 'react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

const faqs = [
  {
    question: 'How does the free trial work?',
    answer: 'You can sign up for free and access all features for managing staff and creating roster configurations. However, to view and export generated rosters, you\'ll need to upgrade to our Pro plan.'
  },
  {
    question: 'Is the platform compliant with Working Time Regulations?',
    answer: 'Yes, our platform automatically ensures all generated rosters comply with UK Working Time Regulations, including maximum working hours, rest periods, and break requirements.'
  },
  {
    question: 'Can I import existing staff data?',
    answer: 'Yes, you can easily import your existing staff data using our CSV import feature or manually add staff members through our intuitive interface.'
  },
  {
    question: 'What payment methods do you accept?',
    answer: 'We accept all major credit cards through Stripe and also support PayPal payments for your convenience.'
  },
  {
    question: 'How does leave management work?',
    answer: 'Staff can submit leave requests through the system, which can be approved or rejected by managers. Approved leave is automatically factored into roster generation.'
  },
  {
    question: 'Can I export rosters to other formats?',
    answer: 'Pro plan users can export rosters to Excel, PDF, and CSV formats for easy sharing and integration with other systems.'
  },
  {
    question: 'Is there a limit on the number of staff members?',
    answer: 'Free plans are limited to 5 staff members. Pro plans support unlimited staff members for your organization.'
  },
  {
    question: 'Do you offer customer support?',
    answer: 'Yes, we provide email support for all users, with priority support for Pro plan subscribers.'
  }
];

export const FAQSection = () => {
  return (
    <section id="faq" className="py-20 bg-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Frequently Asked Questions
          </h2>
          <p className="text-xl text-gray-600">
            Get answers to common questions about our platform
          </p>
        </div>

        <Accordion type="single" collapsible className="space-y-4">
          {faqs.map((faq, index) => (
            <AccordionItem 
              key={index} 
              value={`item-${index}`}
              className="bg-gray-50 rounded-lg px-6"
            >
              <AccordionTrigger className="text-left font-semibold">
                {faq.question}
              </AccordionTrigger>
              <AccordionContent className="text-gray-600 pb-4">
                {faq.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
};
