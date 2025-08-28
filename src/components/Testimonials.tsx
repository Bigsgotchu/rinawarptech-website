import React from 'react';

interface Testimonial {
  id: string;
  name: string;
  role: string;
  content: string;
}

const testimonials: Testimonial[] = [
  {
    id: '1',
    name: 'Giles',
    role: 'Early Adopter',
    content: 'This is absolutely incredible! Compared to all the other AI terminals out there, this one is so much more advanced! If you want the real deal, look no further. Want to build yourself and grow as a developer? Start with the free plan and explore everything you can - I promise you won\'t be disappointed!'
  },
  {
    id: '2',
    name: 'RG',
    role: 'Terminal Technology Reviewer',
    content: 'I\'ve been reviewing a lot of different terminals to find the best ones and based off these strengths, I am excited to be able to use it when it comes out fully. Strong technical foundation with modern architecture, innovative AI-powered features, and clear commercial viability. Production ready with comprehensive feature set.'
  }
];

export function Testimonials() {
  return (
    <section className="bg-gradient-to-r from-lightBlue1 to-lightBlue2 py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-4xl font-bold text-center text-gray-900 mb-12">
          What Our Users Say
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {testimonials.map((testimonial) => (
            <div
              key={testimonial.id}
              className="bg-white p-8 rounded-xl shadow-lg transform transition-all hover:-translate-y-2"
            >
              <div className="mb-6">
                <p className="text-gray-700 text-lg italic">&ldquo;{testimonial.content}&rdquo;</p>
              </div>
              <div className="flex items-center">
                <div>
                  <h3 className="font-semibold text-gray-900">{testimonial.name}</h3>
                  <p className="text-gray-600">{testimonial.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
