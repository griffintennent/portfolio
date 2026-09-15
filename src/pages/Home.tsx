import { Link } from 'react-router-dom';

type Project = {
  title: string;
  description: string;
  href: string;
};

const projects: Project[] = [
  {
    title: 'Markdown Previewer',
    description: 'A live markdown editor and previewer.',
    href: 'https://markdown.griffintennent.com',
  },
  {
    title: 'Credit Union Lookup',
    description:
      'Search a federally insured credit union to see its NCUA profile, size, services, and recent news in one place.',
    href: '/projects/credit-union-lookup',
  },
];

function ProjectRow({ title, description, href }: Project) {
  const content = (
    <>
      <h3 className="font-semibold text-stone-900 underline decoration-stone-300 underline-offset-4 group-hover:text-red-800 group-hover:decoration-red-800">
        {title}
      </h3>
      <p className="mt-1 text-sm text-stone-500">{description}</p>
    </>
  );

  const rowClasses =
    'group block border-b border-stone-200 py-5 first:pt-0 last:border-0';

  if (href.startsWith('/')) {
    return (
      <Link to={href} className={rowClasses}>
        {content}
      </Link>
    );
  }

  return (
    <a href={href} target="_blank" rel="noreferrer" className={rowClasses}>
      {content}
    </a>
  );
}

function Home() {
  return (
    <section className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="text-3xl font-bold tracking-tight text-stone-900">
        Griffin Tennent
      </h1>
      <h2 className="mt-1 text-lg text-stone-500">Customer-Facing Engineer</h2>

      <p className="mt-5 max-w-xl leading-relaxed text-stone-700">
        Customer-facing engineer guy (Full-stack problem solver).
      </p>

      <div className="mt-14">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-stone-400">
          Projects
        </h2>
        <div className="mt-5">
          {projects.map((project) => (
            <ProjectRow key={project.title} {...project} />
          ))}
        </div>
      </div>
    </section>
  );
}

export default Home;
