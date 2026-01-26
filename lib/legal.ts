/**
 * Legal configuration for ShareSkippy as a program of ShareVita
 * This file centralizes all legal disclosure text to ensure consistency
 * and easy updates when 501(c)(3) status changes.
 */

export const LEGAL = {
  umbrellaName: 'ShareVita',
  shortDisclosurePending:
    'ShareSkippy is a community program of ShareVita, a California nonprofit public benefit corporation (501(c)(3) determination pending).',
  shortDisclosureGranted:
    'ShareSkippy is a community program of ShareVita, a California 501(c)(3) nonprofit organization.',
  longDisclosure:
    'ShareSkippy ("we", "our", "us") is a community program of ShareVita, a California nonprofit public benefit corporation. ShareVita\'s IRS 501(c)(3) determination is pending. ShareSkippy remains the product/service brand; ShareVita is the legal entity responsible for governance and compliance.',
  status: 'pending' as 'pending' | 'granted',

  // Contact information
  contact: {
    legal: 'legal@sharevita.org', // Update when final
    support: 'support@shareskippy.com',
    jurisdiction: 'California, USA',
  },

  // Data controller statement
  dataController: 'Data Controller: ShareVita (for the ShareSkippy program).',

  // Donations/payments disclaimer
  donationsDisclaimer:
    'We do not process payments on this site. If donations become available, they will be receipted by ShareVita. Tax-deductibility applies only after IRS determination; consult your advisor.',

  // Terms definitions
  termsDefinitions:
    '"ShareSkippy", "we", "us", or "our" refers to the ShareSkippy community program operated by ShareVita, a California nonprofit public benefit corporation. "ShareVita" refers to the legal entity responsible for governance and compliance of the ShareSkippy program.',

  // FAQ disclosure
  faqDisclosure:
    'ShareSkippy is a program of ShareVita, a California nonprofit public benefit corporation (IRS 501(c)(3) determination pending).',

  // Get current disclosure based on status
  getCurrentDisclosure: () => {
    return LEGAL.status === 'granted' ? LEGAL.shortDisclosureGranted : LEGAL.shortDisclosurePending;
  },

  // Get current long disclosure
  getCurrentLongDisclosure: () => {
    return LEGAL.longDisclosure;
  },
};
