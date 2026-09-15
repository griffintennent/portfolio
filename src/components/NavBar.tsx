import { Link } from 'react-router-dom';

function NavBar() {
  return (
    <header className="border-b border-stone-200">
      <nav className="mx-auto flex max-w-2xl items-center px-6 py-5">
        <Link to="/" className="text-base font-semibold text-stone-900">
          Griffin Tennent
        </Link>
      </nav>
    </header>
  );
}

export default NavBar;
