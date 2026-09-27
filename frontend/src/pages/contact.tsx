import { useSearchParams } from 'react-router-dom';
import { usePageMeta } from '@/lib/page-meta';
import { findObservatory } from '@/lib/observatories';

export default function ContactPage() {
  usePageMeta('Contact & Data Access', 'Contact the Wildlife Conservation Trust about river research, collaboration and detailed data access.');
  const [params] = useSearchParams();
  const river = findObservatory(params.get('river') ?? '');
  const requestingData = params.get('request') === 'data';
  const subject = requestingData ? 'River Observatories data access request' + (river ? ' — ' + river.name : '') : 'River Observatories enquiry';
  const body = requestingData ? 'Hello WCT,\n\nI would like to request access to detailed data for ' + (river?.name ?? 'the River Observatories') + '.\n\nName:\nInstitution / affiliation:\nResearch purpose:\nData or period requested:\n\nThank you.' : 'Hello WCT,\n\nI am contacting you about the River Observatories.\n\n';
  const mailto = 'mailto:info@wctindia.org?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
  return <div className="min-h-[60vh] bg-[#f8faf8]">
    <div className="mx-auto max-w-7xl px-6 py-14 sm:px-10 lg:px-12">
      <p className="text-xs font-semibold uppercase tracking-[0.17em] text-[#1b6845]">Get in touch</p>
      <h1 className="mt-2 font-serif text-4xl text-[#20342e]">{requestingData ? 'Request Data Access' : 'Contact'}</h1>
      <p className="mt-4 max-w-2xl text-[15px] leading-7 text-[#637369]">{requestingData ? 'Detailed research datasets are shared by request. Tell WCT what you need and how the data will be used.' : 'For questions about river research, conservation insights or collaboration, contact the Wildlife Conservation Trust.'}</p>
      <div className="mt-9 grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(250px,0.8fr)]">
        <section className="border border-[#dfe8e1] bg-white p-7">
          <h2 className="font-serif text-2xl text-[#20342e]">{requestingData ? 'What to include in your request' : 'Send an enquiry'}</h2>
          {requestingData && <ul className="mt-5 list-disc space-y-2 pl-5 text-sm leading-6 text-[#5f7165]"><li>Your name and institution or affiliation</li><li>The river and research question</li><li>The parameters, locations and time period needed</li><li>How you plan to use the information</li></ul>}
          <a href={mailto} className="mt-7 inline-flex items-center gap-3 bg-[#14633d] px-5 py-3 text-sm font-semibold text-white hover:bg-[#0d4f2e]">{requestingData ? 'Prepare email request' : 'Email WCT'} <span aria-hidden="true">↗</span></a>
          <p className="mt-3 text-xs leading-5 text-[#78867c]">This opens a draft in your email app. Requests are reviewed by WCT.</p>
        </section>
        <aside className="h-fit border border-[#dfe8e1] bg-white p-7">
          <h2 className="font-serif text-2xl text-[#20342e]">Wildlife Conservation Trust</h2>
          <p className="mt-4 text-sm text-[#627268]">Mumbai, India</p>
          <a className="mt-3 block text-sm font-semibold text-[#14633d] hover:underline" href="mailto:info@wctindia.org">info@wctindia.org</a>
          <a className="mt-3 block text-sm font-semibold text-[#14633d] hover:underline" href="https://www.wildlifeconservationtrust.org/about-us/contact/" target="_blank" rel="noreferrer">Official contact page ↗</a>
        </aside>
      </div>
    </div>
  </div>;
}
