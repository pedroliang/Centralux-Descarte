import { Outlet, Link } from "react-router-dom"
import { ModeToggle } from "./mode-toggle"
import { Recycle } from "lucide-react"

export default function Layout() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans selection:bg-primary selection:text-primary-foreground">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-6">
            <Link to="/" className="flex items-center gap-2 font-bold text-xl tracking-tight text-primary">
              <div className="flex bg-primary text-primary-foreground p-1.5 rounded-lg">
                <Recycle className="h-5 w-5" />
              </div>
              <span className="hidden sm:inline">CentraLux Descarte</span>
            </Link>
            <nav className="flex items-center gap-4 text-sm font-medium">
              <Link to="/" className="text-muted-foreground hover:text-foreground transition-colors">Registrar</Link>
              <Link to="/dashboard" className="text-muted-foreground hover:text-foreground transition-colors">Painel</Link>
              <Link to="/public" target="_blank" className="text-muted-foreground hover:text-foreground transition-colors">Ver Público</Link>
            </nav>
          </div>
          <nav className="flex items-center gap-4">
            <ModeToggle />
          </nav>
        </div>
      </header>
      <main className="flex-1 container mx-auto px-4 py-8">
        <Outlet />
      </main>
      <footer className="border-t py-6">
        <div className="container mx-auto px-4 flex flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} CentraLux. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  )
}
