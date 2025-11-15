import Callout from './Callout';

const safetyItems = [
  'Always meet in public places initially',
  'Bring a friend or family member to first meetings',
  "Trust your instincts - if something feels wrong, don't proceed",
  'Keep emergency contact information handy',
  "Let someone know where you're going and when you'll be back",
  'For dog emergencies, contact the owner immediately and seek veterinary care',
  'Report any concerning behavior to ShareSkippy support',
  'Keep emergency contact information for both humans and dogs readily available',
];

/**
 * Displays a quick safety reminder list for users and guests.
 */
export default function SafetyChecklist() {
  return (
    <Callout tone="red" title="✅ Quick Safety Checklist">
      <ul className="list-disc list-inside space-y-1">
        {safetyItems.map((item, index) => (
          <li key={index}>{item}</li>
        ))}
      </ul>
    </Callout>
  );
}
