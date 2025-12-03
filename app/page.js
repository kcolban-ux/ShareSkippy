'use client';
import Image from 'next/image';
import { createClient } from '@/libs/supabase/client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { renderSchemaTags } from '@/libs/seo';
import { Star, ChevronLeft, ChevronRight } from 'lucide-react';
import demoimg from './demoimg.png';

// Carousel messages for the hero section
const carouselMessages = [
  "Going on a date? Grab a pup first — it's the perfect wingman. If it flops, at least someone's happy to see you. 🐾",
  'Need an instant mood booster? A wagging tail beats meditation apps, trust us. 🐶',
  'Owners get reliable walkers. Dog-lovers get their canine fix. Everyone swipes right on more belly rubs.',
  "Love dogs but don't love vet bills, pet insurance, and 5AM potty breaks? Borrow one instead. 100% joy, 0% pee stains.",
  'Think of us as Tinder for dogs… but without the awkward small talk.',
  'Have a dog desperate for a friend? Set up a puppy playdate. Warning: your dog might end up with a better social life than you.',
  "Some owners can't give their dogs enough walks — maybe they're elderly, disabled, or working 80-hour tech weeks. Meanwhile, plenty of dog lovers are dying to hike, run, or cuddle. We make the match.",
  'Some pups need more play, some humans need more pup. Put them together and boom — happy dogs, happy people, fewer chewed remotes.',
  'Your dog wants a marathon. You want a burrito. No shame — this is where ShareSkippy saves the day.',
  "When dogs get more love, humans get more joy. It's science. (Okay, maybe not peer-reviewed, but just look at their faces.)",
];

// Community stories
const communityStories = [
  {
    quote: 'I cant have a dog in my apartment, but now I hike with Max every week.',
    author: 'Sarah, Dog Lover',
    rating: 5,
    image: demoimg,
  },
  {
    quote:
      "I work from home and needed a break from Zoom meetings. Walking neighbors' dogs gives me fresh air, exercise, and some seriously good puppy therapy.",
    author: 'Mike, Remote Worker',
    rating: 5,
    image: demoimg,
  },
  {
    quote:
      "My dog has boundless energy, and I couldn't keep up. Now he gets playdates with other pups, and I get peace of mind knowing he's happy and socialized.",
    author: 'Lisa, Dog Owner',
    rating: 5,
    image: demoimg,
  },
  {
    quote: 'Recovering from surgery, my neighbors made sure Bella still got her daily walks.',
    author: 'David, Recovering Owner',
    rating: 5,
    image: demoimg,
  },
  {
    quote:
      'My parents are elderly and their dog, Charlie, needs more exercise than they can manage. Neighbors who step in have been a lifesaver — Charlie is thrilled, and my parents feel supported.',
    author: 'Jennifer, Family Member',
    rating: 5,
    image: demoimg,
  },
  {
    quote:
      'Single mom here — I was overwhelmed trying to juggle work, school, and my two kids. Now my pup gets outside while I prep dinner.',
    author: 'Maria, Single Parent',
    rating: 5,
    image: demoimg,
  },
  {
    quote:
      "I've always wanted a dog but live in an apartment that doesn't allow pets. Now I get weekend puppy cuddles, and it's the highlight of my week.",
    author: 'Alex, Apartment Dweller',
    rating: 5,
    image: demoimg,
  },
  {
    quote:
      "After moving to a new neighborhood, I didn't know anyone. Walking dogs with neighbors helped me make friends and get my daily steps in.",
    author: 'Tom, New Neighbor',
    rating: 5,
    image: demoimg,
  },
  {
    quote:
      "I work long hours and couldn't give Luna the walks she needed. Now neighbors help take her on hikes, and she's happier than ever.",
    author: 'Rachel, Busy Professional',
    rating: 5,
    image: demoimg,
  },
  {
    quote:
      'I was recovering from illness and worried about leaving my dog alone. With help from local dog lovers, he still gets daily playtime and has discovered his love for swimming.',
    author: 'James, Recovering Owner',
    rating: 5,
    image: demoimg,
  },
];

