import { useParams } from "react-router-dom"
import { RegistrationForm } from "../components/RegistrationForm"

export function EditPage() {
  const { id } = useParams()

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="pb-4 border-b">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Editar Descarte</h1>
        <p className="text-muted-foreground mt-2">
          Edite as informações do descarte registrado.
        </p>
      </div>
      <div className="bg-card text-card-foreground rounded-2xl border shadow-sm p-6 sm:p-8">
        <RegistrationForm editId={id} />
      </div>
    </div>
  )
}
