import { Navigate, useParams } from 'react-router-dom';
import { AppHeader } from '@/components/layout/AppHeader';
import { BRAND, LEGAL, PRICING } from '@/config/brand';

/**
 * Policy pages. Written as plain, non-promotional text — the platform connects
 * strangers, so guarantees about relationships or replies are deliberately
 * absent.
 *
 * NOTE FOR THE OWNER: these are reasonable starting drafts, not legal advice.
 * Have them reviewed before you take real payments.
 */

type Section = { heading: string; paragraphs: string[] };

const PAGES: Record<string, { title: string; intro: string; sections: Section[] }> = {
  guidelines: {
    title: 'Community guidelines',
    intro: `${BRAND.name} exists so people can meet and talk respectfully. These rules apply to everyone.`,
    sections: [
      {
        heading: 'Be respectful',
        paragraphs: [
          'Treat everyone with courtesy. Harassment, hate speech, threats, sexual harassment and discrimination of any kind are not allowed.',
          'No means no. If someone does not reply or ends a conversation, respect that decision.',
        ],
      },
      {
        heading: 'Be genuine',
        paragraphs: [
          'Do not impersonate anyone or misrepresent who you are.',
          'Do not use the platform for advertising, recruitment, or any commercial solicitation.',
        ],
      },
      {
        heading: 'Keep it legal and safe',
        paragraphs: [
          `You must be at least ${BRAND.minimumAge} years old to use ${BRAND.name}.`,
          'Nudity, sexual content involving minors, violence, illegal goods and fraud are strictly prohibited and will be reported to the authorities where required.',
          'Never send money to another user, and never share bank details, OTPs or passwords.',
        ],
      },
      {
        heading: 'Enforcement',
        paragraphs: [
          'We review every report. Accounts and profiles that break these rules may be hidden, suspended or removed without notice or refund.',
        ],
      },
    ],
  },
  safety: {
    title: 'Safety tips',
    intro: 'A few habits that keep online conversations safe.',
    sections: [
      {
        heading: 'Protect your information',
        paragraphs: [
          'Never share your home address, workplace, bank details, OTPs, UPI PIN or passwords with anyone you meet online.',
          `${BRAND.name} staff will never ask you for an OTP or a PIN.`,
        ],
      },
      {
        heading: 'Watch for common scams',
        paragraphs: [
          'Be cautious if someone asks you for money, gift cards, or to move the conversation to another app quickly.',
          'Investment tips, "emergency" requests and prize claims from strangers are almost always fraud.',
        ],
      },
      {
        heading: 'Meeting in person',
        paragraphs: [
          'Meet in a public place, tell a friend where you are going, and arrange your own transport.',
          'Leave any situation that feels wrong. You never owe anyone your time.',
        ],
      },
      {
        heading: 'Report and block',
        paragraphs: [
          'Every profile has Report and Block. Reports are confidential and reviewed by our team.',
        ],
      },
    ],
  },
  terms: {
    title: 'Terms of service',
    intro: `By using ${BRAND.name} you agree to these terms.`,
    sections: [
      {
        heading: 'Eligibility',
        paragraphs: [
          `You must be at least ${BRAND.minimumAge} years old and legally able to enter into a contract.`,
        ],
      },
      {
        heading: 'Your guest account',
        paragraphs: [
          'Access is granted through an anonymous account created automatically on your device. You are responsible for activity that takes place through it.',
          'Clearing your browser data may permanently end your session and its history.',
        ],
      },
      {
        heading: 'What we provide — and what we do not promise',
        paragraphs: [
          'We provide a platform to discover profiles and to request a voice call, chat or video call.',
          'We do not promise that anyone will respond, that a conversation will take place, or that any relationship will result. Profiles are shown for discovery; availability changes constantly.',
          'The service is provided on an "as is" basis without warranties of any kind.',
        ],
      },
      {
        heading: 'Payments',
        paragraphs: [
          `Each interaction request costs ${PRICING.currencySymbol}${PRICING.amount}. Payment is confirmed by our servers, not by your payment app.`,
          'See the Payments & refunds page for the full policy.',
        ],
      },
      {
        heading: 'Acceptable use',
        paragraphs: [
          'You agree to follow the Community Guidelines. We may suspend or remove access for violations.',
        ],
      },
      {
        heading: 'Changes and contact',
        paragraphs: [
          `We may update these terms. Continued use after an update means you accept the new version. Questions: ${BRAND.supportEmail}.`,
        ],
      },
    ],
  },
  privacy: {
    title: 'Privacy policy',
    intro: 'We collect as little as possible.',
    sections: [
      {
        heading: 'What we collect',
        paragraphs: [
          'An anonymous account identifier created by Firebase Authentication. It is not linked to your name, email or phone number.',
          'Session timestamps, a coarse device/platform string and your browser language, used for support and abuse prevention.',
          'Payment records: amount, status, provider reference, which profile and interaction type the request was for.',
          'Any report you submit, including the text you write in it.',
        ],
      },
      {
        heading: 'What we do not collect',
        paragraphs: [
          'We do not ask for your name, phone number, email address or contacts, and we do not read your messages on other apps.',
          'We never receive or store your card number, UPI PIN or bank credentials — those go directly to the payment provider.',
        ],
      },
      {
        heading: 'Who we share it with',
        paragraphs: [
          'Google Firebase (hosting, authentication, database, file storage) and our payment provider process data on our behalf.',
          'We disclose data to authorities only where the law requires it.',
        ],
      },
      {
        heading: 'Retention and your choices',
        paragraphs: [
          'Payment records are retained as long as required for tax and accounting law. Other data is retained while your guest account is active.',
          `To request deletion of your guest data, email ${BRAND.supportEmail} with your guest ID (found on the Profile tab).`,
        ],
      },
    ],
  },
  refunds: {
    title: 'Payments & refunds',
    intro: `Every interaction request costs ${PRICING.currencySymbol}${PRICING.amount}.`,
    sections: [
      {
        heading: 'How payment works',
        paragraphs: [
          `You pay by UPI, directly from your own UPI app, with the ${PRICING.currencySymbol}${PRICING.amount} amount filled in for you. We never see your UPI PIN, card number or bank credentials.`,
          'Returning from your UPI app is not, by itself, confirmation. Every payment carries a reference, and we confirm it against our account before marking it complete — this is usually done within a few hours.',
          'If your payment shows as pending, keep the reference and check back later. If it stays pending for more than 24 hours, contact us with that reference.',
        ],
      },
      {
        heading: 'What the fee is for',
        paragraphs: [
          'The fee covers the interaction request itself. It does not buy a guaranteed reply, a guaranteed call, or any promise about the outcome of a conversation.',
          'In this version of the app, each Call, Chat or Video request is charged separately and does not permanently unlock further contact.',
        ],
      },
      {
        heading: 'Refunds',
        paragraphs: [
          'If you were charged twice for the same request, or money was debited while the payment shows as failed, we will refund it.',
          `Email ${BRAND.supportEmail} within 7 days with your guest ID and the payment reference. Approved refunds are returned to the original payment method, usually within 5–7 working days.`,
          'Refunds are not offered simply because a person did not respond.',
        ],
      },
      {
        heading: 'Disputes',
        paragraphs: [
          'Please contact us before raising a chargeback — we can almost always resolve it faster directly.',
        ],
      },
    ],
  },
};

export default function LegalPage() {
  const { slug } = useParams<{ slug: string }>();
  const page = slug ? PAGES[slug] : undefined;

  if (!page) return <Navigate to="/legal/terms" replace />;

  return (
    <>
      <AppHeader title={page.title} showBack />
      <main className="px-5 pb-6 pt-2">
        <p className="text-sm leading-relaxed text-muted">{page.intro}</p>

        <div className="mt-6 space-y-6">
          {page.sections.map((section) => (
            <section key={section.heading}>
              <h2 className="text-base font-bold">{section.heading}</h2>
              <div className="mt-2 space-y-2.5">
                {section.paragraphs.map((paragraph, index) => (
                  <p key={index} className="text-sm leading-relaxed text-muted">
                    {paragraph}
                  </p>
                ))}
              </div>
            </section>
          ))}
        </div>

        <p className="mt-8 border-t border-line pt-4 text-xs text-muted">
          Last updated {LEGAL.lastUpdated} · {BRAND.companyName} · {BRAND.supportEmail}
        </p>
      </main>
    </>
  );
}
