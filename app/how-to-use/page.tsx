import { Metadata } from 'next';
import Link from 'next/link';
import { metadata as pageMetadata } from './metadata';
import FaqJsonLd from './FaqJsonLd';
import ScrollSpyToc from '@/components/HowTo/ScrollSpyToc';
import MobileToc from '@/components/HowTo/MobileToc';
import SectionHeading from '@/components/HowTo/SectionHeading';
import Callout from '@/components/HowTo/Callout';
import SafetyChecklist from '@/components/HowTo/SafetyChecklist';
import Badge from '@/components/ui/Badge';


export const metadata: Metadata = pageMetadata;

const SECTIONS = [
  { id: 'what-is-shareskippy', label: 'What is ShareSkippy?' },
  { id: 'getting-started', label: 'Getting Started' },
  { id: 'understanding-posts', label: 'Understanding Availability Posts' },
  { id: 'creating-posts', label: 'Creating Availability Posts' },
  { id: 'finding-opportunities', label: 'Finding Opportunities' },
  { id: 'connecting', label: 'Connecting with Others' },
  { id: 'scheduling', label: 'Scheduling Meetings' },
  { id: 'reviews', label: 'Reviews & Trust' },
  { id: 'managing-posts', label: 'Managing Your Posts' },
  { id: 'account-management', label: 'Account Management' },
  { id: 'safety', label: 'Safety & Guidelines' },
  { id: 'getting-help', label: 'Getting Help' },
];

