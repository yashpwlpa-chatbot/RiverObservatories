import { Link } from 'react-router-dom';

const themes = [
  { title: 'Rivers: Wildlife and Ecology', text: 'Understand river-dependent species, ecological relationships and changing habitats.', image: '/assets/Ganges River Dolphin-MALE 541 379.JPG', alt: 'River dolphin surfacing', category: 'wildlife' },
  { title: 'Rivers: Hydrology and Habitats', text: 'Explore flow patterns, river levels and the habitats shaped by seasonal water.', image: '/assets/IMG_3943.JPG', alt: 'Riverbank and grass habitat', category: 'hydrology' },
  { title: 'Rivers: Climate Trends', text: 'Examine rainfall, temperature and climate signals across river landscapes.', image: '/assets/ganga_meander_NativePicture_gif-2-0000.jpg', alt: 'Satellite view of river meander', category: 'climate', scientific: true },
  { title: 'Rivers and People', text: 'See how rivers connect to livelihoods, communities and floodplain development.', image: '/assets/A fisherman on the Ganga River at Bhagalpur prepares to set out for fishing_photo by Kadambari Deshpande.JPG', alt: 'Fisherman on a river', category: 'social' },
  { title: 'Rivers: Conservation Frontiers', text: 'Discover pressures, opportunities and priorities for river conservation.', image: '/assets/IMG_8939.JPG', alt: 'Excavators operating near a river', category: 'conservation' },
  { title: 'Rivers: Policy Gaps & Legal Frameworks', text: 'Explore the governance and policy context behind river protection.', image: '/assets/turtle.png', alt: 'Turtle in a river habitat', category: 'policy' },
  { title: 'Fisheries', text: 'Understand fish communities, fishing activity and river livelihoods.', image: '/assets/DSCN0849.JPG', alt: 'Fish catch from the river', category: 'fisheries' },
  { title: 'Fisheries Monitoring / Field Research', text: 'Explore data from fisheries monitoring and on-the-ground ecological research.', image: '/assets/IMG_6114.JPG', alt: 'Measuring a small fish', category: 'fisheries', scientific: true },
];

export function FeatureCards() {
  return (
    <section className="bg-white py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-6 sm:px-10 lg:px-12">
        <div className="mb-9 max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#1b6845]">Explore the research</p>
          <h2 className="mt-3 font-serif text-3xl leading-tight text-[#20342e] sm:text-4xl">A connected view of river systems</h2>
          <p className="mt-3 text-[15px] leading-7 text-[#5f6e69]">Research themes bring together environmental observations and interpreted insights across the observatory network.</p>
        </div>
        <div className="grid gap-x-6 gap-y-9 sm:grid-cols-2 lg:grid-cols-3">
          {themes.map((theme) => (
            <Link key={theme.title} to={'/rivers?category=' + theme.category} className="group block border border-[#e0e7e2] bg-white transition-shadow hover:shadow-[0_10px_24px_rgba(31,58,46,0.08)]">
              <div className="aspect-[1.65] overflow-hidden bg-[#e6ece8]">
                <img 
                  src={theme.image} 
                  alt={theme.alt} 
                  loading="lazy" 
                  className={`h-full w-full transition-transform duration-300 group-hover:scale-[1.025] ${theme.scientific ? 'object-contain' : 'object-cover'}`} 
                />
              </div>
              <div className="px-5 pb-5 pt-5">
                <h3 className="font-serif text-[21px] leading-snug text-[#20342e]">{theme.title}</h3>
                <p className="mt-2 min-h-[52px] text-sm leading-6 text-[#65726e]">{theme.text}</p>
                <span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[#14633d]">Explore <span aria-hidden="true">↗</span></span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
