import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalPage, LegalSection, Mail } from '@/components/legal/LegalPage';
import { MIN_AGE, STUDIO, STUDIO_PLACE } from '@/lib/legal';

export const metadata: Metadata = {
  title: 'Terms of Use',
  description: 'The rules for using Levl: who it is for, training safely, your data, and early access.',
  alternates: { canonical: '/terms' },
};

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of Use"
      current="terms"
      short={[
        `Levl is a free workout tracker in early access, for people aged ${MIN_AGE} and over.`,
        'It is a logbook and a game, not medical advice. Train within your limits.',
        'Your log is yours. Please use Levl fairly, and expect features and XP rules to change while Levl grows.',
      ]}
    >
      <LegalSection n={1} title="About these terms">
        <p>
          These terms are an agreement between you and {STUDIO}, {STUDIO_PLACE}, which builds and runs Levl. By signing in
          or using Levl you accept them and our <Link href="/privacy">Privacy Policy</Link>. If you do not agree, please do
          not use Levl.
        </p>
      </LegalSection>

      <LegalSection n={2} title="Who can use Levl">
        <ul>
          <li>You must be {MIN_AGE} or older.</li>
          <li>Levl is in early access, and sign-ups may be paused at times. You sign in with a Google account, and your account is for you alone.</li>
          <li>You are responsible for what happens under your account, so keep your Google account secure.</li>
        </ul>
      </LegalSection>

      <LegalSection n={3} title="Health and safety">
        <p>
          Levl helps you log training and turns it into XP, levels and ranks. It is not a doctor, a physiotherapist or a
          coach, and nothing in Levl is medical advice.
        </p>
        <ul>
          <li>
            Check with a doctor before you start a new exercise programme, especially if you have an injury or a medical
            condition, are pregnant, or have not trained in a while.
          </li>
          <li>Stop and get help if you feel pain, dizziness, chest pain or shortness of breath.</li>
          <li>XP, goals and rank targets are there to motivate you. Never push past what is safe for your body to earn them.</li>
          <li>Exercise lists, including the ones that leave out a joint you marked, are general and may not suit you.</li>
        </ul>
        <p>
          You exercise at your own risk. To the extent the law allows, we are not responsible for injury or health problems
          that come from training you log or plan with Levl.
        </p>
      </LegalSection>

      <LegalSection n={4} title="Your data">
        <p>
          The workouts, weights, goals and routines you log are yours. You let us store and process them only to run Levl
          for you, as the <Link href="/privacy">Privacy Policy</Link> explains. You can ask for a copy, or ask us to delete
          them, at any time.
        </p>
      </LegalSection>

      <LegalSection n={5} title="Using Levl fairly">
        <p>Please do not:</p>
        <ul>
          <li>try to get into someone else&rsquo;s account or data;</li>
          <li>probe, overload, scrape or disrupt Levl, or get around its security;</li>
          <li>use scripts or bots to add entries;</li>
          <li>copy, resell or reverse engineer Levl;</li>
          <li>use Levl for anything unlawful.</li>
        </ul>
      </LegalSection>

      <LegalSection n={6} title="Early access">
        <p>
          Levl is in early access and changes often. Features, XP rules, levels, ranks and badges may change, and your XP
          and level may be worked out again when the rules change. Levl may sometimes be unavailable, and despite our care
          data can be lost, so we cannot promise it will always be there. If we ever close Levl, we will give you reasonable
          notice where we can, so you can ask for a copy of your data.
        </p>
      </LegalSection>

      <LegalSection n={7} title="Price">
        <p>
          Levl is free during early access. If we ever charge for Levl or part of it, we will tell you first, and nothing
          will be charged without your agreement.
        </p>
      </LegalSection>

      <LegalSection n={8} title="Our name and work">
        <p>
          The Levl name, logo, design, code and content belong to {STUDIO}. Please do not use them without our written
          permission, other than to share Levl or your own progress.
        </p>
      </LegalSection>

      <LegalSection n={9} title="Ending your use">
        <p>
          You can stop using Levl at any time and ask us to delete your account. We may suspend or close an account that
          breaks these terms or puts Levl or other people at risk. Where we can, we will tell you why first.
        </p>
      </LegalSection>

      <LegalSection n={10} title="No promises beyond these terms">
        <p>
          Levl is provided &ldquo;as is&rdquo; and &ldquo;as available&rdquo;. To the extent the law allows, we make no
          promise that it will be free of errors, always available, or fit for a particular purpose.
        </p>
      </LegalSection>

      <LegalSection n={11} title="Limit of liability">
        <p>
          To the extent the law allows, we are not liable for indirect or consequential losses, or for lost data, profits or
          opportunities. Our total liability to you for any claim about Levl is limited to the greater of what you paid us
          for Levl in the 12 months before the claim, or ₹1,000. Nothing in these terms limits a liability that the law
          does not allow us to limit.
        </p>
      </LegalSection>

      <LegalSection n={12} title="Law and disputes">
        <p>
          These terms are governed by the laws of India. If a dispute comes up, please email us first so we can try to sort
          it out together. If we cannot, the courts in Nagpur, Maharashtra, have exclusive jurisdiction.
        </p>
      </LegalSection>

      <LegalSection n={13} title="Changes to these terms">
        <p>
          We may update these terms as Levl grows. We will change the date at the top, and tell you in the app about
          important changes before they take effect. If you keep using Levl after that, you accept the new terms.
        </p>
      </LegalSection>

      <LegalSection n={14} title="Contact">
        <p>
          Questions about these terms go to <Mail />. {STUDIO}, {STUDIO_PLACE}.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
