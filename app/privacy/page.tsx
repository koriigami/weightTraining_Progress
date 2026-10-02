import type { Metadata } from 'next';
import { LegalPage, LegalSection, Mail } from '@/components/legal/LegalPage';
import { MIN_AGE, STUDIO, STUDIO_PLACE } from '@/lib/legal';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'What Levl collects, why, who helps run it, and how to get a copy of your data or delete it.',
  alternates: { canonical: '/privacy' },
};

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      current="privacy"
      short={[
        'Levl stores your Google name, email and photo, and the workouts, weights and goals you log, so the app can work.',
        'No ads, no selling your data, and no analytics or tracking cookies.',
        <>
          Email <Mail /> to get a copy of your data or to delete your account.
        </>,
      ]}
    >
      <LegalSection n={1} title="Who we are">
        <p>
          Levl is a workout tracker built and run by {STUDIO}, a product studio in {STUDIO_PLACE} (&ldquo;we&rdquo;,
          &ldquo;us&rdquo;). We decide how your data is used in Levl and we are responsible for it. You can reach us at{' '}
          <Mail />.
        </p>
      </LegalSection>

      <LegalSection n={2} title="What we collect">
        <h3>When you sign in with Google</h3>
        <p>
          Your name, email address, profile photo link and Google account ID. We never see your Google password.
        </p>
        <h3>What you log in Levl</h3>
        <ul>
          <li>
            Workouts: exercises, sets, reps, weights, hold times, cardio time and distance, notes, and when each workout
            started and finished.
          </li>
          <li>Routines, custom exercises and goals.</li>
          <li>Body weight entries.</li>
          <li>
            Your settings: units, equipment, exercises to avoid, joints to go easy on, weekly goal, and sound, haptics and
            screen preferences.
          </li>
        </ul>
        <p>
          Body weight and joint limits are health information. We use them only to run Levl for you: to show your weight
          trend and to hide exercises that load a joint you marked.
        </p>
        <h3>Kept on your device</h3>
        <p>
          Your browser keeps the workout in progress (so a reload does not lose it), the badges you have already
          celebrated, and your sound and haptics choice. These stay in your browser until you clear its data.
        </p>
        <h3>Cookies</h3>
        <p>
          Levl only uses the cookies needed to keep you signed in and to protect sign-in. There are no advertising,
          analytics or tracking cookies.
        </p>
        <h3>Server logs</h3>
        <p>
          Like any website, our hosting provider records technical details of each request, such as your IP address,
          browser type and the page asked for. These are used to keep Levl secure and to fix errors.
        </p>
      </LegalSection>

      <LegalSection n={3} title="How we use it">
        <ul>
          <li>
            To run Levl: save your log, keep it in sync across your devices, and work out your XP, level, rank, badges,
            streaks and goals.
          </li>
          <li>To show your name and photo inside the app.</li>
          <li>To keep Levl secure and fix problems.</li>
          <li>
            To understand how Levl is used as a whole. For this we look only at totals across everyone, such as how many
            workouts were logged this week, and any group of fewer than 5 people is hidden.
          </li>
          <li>
            So the person who runs Levl can see who is using it and ask for feedback: your name, email, the date you
            joined, your level and rank, and how often you train. Not your sets, weights, body weight, notes or limits.
          </li>
        </ul>
        <p>
          We do not read your individual log unless you ask us to look into a problem, or the law requires it. We do not
          sell or rent your data, show you ads, or use your data to train AI models.
        </p>
        <p>
          We process your data with your consent, which you give when you sign in and use Levl. You can withdraw it at any
          time by asking us to delete your account (see section 7).
        </p>
      </LegalSection>

      <LegalSection n={4} title="Who helps us run Levl">
        <p>We share data only with the services that run Levl for us, and only what each one needs:</p>
        <ul>
          <li>Google, to sign you in.</li>
          <li>Vercel, which hosts the app.</li>
          <li>Upstash, which runs the database where your account and log are stored.</li>
        </ul>
        <p>
          These providers may store data on servers outside India. They process it for us, under their own security and
          privacy commitments.
        </p>
        <p>
          If you join the waitlist, you fill in a form hosted by Tally, and Tally&rsquo;s privacy policy covers what you
          enter there. We use your waitlist entry only to invite you to Levl.
        </p>
        <p>
          When you share a workout, it goes through your phone&rsquo;s own share menu to the app you pick. Levl never posts
          anything for you.
        </p>
        <p>We may disclose data if the law requires it, for example to comply with a valid court order.</p>
      </LegalSection>

      <LegalSection n={5} title="How long we keep it">
        <p>
          We keep your account and log while you use Levl. If you ask us to delete your account, we delete your profile,
          your log and any backup copies within 30 days. Hosting logs are kept by Vercel for a limited time and then
          deleted automatically.
        </p>
      </LegalSection>

      <LegalSection n={6} title="How we protect it">
        <p>
          Levl only runs over HTTPS, sign-in goes through Google, and only {STUDIO} can access the database. No system is
          perfectly secure. If we learn of a breach that affects your data, we will tell you and the authorities as the law
          requires.
        </p>
      </LegalSection>

      <LegalSection n={7} title="Your rights">
        <p>You can:</p>
        <ul>
          <li>see your log at any time in the app, edit or delete workouts and goals, and update your weight entries;</li>
          <li>ask us for a copy of your data;</li>
          <li>ask us to correct anything you cannot fix yourself;</li>
          <li>ask us to delete your account and all your data, which also withdraws your consent;</li>
          <li>
            name someone to use these rights for you if you die or cannot act yourself, as India&rsquo;s Digital Personal
            Data Protection Act, 2023 allows;
          </li>
          <li>
            complain to us, and if we do not resolve it, to the Data Protection Board of India.
          </li>
        </ul>
        <p>
          Email <Mail /> from the address you sign in with, so we can confirm it is you. We reply within 30 days.
        </p>
        <p>
          You can also remove Levl&rsquo;s access to your Google account at any time from your{' '}
          <a href="https://myaccount.google.com/permissions" target="_blank" rel="noopener noreferrer">
            Google Account settings
          </a>
          . That stops sign-in but does not delete your data, so email us for that.
        </p>
      </LegalSection>

      <LegalSection n={8} title="Age">
        <p>
          Levl is for people aged {MIN_AGE} and over. We do not knowingly collect data from anyone younger. If we find that
          someone under {MIN_AGE} has an account, we will delete it.
        </p>
      </LegalSection>

      <LegalSection n={9} title="Changes to this policy">
        <p>
          When we change this policy, we update the date at the top. If a change affects how we use your data, we will tell
          you in the app before it takes effect.
        </p>
      </LegalSection>

      <LegalSection n={10} title="Contact">
        <p>
          Questions, requests and complaints go to <Mail />. {STUDIO}, {STUDIO_PLACE}.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
