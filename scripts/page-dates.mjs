// Derives sitemap lastmod dates for the routes that carry no frontmatter date
// of their own, from the git history of the files backing them, and commits the
// result to src/data/page-dates.json.
//
// The dates are baked rather than read at build time because the deploy builds
// from a `git clone --depth=1`. A shallow clone holds exactly one, parentless
// commit, so git reports every file as introduced by it: `git log -1 -- <path>`
// returns the tip commit's date for *every* path. Not empty — confident, wrong,
// and identical everywhere, which is why guarding on empty output missed it.
// Baking removes the build-time git dependency entirely.
//
//   node scripts/page-dates.mjs           regenerate the file
//   node scripts/page-dates.mjs --check   fail if it is stale (runs in build)
import { execFile } from 'node:child_process';
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { promisify } from 'node:util';

const OUT = 'src/data/page-dates.json';

const execFileP = promisify(execFile);

// One spawn per backing file; they run concurrently, so the build gate costs
// one git round-trip of wall time instead of ~10 sequential ones.
const git = async (args) => {
  try {
    const { stdout } = await execFileP('git', args, { encoding: 'utf8' });
    return stdout.trim();
  } catch {
    return '';
  }
};

/** YYYY-MM-DD in UTC — matches Footer.astro, so a date never slips in a
 *  negative-offset timezone. */
const dayOf = async (path) => {
  const iso = await git(['log', '-1', '--format=%aI', '--', path]);
  if (!iso) return undefined;
  const d = new Date(iso);
  return Number.isNaN(d.valueOf()) ? undefined : d.toISOString().slice(0, 10);
};

const newest = (days) => days.filter(Boolean).sort().at(-1);

async function derive() {
  const map = {};
  const set = (route, day) => {
    if (day) map[route] = day;
  };

  const projectFiles = readdirSync('src/content/projects')
    .filter((f) => f.endsWith('.md'))
    .sort();

  const [home, about, aiCourses, subscribe, resumePage, resumeYaml, ...projectDays] =
    await Promise.all([
      dayOf('src/pages/index.astro'),
      dayOf('src/pages/about.astro'),
      dayOf('src/pages/ai-courses.astro'),
      dayOf('src/pages/subscribe.astro'),
      dayOf('src/pages/resume.astro'),
      dayOf('src/data/resume.yaml'),
      ...projectFiles.map((file) => dayOf(`src/content/projects/${file}`)),
    ]);

  set('/', home);
  set('/about/', about);
  set('/ai-courses/', aiCourses);
  set('/subscribe/', subscribe);
  // /resume/ renders src/data/resume.yaml through the page: either can change it.
  set('/resume/', newest([resumePage, resumeYaml]));

  // Projects were authored in this repo, so git is the honest signal for them —
  // unlike the writing archive, which predates the repo and uses frontmatter.
  projectFiles.forEach((file, i) => {
    set(`/projects/${file.replace(/\.md$/, '')}/`, projectDays[i]);
  });
  set('/projects/', newest(projectDays));

  // Sorted keys keep the committed diff readable.
  return Object.fromEntries(Object.entries(map).sort(([a], [b]) => a.localeCompare(b)));
}

const serialize = (map) => `${JSON.stringify(map, null, 2)}\n`;
const check = process.argv.includes('--check');

// A shallow clone cannot answer the question, so there is nothing to verify
// against — the committed file is authoritative there, which is the whole point.
// The same holds with no repository at all (a tarball or exported checkout),
// where deriving would produce {} and --check would demand committing it.
if ((await git(['rev-parse', '--is-inside-work-tree'])) !== 'true') {
  console.log('page-dates: no git repository — using committed dates, skipping check');
  process.exit(0);
}
if ((await git(['rev-parse', '--is-shallow-repository'])) === 'true') {
  console.log('page-dates: shallow clone — using committed dates, skipping check');
  process.exit(0);
}

const derived = serialize(await derive());

if (check) {
  const current = (() => {
    try {
      return readFileSync(OUT, 'utf8');
    } catch {
      return '';
    }
  })();
  if (current !== derived) {
    console.error(
      `page-dates: ${OUT} is stale — a backing file changed since it was generated.\n` +
        'Run `npm run page-dates`, then commit the result.',
    );
    process.exit(1);
  }
  console.log('page-dates: committed dates match git');
} else {
  writeFileSync(OUT, derived);
  console.log(`page-dates: wrote ${OUT}`);
}