export default function Home() {
  const supabase = createClient();
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Animation duration constant to keep JS and CSS in sync
  const ANIMATION_DURATION = 100;

  const nextTestimonial = () => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setCurrentIndex((prevIndex) => (prevIndex + 1) % communityStories.length);
    setTimeout(() => setIsTransitioning(false), ANIMATION_DURATION);
  };

  const prevTestimonial = () => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setCurrentIndex(
      (prevIndex) => (prevIndex - 1 + communityStories.length) % communityStories.length
    );
    setTimeout(() => setIsTransitioning(false), ANIMATION_DURATION);
  };

  // SSR-safe position calculation - no window checks
  const getSlideStatus = (index) => {
    const total = communityStories.length;
    if (index === currentIndex) return 'active';
    if (index === (currentIndex + 1) % total) return 'next';
    if (index === (currentIndex - 1 + total) % total) return 'prev';
    return 'hidden';
  };

  // Get user session
  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user);
      setLoading(false);
    };
    getUser();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [supabase.auth]);

  // Redirect logged-in users to community page
  useEffect(() => {
    if (!loading && user) {
      router.push('/community');
    }
  }, [user, loading, router]);

  // Auto-rotate carousel messages
  useEffect(() => {
    if (isPaused) return;

    const interval = setInterval(() => {
      setCurrentMessageIndex((prev) => (prev + 1) % carouselMessages.length);
    }, 5000); // Changed to 5 seconds for better readability

    return () => clearInterval(interval);
  }, [isPaused]);

  // Handle carousel navigation
  const goToPrevious = () => {
    setCurrentMessageIndex((prev) => (prev - 1 < 0 ? carouselMessages.length - 1 : prev - 1));
  };

  const goToNext = () => {
    setCurrentMessageIndex((prev) => (prev + 1) % carouselMessages.length);
  };

  const togglePause = () => {
    setIsPaused(!isPaused);
  };

  // Handle button clicks - redirect to signin page
  const handleButtonClick = (e) => {
    e.preventDefault();
    window.location.href = '/signin';
  };

  // Show loading state while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen bg-linear-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Show loading state while redirecting logged-in users
  if (user) {
    return (
      <div className="min-h-screen bg-linear-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Redirecting to community...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {renderSchemaTags()}
      <div className="min-h-screen bg-linear-to-br from-blue-50 to-indigo-100">
        {/* Hero Section */}
        <section className="relative overflow-hidden pt-20 pb-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <div>
                <h1 className="text-5xl md:text-7xl font-bold text-gray-900 mb-6 leading-tight">
                  Happy Dogs.
                  <span className="block text-blue-600">Happy Humans.</span>
                  <span className="block text-indigo-600">Happier Neighborhoods.</span>
                </h1>

                <p className="text-xl md:text-2xl text-gray-700 mb-8 max-w-4xl mx-auto leading-relaxed">
                  ShareSkippy connects dog owners with dog lovers for free walks, hikes, cuddles,
                  and adventures — all without the cost or full-time responsibility of ownership.
                  Dogs get exercise and love, humans get companionship, and neighborhoods grow
                  stronger.
                </p>
              </div>

              {/* Carousel Messages */}
              <div className="relative mb-8 max-w-5xl mx-auto">
                <div className="flex items-center justify-center gap-2 sm:gap-4">
                  {/* Previous Button */}
                  <button
                    onClick={goToPrevious}
                    aria-label="Previous message"
                    className="shrink-0 p-2 sm:p-3 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-full transition-all transform hover:scale-110 active:scale-95"
                  >
                    <svg
                      className="w-6 h-6 sm:w-8 sm:h-8"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M15 18l-6-6 6-6" />
                    </svg>
                  </button>

                  {/* Carousel Content */}
                  <div
                    className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 sm:p-6 flex-1 border border-blue-200 shadow-lg cursor-pointer transition-all hover:shadow-xl"
                    onClick={togglePause}
                    title={isPaused ? 'Click to resume auto-play' : 'Click to pause auto-play'}
                  >
                    <p className="text-base sm:text-lg md:text-xl text-gray-800 italic min-h-12 flex items-center justify-center">
                      {carouselMessages[currentMessageIndex]}
                    </p>
                    <div className="flex justify-center items-center mt-4 space-x-2">
                      {carouselMessages.map((_, index) => (
                        <div
                          key={index}
                          className={`w-2 h-2 rounded-full transition-all ${
                            index === currentMessageIndex ? 'bg-blue-500 scale-125' : 'bg-gray-300'
                          }`}
                        />
                      ))}
                      {/* Pause indicator */}
                      {isPaused && <span className="ml-2 text-xs text-gray-500">(paused)</span>}
                    </div>
                  </div>

                  {/* Next Button */}
                  <button
                    onClick={goToNext}
                    aria-label="Next message"
                    className="shrink-0 p-2 sm:p-3 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-full transition-all transform hover:scale-110 active:scale-95"
                  >
                    <svg
                      className="w-6 h-6 sm:w-8 sm:h-8"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M9 18l6-6-6-6" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button
                  onClick={handleButtonClick}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-xl text-xl font-bold transition-all transform hover:scale-105 shadow-lg hover:shadow-xl"
                >
                  Share Your Dog
                </button>
                <button
                  onClick={handleButtonClick}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-4 rounded-xl text-xl font-bold transition-all transform hover:scale-105 shadow-lg hover:shadow-xl"
                >
                  Borrow a Dog
                </button>
              </div>
            </div>
          </div>

          {/* Decorative elements */}
          <div className="absolute top-20 left-10 w-16 h-16 bg-blue-400 rounded-full opacity-30 animate-bounce"></div>
          <div className="absolute top-40 right-20 w-12 h-12 bg-indigo-400 rounded-full opacity-30 animate-pulse"></div>
          <div className="absolute bottom-20 left-20 w-20 h-20 bg-blue-300 rounded-full opacity-20 animate-bounce"></div>
        </section>

        {/* How It Works Section */}
        <section className="py-20 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">How It Works</h2>
            </div>

            <div className="grid md:grid-cols-3 gap-12">
              <div className="text-center">
                <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <span className="text-4xl">👤</span>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4">Sniff Around</h3>
                <p className="text-xl text-gray-700">
                  Tell us if you&apos;re a pup parent, a petpal, or both
                </p>
              </div>

              <div className="text-center">
                <div className="w-24 h-24 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <span className="text-4xl">🤝</span>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4">Find Your Pack</h3>
                <p className="text-xl text-gray-700">
                  Build trusted connections with nearby pup parents and pet pals
                </p>
              </div>

              <div className="text-center">
                <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <span className="text-4xl">🐾</span>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4">Tail Wags for All</h3>
                <p className="text-xl text-gray-700">
                  Happy pups, happy people, happier neighborhoods
                </p>
              </div>
            </div>

            <div className="text-center mt-12">
              <button
                onClick={handleButtonClick}
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-xl text-xl font-bold transition-all transform hover:scale-105 shadow-lg"
              >
                Get Started Free
              </button>
            </div>
          </div>
        </section>

        {/* Why ShareSkippy Section */}
        <section className="py-20 bg-linear-to-r from-blue-50 to-indigo-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
                Why ShareSkippy?
              </h2>
            </div>

            <div className="grid md:grid-cols-3 gap-12">
              <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all">
                <div className="text-center mb-6">
                  <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-3xl">❤️</span>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-4">For Dog Lovers</h3>
                </div>
                <p className="text-lg text-gray-700 text-center">
                  Companionship & adventures, no ownership required
                </p>
              </div>

              <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all">
                <div className="text-center mb-6">
                  <div className="w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-3xl">🐕</span>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-4">For Dog Owners</h3>
                </div>
                <p className="text-lg text-gray-700 text-center">
                  Free help keeping pups happy & active
                </p>
              </div>

              <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all">
                <div className="text-center mb-6">
                  <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-3xl">🏘️</span>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-4">For Communities</h3>
                </div>
                <p className="text-lg text-gray-700 text-center">
                  Stronger neighborhood bonds through shared love for dogs
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Volunteering & Community Care Section */}
        <section className="py-20 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
                Help People, Help Dogs, Get Cuddles
              </h2>
            </div>

            <div className="max-w-4xl mx-auto text-center">
              <p className="text-xl text-gray-700 leading-relaxed mb-8">
                Vets estimate that over{' '}
                <strong>70% of city dogs don&apos;t get enough exercise</strong>. Life happens —
                some owners are elderly, recovering from illness, juggling long work hours, caring
                for kids on their own, or managing tight budgets. Pups still need to run, play, and
                explore. That&apos;s where you come in:{' '}
                <strong>
                  volunteer, make a dog&apos;s AND a human&apos;s day, and get the best reward ever:
                  puppy love
                </strong>
                .
              </p>

              <div className="text-center">
                <button
                  onClick={handleButtonClick}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-xl text-xl font-bold transition-all transform hover:scale-105 shadow-lg"
                >
                  Volunteer & Get Cuddles
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Safety & Trust Section */}
        <section className="py-20 bg-linear-to-r from-blue-50 to-indigo-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">Safety & Trust</h2>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center bg-white rounded-2xl p-8 shadow-lg">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">✅</span>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">
                  Verified Profiles & Reviews
                </h3>
                <p className="text-gray-700">
                  All members are verified and reviewed by the community
                </p>
              </div>

              <div className="text-center bg-white rounded-2xl p-8 shadow-lg">
                <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">🔒</span>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">
                  Privacy-First Location Protection
                </h3>
                <p className="text-gray-700">
                  Your exact location is never shared, only approximate areas
                </p>
              </div>

              <div className="text-center bg-white rounded-2xl p-8 shadow-lg">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">📞</span>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">Emergency Contacts</h3>
                <p className="text-gray-700">
                  Emergency contacts for peace of mind during all interactions
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Community Stories Section */}
        <section className="py-20 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
                Community Stories
              </h2>
            </div>

            <div className="bg-white py-5 mt-10 lg:mt-20">
              <div className="mx-auto container">
                {/* Carousel Container */}
                <div className="relative h-80 overflow-hidden">
                  {/* Navigation Arrows */}
                  <button
                    onClick={prevTestimonial}
                    className="hidden md:block absolute left-0 top-1/2 transform -translate-y-1/2 z-20 bg-blue-400 rounded-full p-2 shadow-md hover:bg-gray-100 transition-colors"
                    aria-label="Previous testimonial"
                  >
                    <ChevronLeft size={24} className="text-blue-300" />
                  </button>

                  <button
                    onClick={nextTestimonial}
                    className="hidden md:block absolute right-0 top-1/2 transform -translate-y-1/2 z-20 bg-white rounded-full p-2 shadow-md hover:bg-blue-400 transition-colors"
                    aria-label="Next testimonial"
                  >
                    <ChevronRight size={24} className="text-blue-300" />
                  </button>

                  {/* Cards */}
                  <div className="flex items-center justify-center w-full h-[400px] md:h-[450px] relative">
                    {communityStories.map((testimonial, index) => {
                      // Get status based purely on index math (SSR-safe)
                      const status = getSlideStatus(index);

                      // Optimization: Don't render slides that are completely off-screen
                      if (status === 'hidden') return null;

                      // Define classes based on position
                      // CRITICAL FIX: Use 'hidden md:block' for prev/next slides
                      // This allows server to render them, but browser hides them on mobile
                      let positionClasses = '';

                      if (status === 'prev') {
                        positionClasses =
                          'hidden md:block md:-rotate-12 left-0 md:right-20 md:-translate-x-25 opacity-80 scale-65';
                      } else if (status === 'next') {
                        positionClasses =
                          'hidden md:block md:rotate-12 right-0 md:right-30 md:translate-x-25 opacity-80 scale-65';
                      } else if (status === 'active') {
                        positionClasses =
                          'block z-10 scale-100 left-1/2 -translate-x-1/2 md:-translate-y-10';
                      }

                      return (
                        <div
                          key={index}
                          className={`absolute top-0 transition-all duration-500 ${positionClasses}`}
                        >
                          <div
                            className="border border-gray-200 rounded-4xl w-[350px] md:w-[447px] p-6 flex flex-col bg-[#F6F6F6] shadow-xl"
                            style={{ minHeight: '400px' }}
                          >
                            <div className="flex items-center mb-4">
                              <Image
                                src={testimonial.image}
                                alt={testimonial.author}
                                width={80}
                                height={80}
                                className="w-20 h-20 rounded-full object-cover mr-3"
                              />
                              <div>
                                <h3 className="font-semibold text-gray-900 text-xl md:text-2xl">
                                  {testimonial.author}
                                </h3>

                                <div className="flex items-center mt-1">
                                  {[...Array(5)].map((_, i) => (
                                    <Star
                                      key={i}
                                      size={16}
                                      className={
                                        i < testimonial.rating
                                          ? 'text-blue-400 fill-blue-600'
                                          : 'text-gray-300'
                                      }
                                    />
                                  ))}
                                </div>
                              </div>
                            </div>

                            {/* Content */}
                            <p className="text-gray-700 text-lg md:text-[20px] grow mt-2 italic">
                              &quot;{testimonial.quote}&quot;
                            </p>

                            <hr className="border-gray-200 mt-4" />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/*Indicator */}
                <div className=" mt-3 flex justify-center space-x-4">
                  {communityStories.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentIndex(index)}
                      className={`w-6 h-2 rounded-lg  cursor-pointer ${
                        currentIndex === index ? 'bg-blue-600' : 'bg-gray-300'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="text-center mt-12">
              <button
                onClick={handleButtonClick}
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-xl text-xl font-bold transition-all transform hover:scale-105 shadow-lg"
              >
                Join Now
              </button>
            </div>
          </div>
        </section>
        {/* new community stories */}

        {/* Closing CTA Section */}
        <section className="py-20 bg-linear-to-br from-blue-600 to-indigo-600">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Join the dog-sharing community that puts love before money.
            </h2>
            <p className="text-xl text-blue-100 mb-8">
              Help dogs, support neighbors, and share the joy of companionship.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={handleButtonClick}
                className="bg-white text-blue-600 hover:bg-gray-100 px-8 py-4 rounded-xl text-xl font-bold transition-all transform hover:scale-105 shadow-lg"
              >
                Share Your Dog
              </button>
              <button
                onClick={handleButtonClick}
                className="bg-white text-indigo-600 hover:bg-gray-100 px-8 py-4 rounded-xl text-xl font-bold transition-all transform hover:scale-105 shadow-lg"
              >
                Borrow a Dog
              </button>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
