import Link from 'next/link';
import { getSEOTags } from '@/libs/seo';
import config from '@/config';
import { LEGAL } from '@/lib/legal';

export const metadata = getSEOTags({
  title: `Privacy Policy | ${config.appName}`,
  canonicalUrlRelative: '/privacy-policy',
});

const PrivacyPolicy = () => {
  return (
    <main className="max-w-xl mx-auto">
      <div className="p-5">
        <Link href="/" className="btn btn-ghost">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="w-5 h-5"
          >
            <path
              fillRule="evenodd"
              d="M15 10a.75.75 0 01-.75.75H7.612l2.158 1.96a.75.75 0 11-1.04 1.08l-3.5-3.25a.75.75 0 010-1.08l3.5-3.25a.75.75 0 111.04 1.08L7.612 9.25h6.638A.75.75 0 0115 10z"
              clipRule="evenodd"
            />
          </svg>{' '}
          Back
        </Link>

        <h1 className="text-3xl font-extrabold pb-6">Privacy Policy for {config.appName}</h1>

        <pre className="leading-relaxed whitespace-pre-wrap" style={{ fontFamily: 'sans-serif' }}>
          {`Last Updated: January 16, 2026

Thank you for visiting ShareSkippy ("we," "us," or "our"). This Privacy Policy explains how we collect, use, and protect your personal and non-personal information when you use our website at https://shareskippy.com (the "Website").

${LEGAL.getCurrentLongDisclosure()}

By accessing or using the Website, you agree to this Privacy Policy. If you do not agree, please do not use the Website.

1. Eligibility

ShareSkippy is intended for individuals 18 years of age or older. By using the service, you represent and warrant that you are at least 18 years old.

2. Information We Collect

2.1 Personal Information

We may collect the following personal information:
- Name
- Email address
- General location
- Phone number (optional)
- Profile photos of you and your dogs

This information is used to facilitate community connections, communication, and safety.

2.2 Dog Information

We may collect information about your dogs, including:
- Breed, age, and size
- Temperament and behavior characteristics
- Vaccination status and health-related information
- Photos and descriptions

2.3 Non-Personal Information

We collect non-personal information such as IP address, browser type, device information, and usage data through cookies and analytics tools to improve our services and user experience.

3. How We Use Your Information

We use your information to:
- Connect dog owners and dog lovers
- Facilitate meetups and community interactions
- Communicate important updates and notifications
- Improve platform functionality and safety
- Enforce our Terms of Service
- Promote and market ShareSkippy (including uploaded photos)

4. Use of Photos for Marketing

Photos uploaded to ShareSkippy, including profile photos and dog photos, may be used for marketing and promotional purposes related to ShareSkippy, such as on our website, social media channels, and promotional materials.

Users retain ownership of their photos. Any marketing use of photos is limited to promoting ShareSkippy and is subject to the license granted in our Terms of Service.

If you would like a specific photo removed from marketing materials, you may contact us at support@shareskippy.com, and we will make reasonable efforts to comply.

5. Data Sharing

5.1 Community Visibility  
Certain profile information (such as name, photos, and general location) is visible to other community members to facilitate connections.

5.2 Third-Party Sharing  
We do not sell or rent your personal data. We may share data only:
- To comply with legal obligations
- With trusted service providers under confidentiality agreements
- In emergency situations involving safety

6. Data Security

We take reasonable measures to protect your information, including encryption, access controls, and regular security reviews. However, no system is 100% secure.

7. Children’s Privacy

ShareSkippy is not intended for individuals under 18 years of age. We do not knowingly collect personal information from individuals under 18.

If we become aware that a user under 18 has provided personal information, we will take reasonable steps to delete such information and terminate the account.

8. Data Retention

We retain personal data as long as your account is active or as needed to provide services. You may request deletion of your account and associated data at any time.

9. Your Rights

You have the right to:
- Access your personal data
- Correct or update your information
- Request deletion of your data
- Opt out of certain communications
- Request a copy of your data

10. Updates to This Privacy Policy

We may update this Privacy Policy from time to time. Significant changes will be communicated via email or posted on this page.

11. Data Controller

${LEGAL.dataController}
Contact: ${LEGAL.contact.legal}

12. Contact Information

If you have any questions or requests regarding this Privacy Policy, please contact us at:

Legal: ${LEGAL.contact.legal}  
Support: ${LEGAL.contact.support}

By using ShareSkippy, you consent to this Privacy Policy.`}
        </pre>
      </div>
    </main>
  );
};

export default PrivacyPolicy;
