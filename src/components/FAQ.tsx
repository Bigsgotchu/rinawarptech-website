import React from 'react';

interface FAQItem {
  question: string;
  answer: string;
}

const faqs: FAQItem[] = [
  {
    question: "What's included in the free plan?",
    answer: "The free plan includes FREE Groq AI integration with 50 AI requests per day, basic terminal features, and 3 custom themes. It's perfect for trying out RinaWarp Terminal and experiencing the 10x faster AI responses."
  },
  {
    question: "How is it 10x faster than ChatGPT?",
    answer: "We use Groq's cutting-edge infrastructure and Llama models, which are optimized for speed while maintaining high-quality responses. This allows us to provide near-instant AI assistance for your development needs."
  },
  {
    question: "Is my code and data secure?",
    answer: "Yes, absolutely. Your API keys and code stay on your machine. No data leaves your system unless you explicitly send it to the AI. We take privacy seriously and ensure your sensitive information remains secure."
  },
  {
    question: "Which operating systems are supported?",
    answer: "RinaWarp Terminal works on all major platforms: macOS, Windows, and Linux. The experience is consistent across all operating systems, so you can use it wherever you develop."
  },
  {
    question: "Can I upgrade or downgrade my plan anytime?",
    answer: "Yes, you can upgrade or downgrade your plan at any time. Start with the free plan, and when you need more power, upgrade to Pro or Team plans for unlimited AI requests and additional features."
  },
  {
    question: "Do you offer technical support?",
    answer: "Yes! Free plan users get community support, while Pro and Team plans include priority support. Team plan users also get dedicated support and an SLA guarantee."
  }
];

export function FAQ() {
  return (
    <section id="faq" className="py-24 bg-gradient-to-br from-lightBlue1/20 via-transparent to-lightBlue2/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Frequently Asked Questions
          </h2>
          <p className="text-xl text-gray-600">
            Everything you need to know about RinaWarp Terminal
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-2">
          {faqs.map((faq, index) => (
            <div
              key={index}
              className="bg-white p-8 rounded-xl shadow-lg hover:shadow-xl transition-shadow"
            >
              <h3 className="text-xl font-semibold text-gray-900 mb-4">
                {faq.question}
              </h3>
              <p className="text-gray-600">
                {faq.answer}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
