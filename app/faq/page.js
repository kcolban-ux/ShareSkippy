'use client';

import { useState } from 'react';
import Link from 'next/link';
import { LEGAL } from '@/lib/legal';

const faqData = [
  // General Questions
  {
    question: "What is ShareSkippy?",
    answer: "ShareSkippy is a community-driven platform that connects pet owners with local pet lovers. We help neighbors find trusted people to walk their dogs, provide companionship, or give pets new experiences like swimming and hiking adventures.",
    category: "general"
  },
  {
    question: "Who runs ShareSkippy?",
    answer: LEGAL.faqDisclosure,
    category: "general"
  },
  {
    question: "How does ShareSkippy work?",
    answer: "Pet owners can post requests for dog walking or pet care, while pet lovers can share their availability to help. Users connect through our secure messaging system, meet up safely, and build lasting community relationships.",
    category: "general"
  },
  {
    question: "Is ShareSkippy free to use?",
    answer: "Yes! ShareSkippy is completely free to use. We believe in building community connections without financial barriers. Users can arrange their own terms for any services provided.",
    category: "general"
  },
  {
    question: "What areas does ShareSkippy serve?",
    answer: "ShareSkippy serves communities across various neighborhoods. We use location-based matching to connect you with people in your local area, typically within a few miles of your location.",
    category: "general"
  },

  // Safety & Privacy
  {
    question: "How do you ensure safety on the platform?",
    answer: "We prioritize safety through community verification, secure messaging, and location privacy features. All users are encouraged to meet in public places initially and follow our safety guidelines. We also maintain approximate location privacy to protect users.",
    category: "safety"
  },
  {
    question: "How is my privacy protected?",
    answer: "We protect your privacy by only showing approximate locations (with a random 800-1200m offset from your actual address), secure messaging, and community verification. Your exact address is never shared with other users.",
    category: "safety"
  },
  {
    question: "What should I do for my first meeting?",
    answer: "Always meet in a public place first, such as a local park or coffee shop. Bring your dog along if you're a pet owner, and take time to get to know each other. Trust your instincts and don't hesitate to reschedule if you're uncomfortable.",
    category: "safety"
  },
  {
    question: "What if something goes wrong?",
    answer: "If you encounter any issues, please contact us immediately. We have community guidelines and can help mediate disputes. For emergencies, always contact local authorities first.",
    category: "safety"
  },

  // For Pet Owners
  {
    question: "How do I find someone to walk my dog?",
    answer: "Create a profile, add your dogs, and browse the community requests section. You can also post your own request for dog walking or pet care. Use our messaging system to connect with potential walkers and arrange meetups.",
    category: "owners"
  },
  {
    question: "What information should I provide about my dog?",
    answer: "Include your dog's breed, age, temperament, any special needs, and photos. The more information you provide, the better matches you'll find. Be honest about your dog's behavior and any training requirements.",
    category: "owners"
  },
  {
    question: "Can I specify what activities I want for my dog?",
    answer: "Absolutely! You can request specific activities like walking, swimming, hiking, or just companionship. Be clear about your expectations and any restrictions or preferences you have.",
    category: "owners"
  },
  {
    question: "What if my dog doesn't get along with the walker?",
    answer: "Always do a trial walk or meeting first. If your dog isn't comfortable, don't force the situation. You can try different walkers or activities that better suit your dog's personality.",
    category: "owners"
  },

  // For Pet Lovers
  {
    question: "How do I offer to help with pet care?",
    answer: "Create a profile, share your availability, and browse requests from pet owners. You can also post your own availability for specific activities or times. Be clear about your experience level and what you're comfortable with.",
    category: "lovers"
  },
  {
    question: "What if I don't have experience with dogs?",
    answer: "That's okay! Many pet owners are happy to work with beginners. Be honest about your experience level, and many owners will provide guidance. Start with well-behaved, older dogs if you're new to pet care.",
    category: "lovers"
  },
  {
    question: "Can I specify what types of activities I'm comfortable with?",
    answer: "Yes! You can specify whether you prefer walking, playing, swimming, hiking, or just providing companionship. Be clear about your comfort level and any physical limitations.",
    category: "lovers"
  },
  {
    question: "What if I'm allergic to certain animals?",
    answer: "Be upfront about any allergies in your profile. Many pet owners have hypoallergenic breeds or can accommodate allergy concerns. You can also specify which types of pets you're comfortable with.",
    category: "lovers"
  },

  // Technical & Account
  {
    question: "How do I create an account?",
    answer: "Click 'Sign in' and use our magic link authentication. Simply enter your email address and we'll send you a secure login link. No password required!",
    category: "technical"
  },
  {
    question: "How do I update my profile?",
    answer: "Go to your Profile section and click 'Edit Profile'. You can update your information, add photos, modify your location, and change your preferences at any time.",
    category: "technical"
  },
  {
    question: "How does the messaging system work?",
    answer: "Our built-in messaging system allows secure communication between users. You can send messages, share photos, and coordinate meetups all within the platform. Messages are private and secure.",
    category: "technical"
  },
  {
    question: "Can I delete my account?",
    answer: "Yes, you can delete your account at any time through your profile settings. This will remove all your data from our platform. Please note that this action cannot be undone.",
    category: "technical"
  },

  // Community & Guidelines
  {
    question: "What are the community guidelines?",
    answer: "We promote kindness, respect, and safety. Be honest about your capabilities, treat others with respect, and prioritize the well-being of pets. We have zero tolerance for harassment or unsafe behavior.",
    category: "community"
  },
  {
    question: "Can I report inappropriate behavior?",
    answer: "Yes, please report any concerning behavior immediately. We take all reports seriously and will investigate. You can report through our contact form or messaging system.",
    category: "community"
  },
  {
    question: "How do I build trust in the community?",
    answer: "Be reliable, communicate clearly, and follow through on commitments. Start with shorter meetups and build up to longer activities. Good reviews and consistent behavior help build trust.",
    category: "community"
  },
  {
    question: "What if I need to cancel a planned activity?",
    answer: "Communicate as early as possible if you need to cancel. Be respectful of others' time and try to reschedule if appropriate. Regular cancellations may affect your community reputation.",
    category: "community"
  }
];