export default function HowToUsePage() {
  return (
    <>
      <FaqJsonLd />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Main Content */}
            <main role="main" className="lg:col-span-3 space-y-12">
              {/* Header */}
              <div className="text-center">
                <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-4">
                  🐕 How to Use ShareSkippy
                </h1>
                <p className="text-xl text-gray-700 max-w-3xl mx-auto">
                  Your complete guide to connecting with fellow dog lovers and building a stronger community through shared dog care experiences.
                </p>
              </div>

              {/* Mobile TOC */}
              <MobileToc sections={SECTIONS} />

              {/* Section 1: What is ShareSkippy */}
              <section id="what-is-shareskippy">
                <div className="bg-white rounded-xl shadow-lg p-8">
                  <SectionHeading id="what-is-shareskippy">🐕 What is ShareSkippy?</SectionHeading>
                  <div className="prose prose-lg max-w-none mt-6">
                    <p className="text-gray-700 mb-4">
                      ShareSkippy is a community-driven platform that connects dog owners with dog lovers for free, collaborative dog care experiences. We believe in building stronger neighborhoods through shared love for dogs.
                    </p>
                    <div className="grid md:grid-cols-3 gap-6 mt-6">
                      <div className="text-center p-4 bg-blue-50 rounded-lg">
                        <div className="text-3xl mb-2">🐕</div>
                        <h3 className="font-semibold text-gray-900 mb-2">For Dog Owners</h3>
                        <p className="text-sm text-gray-600">Find trusted neighbors to help with dog walking, sitting, and care when you need it.</p>
                      </div>
                      <div className="text-center p-4 bg-green-50 rounded-lg">
                        <div className="text-3xl mb-2">🤝</div>
                        <h3 className="font-semibold text-gray-900 mb-2">For Dog Lovers</h3>
                        <p className="text-sm text-gray-600">Get your canine fix without the full-time responsibility of ownership.</p>
                      </div>
                      <div className="text-center p-4 bg-purple-50 rounded-lg">
                        <div className="text-3xl mb-2">🏘️</div>
                        <h3 className="font-semibold text-gray-900 mb-2">For Communities</h3>
                        <p className="text-sm text-gray-600">Build stronger neighborhood bonds through shared dog care experiences.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* Section 2: Getting Started */}
              <section id="getting-started">
                <div className="bg-white rounded-xl shadow-lg p-8">
                  <SectionHeading id="getting-started">🚀 Getting Started</SectionHeading>
                  <div className="space-y-6 mt-6">
                    <div className="flex items-start space-x-4">
                      <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">1</div>
                      <div>
                        <h3 className="text-xl font-semibold text-gray-900 mb-2">Create Your Profile</h3>
                        <p className="text-gray-700 mb-2">Start by creating your ShareSkippy profile with basic information about yourself.</p>
                        <ul className="list-disc list-inside text-gray-600 space-y-1">
                          <li>Add your name, photo, and bio</li>
                          <li>Set your location (neighborhood and city)</li>
                          <li>Add emergency contact information</li>
                          <li>Choose your role: Dog Owner, Dog Walker, or Both</li>
                        </ul>
                      </div>
                    </div>
                    
                    <div className="flex items-start space-x-4">
                      <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">2</div>
                      <div>
                        <h3 className="text-xl font-semibold text-gray-900 mb-2">Add Your Dogs (If You're a Dog Owner)</h3>
                        <p className="text-gray-700 mb-2">Create detailed profiles for each of your dogs to help others understand their needs.</p>
                        <ul className="list-disc list-inside text-gray-600 space-y-1">
                          <li>Upload photos of your dogs</li>
                          <li>Add breed, age, size, and temperament information</li>
                          <li>Specify training status and special needs</li>
                          <li>List activities your dogs enjoy</li>
                          <li>Set friendliness preferences (dogs, cats, kids)</li>
                        </ul>
                      </div>
                    </div>
                    
                    <div className="flex items-start space-x-4">
                      <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">3</div>
                      <div>
                        <h3 className="text-xl font-semibold text-gray-900 mb-2">Explore the Community</h3>
                        <p className="text-gray-700 mb-2">Visit the Community page to see what's available in your area.</p>
                        <ul className="list-disc list-inside text-gray-600 space-y-1">
                          <li>Browse dog availability posts</li>
                          <li>Check out PetPal availability posts</li>
                          <li>Read community guidelines and safety tips</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* Section 3: Understanding Availability Posts */}
              <section id="understanding-posts">
                <div className="bg-white rounded-xl shadow-lg p-8">
                  <SectionHeading id="understanding-posts">📋 Understanding Availability Posts</SectionHeading>
                  <div className="space-y-8 mt-6">
                    <Callout tone="blue" title="🐕 Dog Availability Posts">
                      <p className="mb-3">These are posts made by dog owners when their dogs are available for walks, playdates, or care.</p>
                      <ul className="list-disc list-inside space-y-1">
                        <li>Show when your dogs are available</li>
                        <li>Include which dogs are available</li>
                        <li>Specify preferred activities (walks, playdates, etc.)</li>
                        <li>Set location and transportation options</li>
                        <li>Add special instructions or requirements</li>
                      </ul>
                    </Callout>
                    
                    <Callout tone="green" title="🤝 PetPal Availability Posts">
                      <p className="mb-3">These are posts made by dog lovers when they're available to help with other people's dogs.</p>
                      <ul className="list-disc list-inside space-y-1">
                        <li>Show when you're available to help</li>
                        <li>Specify what activities you can do (walking, sitting, etc.)</li>
                        <li>Set your location and transportation capabilities</li>
                        <li>Add your experience level and preferences</li>
                        <li>Include any special skills or certifications</li>
                      </ul>
                    </Callout>
                    
                    <Callout tone="purple" title="📅 My Availability">
                      <p className="mb-3">This section shows all your own availability posts, both active and inactive.</p>
                      <ul className="list-disc list-inside space-y-1">
                        <li>View all your posts in one place</li>
                        <li>Edit or update existing posts</li>
                        <li>Hide posts when no longer needed</li>
                        <li>Track which posts are getting responses</li>
                      </ul>
                    </Callout>
                  </div>
                </div>
              </section>

              {/* Section 4: Creating Availability Posts */}
              <section id="creating-posts">
                <div className="bg-white rounded-xl shadow-lg p-8">
                  <SectionHeading id="creating-posts">✏️ Creating Availability Posts</SectionHeading>
                  <div className="space-y-6 mt-6">
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-4">For Dog Owners: Sharing Your Dog's Availability</h3>
                      <Callout tone="blue">
                        <ol className="list-decimal list-inside space-y-3">
                          <li>Go to the Community page and click "Share Availability"</li>
                          <li>Select "Dog Available" as your post type</li>
                          <li>Choose which of your dogs are available</li>
                          <li>Set your availability schedule (days and times)</li>
                          <li>Add a title and description for your post</li>
                          <li>Set your location (use profile location or specify a custom location)</li>
                          <li>Choose transportation options (can you pick up/drop off?)</li>
                          <li>Add any special instructions or requirements</li>
                          <li>Mark if this is urgent or needs community support</li>
                          <li>Publish your post!</li>
                        </ol>
                      </Callout>
                    </div>
                    
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-4">For PetPals: Offering Your Help</h3>
                      <Callout tone="green">
                        <ol className="list-decimal list-inside space-y-3">
                          <li>Go to the Community page and click "Share Availability"</li>
                          <li>Select "PetPal Available" as your post type</li>
                          <li>Set your availability schedule (days and times)</li>
                          <li>Add a title describing what help you can offer</li>
                          <li>Write a description of your experience and preferences</li>
                          <li>Set your location and transportation capabilities</li>
                          <li>Specify what activities you can do (walking, sitting, etc.)</li>
                          <li>Add any special skills or certifications</li>
                          <li>Publish your post!</li>
                        </ol>
                      </Callout>
                    </div>
                    
                    <Callout tone="yellow" title="💡 Pro Tips for Great Posts:">
                      <ul className="list-disc list-inside space-y-1">
                        <li>Be specific about times and activities</li>
                        <li>Include photos of your dogs (for dog availability posts)</li>
                        <li>Mention any special requirements or preferences</li>
                        <li>Use clear, friendly language</li>
                        <li>Update your posts regularly to keep them current</li>
                      </ul>
                    </Callout>
                  </div>
                </div>
              </section>

              {/* Section 5: Finding Opportunities */}
              <section id="finding-opportunities">
                <div className="bg-white rounded-xl shadow-lg p-8">
                  <SectionHeading id="finding-opportunities">🔍 Finding Opportunities</SectionHeading>
                  <div className="space-y-6 mt-6">
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-4">Browsing Dog Availability Posts</h3>
                      <p className="text-gray-700 mb-4">Find dogs in your area that need walks, playdates, or care.</p>
                      <Callout tone="blue" title="What you'll see:">
                        <ul className="list-disc list-inside space-y-1">
                          <li>Dog photos and basic information (name, breed, size)</li>
                          <li>Owner's name and location</li>
                          <li>Available schedule (days and times)</li>
                          <li>Activity preferences and special instructions</li>
                          <li>Transportation options (pick up/drop off available)</li>
                          <li>Community support badges for those needing extra help</li>
                          <li>Urgency indicators for time-sensitive needs</li>
                        </ul>
                      </Callout>
                    </div>
                    
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-4">Browsing PetPal Availability Posts</h3>
                      <p className="text-gray-700 mb-4">Find people in your area who are available to help with your dogs.</p>
                      <Callout tone="green" title="What you'll see:">
                        <ul className="list-disc list-inside space-y-1">
                          <li>PetPal's name and profile photo</li>
                          <li>Their location and availability schedule</li>
                          <li>Services they can provide</li>
                          <li>Experience level and special skills</li>
                          <li>Transportation capabilities</li>
                          <li>Any preferences or limitations</li>
                        </ul>
                      </Callout>
                    </div>
                    
                    <Callout tone="purple" title="🎯 Understanding Post Badges:">
                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <Badge variant="yellow" className="mb-2">🤝 Community Support</Badge>
                          <p className="text-sm text-gray-600">This person needs extra help (elderly, disabled, single parent, etc.)</p>
                        </div>
                        <div>
                          <Badge variant="red" className="mb-2">🚨 Urgent</Badge>
                          <p className="text-sm text-gray-600">This is a time-sensitive request that needs immediate attention</p>
                        </div>
                        <div>
                          <Badge variant="green" className="mb-2">🚗 Can Pick Up & Drop Off</Badge>
                          <p className="text-sm text-gray-600">This person can provide transportation for the dog</p>
                        </div>
                      </div>
                    </Callout>
                  </div>
                </div>
              </section>

              {/* Section 6: Connecting with Others */}
              <section id="connecting">
                <div className="bg-white rounded-xl shadow-lg p-8">
                  <SectionHeading id="connecting">💬 Connecting with Others</SectionHeading>
                  <div className="space-y-6 mt-6">
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-4">Sending Messages</h3>
                      <Callout tone="blue">
                        <ol className="list-decimal list-inside space-y-3">
                          <li>Find an availability post that interests you</li>
                          <li>Click the "Send Message" button</li>
                          <li>A message modal will open with the post owner's information</li>
                          <li>Write a friendly message introducing yourself</li>
                          <li>Mention why you're interested in their post</li>
                          <li>Ask any questions you have</li>
                          <li>Send your message!</li>
                        </ol>
                      </Callout>
                    </div>
                    
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-4">Managing Conversations</h3>
                      <p className="text-gray-700 mb-4">All your conversations are organized in the Messages page.</p>
                      <Callout tone="green" title="In the Messages page you can:">
                        <ul className="list-disc list-inside space-y-1">
                          <li>View all your active conversations</li>
                          <li>See message previews and timestamps</li>
                          <li>Continue conversations with other users</li>
                          <li>Schedule meetings directly from conversations</li>
                          <li>Access conversation history</li>
                        </ul>
                      </Callout>
                    </div>
                    
                    <Callout tone="yellow" title="💡 Tips for Great Messages:">
                      <ul className="list-disc list-inside space-y-1">
                        <li>Be friendly and introduce yourself</li>
                        <li>Mention why you're interested in their post</li>
                        <li>Ask relevant questions about their needs or preferences</li>
                        <li>Share a bit about your experience with dogs</li>
                        <li>Be respectful and patient in your communication</li>
                      </ul>
                    </Callout>
                  </div>
                </div>
              </section>

              {/* Section 7: Scheduling Meetings */}
              <section id="scheduling">
                <div className="bg-white rounded-xl shadow-lg p-8">
                  <SectionHeading id="scheduling">📅 Scheduling Meetings</SectionHeading>
                  <div className="space-y-6 mt-6">
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-4">Requesting a Meeting</h3>
                      <Callout tone="blue">
                        <ol className="list-decimal list-inside space-y-3">
                          <li>In an active conversation, click "Schedule Meeting"</li>
                          <li>Fill out the meeting request form:</li>
                          <ul className="list-disc list-inside ml-4 mt-2 space-y-1">
                            <li>Meeting title (e.g., "Dog Walking Meetup")</li>
                            <li>Start date and time</li>
                            <li>End date and time</li>
                            <li>Meeting place (specific location)</li>
                            <li>Additional details (optional)</li>
                          </ul>
                          <li>Send the meeting request</li>
                          <li>The other person will receive a notification and can accept or reject</li>
                        </ol>
                      </Callout>
                    </div>
                    
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-4">Managing Meeting Requests</h3>
                      <p className="text-gray-700 mb-4">All your meetings are tracked in the Meetings page.</p>
                      <Callout tone="green" title="Meeting Statuses:">
                        <div className="space-y-2">
                          <div className="flex items-center space-x-2">
                            <span className="w-3 h-3 bg-yellow-400 rounded-full"></span>
                            <span className="text-sm"><strong>Pending:</strong> Waiting for the other person to respond</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className="w-3 h-3 bg-green-400 rounded-full"></span>
                            <span className="text-sm"><strong>Scheduled:</strong> Meeting has been accepted and confirmed</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className="w-3 h-3 bg-purple-400 rounded-full"></span>
                            <span className="text-sm"><strong>Completed:</strong> Meeting has finished</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className="w-3 h-3 bg-gray-400 rounded-full"></span>
                            <span className="text-sm"><strong>Cancelled:</strong> Meeting was cancelled by either party</span>
                          </div>
                        </div>
                      </Callout>
                    </div>
                    
                    <Callout tone="yellow" title="📋 Meeting Best Practices:">
                      <ul className="list-disc list-inside space-y-1">
                        <li>Choose public, safe meeting locations</li>
                        <li>Be specific about meeting times and places</li>
                        <li>Communicate any special requirements beforehand</li>
                        <li>Confirm the meeting a day before</li>
                        <li>Bring necessary supplies (leashes, treats, etc.)</li>
                        <li>Have emergency contact information ready</li>
                      </ul>
                    </Callout>
                  </div>
                </div>
              </section>

              {/* Section 8: Reviews & Trust */}
              <section id="reviews">
                <div className="bg-white rounded-xl shadow-lg p-8">
                  <SectionHeading id="reviews">⭐ Reviews & Trust</SectionHeading>
                  <div className="space-y-6 mt-6">
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-4">Leaving Reviews</h3>
                      <p className="text-gray-700 mb-4">After a completed meeting, you can leave a review to help build trust in the community.</p>
                      <Callout tone="blue">
                        <ol className="list-decimal list-inside space-y-3">
                          <li>Go to your Meetings page</li>
                          <li>Find a completed meeting</li>
                          <li>Click "Leave Review"</li>
                          <li>Rate the experience (1-5 stars)</li>
                          <li>Write a comment (minimum 5 words)</li>
                          <li>Submit your review</li>
                        </ol>
                      </Callout>
                    </div>
                    
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-4">Understanding Reviews</h3>
                      <Callout tone="green" title="Reviews help you:">
                        <ul className="list-disc list-inside space-y-1">
                          <li>Learn about other users' experiences</li>
                          <li>Make informed decisions about who to work with</li>
                          <li>Build your own reputation in the community</li>
                          <li>Help others find reliable dog care partners</li>
                        </ul>
                      </Callout>
                    </div>
                    
                    <Callout tone="yellow" title="💡 Writing Helpful Reviews:">
                      <ul className="list-disc list-inside space-y-1">
                        <li>Be honest and constructive</li>
                        <li>Focus on the experience and communication</li>
                        <li>Mention specific positive aspects</li>
                        <li>Be respectful even if the experience wasn't perfect</li>
                        <li>Help others understand what to expect</li>
                      </ul>
                    </Callout>
                  </div>
                </div>
              </section>

              {/* Section 9: Managing Your Posts */}
              <section id="managing-posts">
                <div className="bg-white rounded-xl shadow-lg p-8">
                  <SectionHeading id="managing-posts">⚙️ Managing Your Posts</SectionHeading>
                  <div className="space-y-6 mt-6">
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-4">Editing Availability Posts</h3>
                      <Callout tone="blue">
                        <ol className="list-decimal list-inside space-y-3">
                          <li>Go to the Community page</li>
                          <li>Click on the "My Availability" tab</li>
                          <li>Find the post you want to edit</li>
                          <li>Click the "Edit" button</li>
                          <li>Make your changes</li>
                          <li>Save your updates</li>
                        </ol>
                      </Callout>
                    </div>
                    
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-4">Hiding Old Posts</h3>
                      <Callout tone="green">
                        <p className="mb-3">When a post is no longer relevant, you can hide it instead of deleting it completely.</p>
                        <ol className="list-decimal list-inside space-y-2">
                          <li>Go to "My Availability" tab</li>
                          <li>Find the post you want to hide</li>
                          <li>Click "Hide Post"</li>
                          <li>Confirm that you want to hide it</li>
                        </ol>
                        <p className="text-sm text-gray-600 mt-3">
                          <strong>Note:</strong> Hidden posts won't be visible to other users, but existing conversations will be preserved.
                        </p>
                      </Callout>
                    </div>
                    
                    <Callout tone="yellow" title="💡 Post Management Tips:">
                      <ul className="list-disc list-inside space-y-1">
                        <li>Update your posts regularly to keep them current</li>
                        <li>Hide posts when you're no longer available</li>
                        <li>Edit posts to reflect schedule changes</li>
                        <li>Keep your descriptions clear and up-to-date</li>
                        <li>Respond to messages promptly to maintain good relationships</li>
                      </ul>
                    </Callout>
                  </div>
                </div>
              </section>

              {/* Section 10: Account Management */}
              <section id="account-management">
                <div className="bg-white rounded-xl shadow-lg p-8">
                  <SectionHeading id="account-management">👤 Account Management</SectionHeading>
                  <div className="space-y-6 mt-6">
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-4">Updating Your Profile</h3>
                      <Callout tone="blue">
                        <p className="mb-3">Keep your profile information current to help others get to know you better.</p>
                        <ul className="list-disc list-inside space-y-1">
                          <li>Update your bio and interests</li>
                          <li>Change your profile photo</li>
                          <li>Update your location information</li>
                          <li>Modify your emergency contact details</li>
                          <li>Adjust your role preferences</li>
                        </ul>
                      </Callout>
                    </div>
                    
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-4">Managing Your Dogs</h3>
                      <Callout tone="green">
                        <p className="mb-3">Keep your dog profiles up-to-date with current information.</p>
                        <ul className="list-disc list-inside space-y-1">
                          <li>Add new dogs to your profile</li>
                          <li>Update existing dog information</li>
                          <li>Change photos and descriptions</li>
                          <li>Update training status and preferences</li>
                          <li>Modify activity preferences</li>
                        </ul>
                      </Callout>
                    </div>
                    
                    <Callout tone="yellow" title="💡 Profile Best Practices:">
                      <ul className="list-disc list-inside space-y-1">
                        <li>Use clear, recent photos</li>
                        <li>Write a friendly, informative bio</li>
                        <li>Keep contact information current</li>
                        <li>Be honest about your experience level</li>
                        <li>Update information when things change</li>
                      </ul>
                    </Callout>
                  </div>
                </div>
              </section>

              {/* Section 11: Safety & Guidelines */}
              <section id="safety">
                <div className="bg-white rounded-xl shadow-lg p-8">
                  <SectionHeading id="safety">🛡️ Safety & Guidelines</SectionHeading>
                  <div className="space-y-6 mt-6">
                    <Callout tone="red" title="🚨 Safety First">
                      <p className="mb-3">Your safety and the safety of the dogs is our top priority.</p>
                      <SafetyChecklist />
                    </Callout>
                    
                    <div className="grid md:grid-cols-2 gap-6">
                      <Callout tone="blue" title="📋 Community Guidelines">
                        <p className="text-sm mb-3">We have established guidelines to ensure a positive experience for everyone.</p>
                        <Link href="/community-guidelines" className="text-blue-600 hover:text-blue-800 font-medium">
                          Read Community Guidelines →
                        </Link>
                      </Callout>
                      
                      <Callout tone="green" title="🛡️ Safety Tips">
                        <p className="text-sm mb-3">Learn more about staying safe while using ShareSkippy.</p>
                        <Link href="/safety" className="text-green-600 hover:text-green-800 font-medium">
                          Read Safety Tips →
                        </Link>
                      </Callout>
                    </div>
                  </div>
                </div>
              </section>

              {/* Section 12: Getting Help */}
              <section id="getting-help">
                <div className="bg-white rounded-xl shadow-lg p-8">
                  <SectionHeading id="getting-help">🆘 Getting Help</SectionHeading>
                  <div className="space-y-6 mt-6">
                    <div className="grid md:grid-cols-2 gap-6">
                      <Callout tone="blue" title="❓ Frequently Asked Questions">
                        <p className="text-sm mb-3">Find answers to common questions about using ShareSkippy.</p>
                        <Link href="/faq" className="text-blue-600 hover:text-blue-800 font-medium">
                          Visit FAQ Page →
                        </Link>
                      </Callout>
                      
                      <Callout tone="green" title="📄 Privacy Policy">
                        <p className="text-sm mb-3">Learn how we protect your privacy and data.</p>
                        <Link href="/privacy-policy" className="text-green-600 hover:text-green-800 font-medium">
                          Read Privacy Policy →
                        </Link>
                      </Callout>
                    </div>
                    
                    <div className="mt-8 p-6 bg-gray-50 rounded-lg">
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">Contact Support</h3>
                      <p className="text-gray-600">
                        Need help or want to report an issue? We're here to help!{' '}
                        <a 
                          href="mailto:kcolban@gmail.com" 
                          className="text-purple-600 hover:text-purple-700 font-medium underline"
                        >
                          Email Us!
                        </a>
                      </p>
                    </div>
                  </div>
                </div>
              </section>

              {/* Footer */}
              <div className="text-center py-8">
                <p className="text-gray-600 mb-4">
                  Ready to start connecting with fellow dog lovers in your community?
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Link
                    href="/community"
                    className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200 font-medium"
                  >
                    Explore Community →
                  </Link>
                  <Link
                    href="/share-availability"
                    className="bg-gradient-to-r from-green-600 to-blue-600 text-white px-6 py-3 rounded-lg hover:from-green-700 hover:to-blue-700 transition-all duration-200 font-medium"
                  >
                    Post Availability →
                  </Link>
                </div>
              </div>
            </main>

            {/* Desktop TOC Sidebar */}
            <aside className="hidden lg:block">
              <ScrollSpyToc sections={SECTIONS} />
            </aside>
          </div>
        </div>
      </div>
    </>
  );
}
