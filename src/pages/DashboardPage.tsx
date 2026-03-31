import { useEffect, useState } from "react"
import { supabase } from "../lib/supabase"
import { Link } from "react-router-dom"
import { Loader2, Search, Trash2, Printer, ExternalLink, Edit, X } from "lucide-react"
import { format } from "date-fns"
import { toast } from "sonner"

type Discard = {
  id: string
  created_at: string
  date: string
  product_code: string
  product_description: string
  condition: string
  lot: string | null
  brand: string
  customer_name: string | null
  quantity: number
  media_urls: string[] | null
}

export function DashboardPage() {
  const [discards, setDiscards] = useState<Discard[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [selectedMediaSrc, setSelectedMediaSrc] = useState<string | null>(null)

  const fetchDiscards = async () => {
    setLoading(true)
    let query = supabase.from('descartes').select('*').order('created_at', { ascending: false })
    
    if (startDate) {
      query = query.gte('date', startDate)
    }
    if (endDate) {
      query = query.lte('date', endDate)
    }

    const { data, error } = await query
    
    if (error) {
      toast.error("Erro ao carregar os dados")
    } else {
      setDiscards(data || [])
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchDiscards()
  }, [startDate, endDate])

  const handleDelete = async (id: string, mediaUrls: string[] | null) => {
    if (!confirm("Tem certeza que deseja apagar este registro?")) return

    try {
      // Opt: Delete files from storage
      if (mediaUrls && mediaUrls.length > 0) {
        const filePaths = mediaUrls.map(url => {
          const parts = url.split('/')
          return `discards/${parts[parts.length - 1]}`
        })
        await supabase.storage.from('descartes_media').remove(filePaths)
      }

      const { error } = await supabase.from('descartes').delete().eq('id', id)
      if (error) throw error

      toast.success("Registro apagado com sucesso")
      setDiscards(prev => prev.filter(d => d.id !== id))
    } catch (error) {
      console.error(error)
      toast.error("Erro ao apagar registro")
    }
  }

  const handlePrint = () => {
    window.print()
  }

  const isVideo = (url: string) => /\.(mp4|webm)$/i.test(url.split('?')[0])

  const normalizeText = (text: any) => {
    if (text === null || text === undefined) return "";
    return String(text)
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  };

  const filteredDiscards = discards.filter(discard => {
    if (!searchTerm) return true
    
    let dateStr = "";
    try {
      if (discard.date) {
        const d = new Date(discard.date + 'T00:00:00');
        if (!isNaN(d.getTime())) {
          dateStr = format(d, 'dd/MM/yyyy');
        }
      }
    } catch (e) {
      console.warn("Invalid date during search:", discard.date);
    }

    const searchFields = [
      discard.product_code,
      discard.brand,
      discard.lot,
      discard.condition,
      discard.product_description,
      discard.customer_name,
      discard.quantity,
      dateStr
    ]
    
    const searchString = normalizeText(searchFields.map(f => f ?? "").join(' '))
    const searchWords = normalizeText(searchTerm).split(' ').filter(w => w.trim().length > 0)
    
    return searchWords.every(word => searchString.includes(word))
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Painel de Descartes</h1>
          <p className="text-muted-foreground mt-2">
            Gerencie e visualize todos os registros efetuados.
          </p>
        </div>
        <div className="flex gap-2 print:hidden">
          <button
            onClick={() => window.open('/public', '_blank')}
            className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2 transition-colors"
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Link Público
          </button>
          <button
            onClick={handlePrint}
            className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 transition-colors shadow-sm"
          >
            <Printer className="h-4 w-4 mr-2" />
            Imprimir Lista
          </button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 print:hidden">
        <div className="relative flex-[2]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            placeholder="Pesquisar por código, descrição, cliente, lote..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background pl-9 pr-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          />
        </div>
        <div className="relative flex-[1.5] flex items-center gap-2">
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            title="Data Inicial"
          />
          <span className="text-muted-foreground text-sm">até</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            title="Data Final"
          />
        </div>
      </div>

      <div className="bg-card text-card-foreground rounded-2xl border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b">
              <tr>
                <th className="px-6 py-4 font-medium">Data</th>
                <th className="px-6 py-4 font-medium">Cliente</th>
                <th className="px-6 py-4 font-medium">Código</th>
                <th className="px-6 py-4 font-medium">Descrição</th>
                <th className="px-6 py-4 font-medium">Marca</th>
                <th className="px-6 py-4 font-medium">Condição</th>
                <th className="px-6 py-4 font-medium text-center">Qtd</th>
                <th className="px-6 py-4 font-medium text-center print:hidden">Mídia</th>
                <th className="px-6 py-4 font-medium text-right print:hidden">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-muted-foreground">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                    Carregando dados...
                  </td>
                </tr>
              ) : filteredDiscards.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-muted-foreground">
                    Nenhum registro encontrado.
                  </td>
                </tr>
              ) : (
                filteredDiscards.map((discard) => (
                  <tr key={discard.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      {format(new Date(discard.date + 'T00:00:00'), 'dd/MM/yyyy')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-muted-foreground">
                      {discard.customer_name || '-'}
                    </td>
                    <td className="px-6 py-4 font-medium whitespace-nowrap">
                      {discard.product_code}
                    </td>
                    <td className="px-6 py-4 min-w-[200px]">
                      {discard.product_description}
                      {discard.lot && <p className="text-xs text-muted-foreground mt-1">Lote: {discard.lot}</p>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full font-medium bg-primary/10 text-primary text-xs">
                        {discard.brand}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {discard.condition}
                    </td>
                    <td className="px-6 py-4 text-center font-medium">
                      {discard.quantity}
                    </td>
                    <td className="px-6 py-4 text-center print:hidden">
                      <div className="flex items-center justify-center gap-1">
                        {discard.media_urls?.length ? (
                          <button 
                            onClick={() => setSelectedMediaSrc(discard.media_urls![0])}
                            className="inline-flex items-center justify-center bg-primary/10 text-primary hover:bg-primary/20 h-7 px-2 rounded-md text-xs font-medium border border-primary/20 transition-colors"
                          >
                            {discard.media_urls.length} {discard.media_urls.length === 1 ? 'file' : 'files'}
                          </button>
                        ) : (
                          <span className="text-muted-foreground text-xs">-</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right print:hidden space-x-2">
                      <Link
                        to={`/edit/${discard.id}`}
                        className="inline-flex items-center justify-center p-2 rounded-md text-primary hover:bg-primary/10 transition-colors"
                        title="Editar Registro"
                      >
                        <Edit className="h-4 w-4" />
                      </Link>
                      <button
                        onClick={() => handleDelete(discard.id, discard.media_urls)}
                        className="inline-flex items-center justify-center p-2 rounded-md text-destructive hover:bg-destructive/10 transition-colors"
                        title="Apagar Registro"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print\\:hidden {
            display: none !important;
          }
          main, main * {
            visibility: visible;
          }
          main {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
        }
      `}</style>

      {/* Lightbox / Modal for Media */}
      {selectedMediaSrc && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 animate-in fade-in duration-200">
          <button 
            onClick={() => setSelectedMediaSrc(null)}
            className="absolute top-4 right-4 p-2 bg-black/50 hover:bg-black text-white rounded-full transition-colors z-[110]"
          >
            <X className="h-6 w-6" />
          </button>
          
          <div className="relative max-w-4xl max-h-[90vh] w-full flex justify-center items-center">
             {isVideo(selectedMediaSrc) ? (
               <video src={selectedMediaSrc} controls autoPlay className="max-w-full max-h-[90vh] rounded-lg shadow-2xl" />
             ) : (
               <img src={selectedMediaSrc} alt="Evidência ampliada" className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl" />
             )}
          </div>
        </div>
      )}
    </div>
  )
}
