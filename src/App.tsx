import { BrowserRouter, Routes, Route } from 'react-router-dom';
import NavBar from './components/NavBar';
import Footer from './components/Footer';
import Home from './pages/Home';
import CreditUnionLookup from './pages/CreditUnionLookup';

function App() {
  return (
    <BrowserRouter>
      <div className="flex min-h-screen flex-col bg-stone-50 font-serif text-stone-800">
        <NavBar />
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route
              path="/projects/credit-union-lookup"
              element={<CreditUnionLookup />}
            />
          </Routes>
        </main>
        <Footer />
      </div>
    </BrowserRouter>
  );
}

export default App;
