const links = [
  { label: 'GitHub', href: 'https://github.com/griffintennent' },
  { label: 'LinkedIn', href: 'https://www.linkedin.com/in/griffin-tennent/' },
  { label: 'Email', href: 'mailto:griffintennent@gmail.com' },
];

function Footer() {
  return (
    <footer className="border-t border-stone-200">
      <div className="mx-auto flex max-w-2xl flex-col items-center gap-2 px-6 py-6 text-xs text-stone-400 sm:flex-row sm:justify-between">
        <span>&copy; {new Date().getFullYear()} Griffin Tennent</span>
        <div className="flex gap-4">
          {links.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="underline decoration-stone-300 underline-offset-2 transition-colors hover:text-stone-800 hover:decoration-stone-800"
              target={link.href.startsWith('http') ? '_blank' : undefined}
              rel={link.href.startsWith('http') ? 'noreferrer' : undefined}
            >
              {link.label}
            </a>
          ))}
        </div>
      </div>
    </footer>
  );
}

export default Footer;