const categories = [
  { id: "all", name: "All Questions", icon: "❓" },
  { id: "general", name: "General", icon: "🏠" },
  { id: "safety", name: "Safety & Privacy", icon: "🔒" },
  { id: "owners", name: "For Pet Owners", icon: "🐕" },
  { id: "lovers", name: "For Pet Lovers", icon: "❤️" },
  { id: "technical", name: "Technical", icon: "⚙️" },
  { id: "community", name: "Community", icon: "🤝" }
];

export default function FAQPage() {
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [openItems, setOpenItems] = useState([]);

  const filteredFAQ = selectedCategory === "all" 
    ? faqData 
    : faqData.filter(item => item.category === selectedCategory);

  const toggleItem = (index) => {
    setOpenItems(prev => 
      prev.includes(index) 
        ? prev.filter(i => i !== index)
        : [...prev, index]
    );
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Frequently Asked Questions
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Everything you need to know about ShareSkippy and how to get the most out of our community
            </p>
          </div>
        </div>
      </div>

      {/* Category Filter */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-wrap gap-2 justify-center">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  selectedCategory === category.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <span className="mr-2">{category.icon}</span>
                {category.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* FAQ Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="space-y-4">
          {filteredFAQ.map((item, index) => (
            <div
              key={index}
              className="bg-white rounded-lg shadow-xs border border-gray-200 overflow-hidden"
            >
              <button
                onClick={() => toggleItem(index)}
                className="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <h3 className="text-lg font-semibold text-gray-900 pr-4">
                  {item.question}
                </h3>
                <span className="text-blue-600 text-xl">
                  {openItems.includes(index) ? '−' : '+'}
                </span>
              </button>
              {openItems.includes(index) && (
                <div className="px-6 pb-4">
                  <p className="text-gray-600 leading-relaxed">
                    {item.answer}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Still Have Questions */}
        <div className="mt-16 bg-white rounded-lg shadow-xs border border-gray-200 p-8 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Still Have Questions?
          </h2>
                      <p className="text-gray-600 mb-6">
              Can&apos;t find what you&apos;re looking for? Our community team is here to help!
            </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/dashboard"
              className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              Join Community
            </Link>
            <Link
              href="/safety"
              className="border-2 border-blue-600 text-blue-600 px-6 py-3 rounded-lg font-semibold hover:bg-blue-50 transition-colors"
            >
              Safety Guidelines
            </Link>
          </div>
        </div>

        {/* Quick Links */}
        <div className="mt-12 grid md:grid-cols-3 gap-6">
          <Link
            href="/dashboard"
            className="bg-white rounded-lg shadow-xs border border-gray-200 p-6 hover:shadow-md transition-shadow"
          >
            <div className="text-3xl mb-3">🤝</div>
            <h3 className="font-semibold text-gray-900 mb-2">Browse Community</h3>
            <p className="text-gray-600 text-sm">
              See what&apos;s happening in your local pet care community
            </p>
          </Link>
          <Link
            href="/share-availability"
            className="bg-white rounded-lg shadow-xs border border-gray-200 p-6 hover:shadow-md transition-shadow"
          >
            <div className="text-3xl mb-3">✨</div>
            <h3 className="font-semibold text-gray-900 mb-2">Share Availability</h3>
            <p className="text-gray-600 text-sm">
              Offer your time to help local pet owners
            </p>
          </Link>
          <Link
            href="/profile/edit"
            className="bg-white rounded-lg shadow-xs border border-gray-200 p-6 hover:shadow-md transition-shadow"
          >
            <div className="text-3xl mb-3">👤</div>
            <h3 className="font-semibold text-gray-900 mb-2">Update Profile</h3>
            <p className="text-gray-600 text-sm">
              Keep your profile current to find better matches
            </p>
          </Link>
        </div>
      </div>
    </div>
  );
}
