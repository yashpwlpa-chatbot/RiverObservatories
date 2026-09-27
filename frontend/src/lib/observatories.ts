export const OBSERVATORIES = [
  { name: 'Ganga', slug: 'ganga', description: 'The Ganga–Padma river system links Himalayan headwaters, the Indo-Gangetic floodplain and the delta.' },
  { name: 'Chambal', slug: 'chambal', description: 'A major Yamuna tributary and an important river landscape for aquatic wildlife.' },
  { name: 'Gandak', slug: 'gandak', description: 'A Himalayan river connecting Nepal’s catchments with the plains of Bihar.' },
  { name: 'Kosi', slug: 'kosi', description: 'A dynamic Himalayan river whose shifting channels shape floodplain habitats.' },
  { name: 'Ghaghra', slug: 'ghaghra', description: 'A large transboundary Ganga tributary with extensive floodplain connections.' },
  { name: 'Son', slug: 'son', description: 'A southern tributary of the Ganga with distinctive seasonal flow and sandbar habitats.' },
  { name: 'Mahananda', slug: 'mahananda', description: 'A river system connecting the eastern Himalayan foothills and the Ganga plains.' },
  { name: 'Beas', slug: 'beas', description: 'A western Himalayan river flowing through Himachal Pradesh and Punjab.' },
  { name: 'Sharda', slug: 'sharda', description: 'A transboundary river along the India–Nepal landscape.' },
  { name: 'Parman', slug: 'parman', description: 'A river observatory for understanding local floodplain and community change.' },
  { name: 'Bagmati', slug: 'bagmati', description: 'A transboundary river linking Nepal’s hills with the northern Bihar floodplain.' },
  { name: 'Budhi Gandak', slug: 'budhi-gandak', description: 'A river corridor winding through the floodplains of north Bihar.' },
] as const;

export const RESEARCH_CATEGORIES = [
  { key: 'hydrology', label: 'Hydrology', description: 'Flow, river level, seasonal variation and monitoring coverage.' },
  { key: 'climate', label: 'Climate', description: 'Rainfall, temperature and changing seasonal conditions.' },
  { key: 'gis', label: 'GIS & Habitats', description: 'River networks, monitoring locations and spatial context.' },
  { key: 'wildlife', label: 'Wildlife Status', description: 'River-dependent species and habitat observations.' },
  { key: 'fisheries', label: 'Fisheries', description: 'Fish communities, fishing activity and river livelihoods.' },
  { key: 'social', label: 'Socio-Economic Development', description: 'People, access, livelihoods and floodplain change.' },
  { key: 'conservation', label: 'Conservation Prospects', description: 'Pressures, protection opportunities and restoration priorities.' },
  { key: 'policy', label: 'Policy & Legal Frameworks', description: 'Planning, governance and legal context for river conservation.' },
] as const;

export function findObservatory(slug: string) {
  return OBSERVATORIES.find((river) => river.slug === slug);
}
