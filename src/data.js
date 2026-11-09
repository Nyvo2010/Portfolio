export const site = {
  email: 'niekyuwen@gmail.com',
  nav: [
    { label: 'Projects', href: '#projects' },
    { label: 'About', href: '#about' },
    { label: 'Stack', href: '#stack' },
    { label: 'Lab', href: '/labs/' },
  ],
  footerNav: [
    { label: 'Top', href: '#top' },
    { label: 'Projects', href: '#projects' },
    { label: 'About', href: '#about' },
    { label: 'Stack', href: '#stack' },
    { label: 'Lab', href: '/labs/' },
  ],
  socials: [
    { label: 'Email', href: 'mailto:niekyuwen@gmail.com' },
    { label: 'GitHub', href: 'https://github.com/Nyvo2010' },
    { label: 'LinkedIn', href: 'https://www.linkedin.com/in/niek-vogelaar' },
    { label: 'X (Twitter)', href: 'https://x.com/nyvo4real', header: false },
  ],
};

/* image is optional: a project without a mockup shows no hover media */
export const projects = [
  {
    name: 'Sauron',
    desc: 'Forest fire detection drone as a school project',
    date: '08.09.26',
    image: '/assets/projects/sauron.webp',
  },
  {
    name: 'Veritas',
    desc: 'OS deep research agent',
    date: '10.10.26',
    image: '/assets/projects/veritas.webp',
  },
  {
    name: 'Rubus',
    desc: 'Personal AI assistant',
    date: '10.12.25',
    image: '/assets/projects/rubus.webp',
  },
  {
    name: 'PXL Webworks',
    desc: 'Creative web design studio',
    date: '15.04.26',
    image: '/assets/projects/pxl-webworks.webp',
  },
  {
    name: 'Vanta',
    desc: 'Concept site for brand',
    date: '15.04.26',
    image: '/assets/projects/vanta.webp',
  },
  {
    name: 'Vamos Hablando',
    desc: 'Website for Spanish tutoring business',
    date: '12.03.26',
    image: '/assets/projects/vamos-hablando.webp',
  },
  {
    name: 'Kicks',
    desc: 'Concept site for brand',
    date: '15.04.26',
    image: '/assets/projects/kicks.webp',
  },
  {
    name: 'Alto AI',
    desc: 'School project',
    date: '18.05.26',
    image: '/assets/projects/alto-ai.webp',
  },
  {
    name: 'Atlas',
    desc: 'Personal experiment with agents',
    date: '10.08.25',
    image: '/assets/projects/atlas.webp',
  },
  {
    name: 'Monolith',
    desc: 'Concept site for brand',
    date: '15.04.26',
    image: '/assets/projects/monolith.webp',
  },
  {
    name: 'Betonbouw',
    desc: 'Site for Betonbouw made during internship',
    date: '19.05.26',
    image: '/assets/projects/betonbouw.webp',
  },
];

/*
 * The homepage teaser shows exactly these pieces, in this order:
 * cmd-z, drone, avatar 3d, sour first instinct, betonbouw hero.
 *
 * The lab page itself is read from public/assets/lab at build time, so every
 * other image is discovered from the folder: drop a file in or delete one and
 * the canvas follows without touching a list.
 */
export const labHome = [
  'cmd-z',
  'drone',
  'avatar-3d',
  'sour-first-instinct',
  'betonbouw-hero',
];

export const stack = [
  { name: 'Visual Studio Code', desc: 'Code editor', icon: 'vscode' },
  { name: 'GitHub', desc: 'Version control', icon: 'github' },
  { name: 'Figma', desc: 'Design', icon: 'figma' },
  { name: 'React', desc: 'JavaScript library', icon: 'react' },
  { name: 'JavaScript', desc: 'Language', icon: 'javascript' },
  { name: 'OpenCode', desc: 'Coding agent', icon: 'opencode' },
  { name: 'TypeScript', desc: 'Language', icon: 'typescript' },
  { name: 'Python', desc: 'Language', icon: 'python' },
];
